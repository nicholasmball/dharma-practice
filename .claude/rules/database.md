---
paths:
  - "src/lib/types.ts"
  - "src/lib/postgrest/**"
  - "src/types/**"
  - "scripts/mini/backup-db.sh"
  - "scripts/mini/restore.sh"
---

# Database schema and schema changes (moved from CLAUDE.md)

## Database Schema

### meditation_sessions
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `started_at` (timestamp)
- `ended_at` (timestamp)
- `duration_seconds` (integer)
- `practice_type` (text) - Built-in types: shamatha, vipashyana, mahamudra, dzogchen, other. Also accepts custom types.
- `completed` (boolean)
- `notes` (text, optional)
- `created_at` (timestamp)

### journal_entries
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text, optional)
- `content` (text)
- `tags` (text array)
- `practice_type` (text, optional) - Accepts built-in or custom types
- `created_at` (timestamp)
- `updated_at` (timestamp)

### user_settings
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users, unique)
- `meditation_reminder_enabled` (boolean)
- `meditation_reminder_time` (time)
- `journal_reminder_enabled` (boolean)
- `journal_reminder_time` (time)
- `default_session_duration` (integer, seconds)
- `default_practice_type` (text)
- `custom_practice_types` (jsonb) - Array of {name, description?} objects for custom practice types
- `bell_sound` (text) - Timer bell choice
- `teacher_model` (text, nullable) - Teacher depth chosen in Settings; must be in `TEACHER_MODEL_ALLOWLIST`
- `created_at` (timestamp)
- `updated_at` (timestamp)

### teacher_conversations
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `title` (text) - First message truncated to 50 chars
- `messages` (jsonb) - Array of {role, content} objects
- `created_at` (timestamp)
- `updated_at` (timestamp)

All tables have Row Level Security (RLS) enabled - users can only access their own data.

## Database Changes

Postgres 17 runs on the mini (loopback, database `dharma`, port 5432), with PostgREST on
8097 in front of it. Local `trust` auth, so the scripts connect without a password.

Row-level security uses an `auth.uid()` shim that reads `request.jwt.claims -> sub`. The
app mints a short-lived HS256 token per request with the user's UUID as `sub` and
`role: authenticated`, signed with `POSTGREST_JWT_SECRET`.

> **There is no migrations workflow in this repo** — no migrations folder, no SQL files in
> git. Schema changes are applied by hand. This is a known gap; a migrations folder would
> be an improvement.

To change the schema, **on the mini**:

1. `psql -d dharma` and run your DDL.
2. Reload PostgREST's schema cache, or it will keep serving the old shape:
   `launchctl kickstart -k gui/$(id -u)/com.dharma.postgrest`
3. Update the Database Schema section of this file.
4. Update `src/lib/types.ts` if you added or changed fields.
5. Take a fresh backup: `scripts/mini/backup-db.sh`

**Common operations:**
```sql
-- Add a column
ALTER TABLE table_name ADD COLUMN column_name TYPE DEFAULT value;

-- Remove a constraint
ALTER TABLE table_name DROP CONSTRAINT constraint_name;

-- Check existing constraints
SELECT * FROM information_schema.table_constraints WHERE table_name = 'your_table';
```
