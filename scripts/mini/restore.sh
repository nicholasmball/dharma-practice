#!/usr/bin/env bash
# Repeatable restore of the meditation app DB into the mini's `dharma` database.
# Usage: restore.sh <public_dump.sql> <auth_users.csv>
# Idempotent: fully resets the dharma app schemas each run (safe — dharma holds
# only this app's data). NEVER touches the favourites database.
set -euo pipefail
export PATH=/opt/homebrew/bin:$PATH
DUMP="${1:?dump path}"; AUTHCSV="${2:?auth users csv path}"
DB=dharma
PG="psql -v ON_ERROR_STOP=1 -p 5432"
PGD="$PG -d $DB"

echo "[restore] stub roles the Supabase dump grants to"
$PG -d postgres -q <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='postgres') THEN CREATE ROLE postgres NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $$;
SQL

echo "[restore] reset dharma app schemas + auth shim"
$PGD -q <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS auth CASCADE;
DROP SCHEMA IF EXISTS extensions CASCADE;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE SCHEMA auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$fn$;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  provider text
);
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;
SQL

echo "[restore] seed auth.users from CSV"
$PGD -q -c "\copy auth.users(id,email,created_at,last_sign_in_at,provider) FROM '$AUTHCSV' WITH (FORMAT csv, HEADER true)"

echo "[restore] load app dump (tables, data, FKs, RLS, policies, grants)"
$PGD -q -f "$DUMP"

echo "[restore] add pgcrypto (parity) + reload PostgREST schema cache"
$PGD -q -c "CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;"
launchctl kickstart -k "gui/$(id -u)/com.dharma.postgrest" 2>/dev/null || true

echo "[verify] counts / RLS / policies"
$PGD -tAF= -c "select 'meditation_sessions', count(*) from public.meditation_sessions
 union all select 'teacher_conversations', count(*) from public.teacher_conversations
 union all select 'journal_entries', count(*) from public.journal_entries
 union all select 'user_settings', count(*) from public.user_settings
 union all select 'auth_users', count(*) from auth.users
 union all select 'rls_policies', (select count(*) from pg_policies where schemaname='public')
 union all select 'rls_enabled_tables', (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity)
 order by 1;"
echo "[restore] complete"
