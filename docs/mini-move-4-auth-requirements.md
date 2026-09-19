# Mini Move 4 — Requirements: Google Sign-in via Auth.js with app-minted PostgREST token

**Status:** Requirements (approved-for-build pending the one hard blocker below)
**Owner:** Product Owner
**Workflow:** Feature Development → Requirements step
**Applies to branch work only.** The live app (Vercel + Supabase) is untouched by this move; the real cutover is a later move (Move 10).

---

## 1. Goal & Context

Today the app signs people in with Supabase's own email-and-password system. As part of moving the app off Supabase and onto the self-hosted "mini" stack, we are replacing that with **Sign in with Google**, handled by Auth.js (NextAuth).

Because the mini's database sits behind its own data gateway (PostgREST) that enforces per-user row security, a Google login is not enough on its own. After a person signs in with Google, the app must **mint (create and sign) its own access token** that the gateway trusts, stamped with that person's internal user id. That token is what lets the gateway return only that person's meditation sessions, journal entries, settings, and teacher conversations — and nothing from anyone else.

This move delivers the sign-in half of that story and the server helper that the rest of the app will lean on. The move that swaps every data call over to the new gateway is the next one (Move 5).

**Reference architecture:** the sibling "Favourites" app already runs this exact pattern (Auth.js + Google + an app-minted gateway token + an email allowlist). We are following that proven precedent, not inventing an approach. (Favourites is not in this repository, so it can't be linked here.)

---

## 2. In Scope

- Add Auth.js (NextAuth) with **only** the Google provider.
- On sign-in, restrict access to an **allowlist of email addresses** (env-configured, comma-separated).
- Map a Google account to an existing internal account **by email address**, so a returning user keeps all their history.
- **Mint a signed token for the data gateway** on each session, carrying the mapped user's UUID in the `sub` claim and `role: "authenticated"`, signed HS256 with the shared secret already on the mini.
- Add a single server helper, `getCurrentUser()`, that reads the Auth.js session and returns the signed-in user (their mapped id + email). This is the replacement other code will call in Move 5.
- **Retire the old email/password journeys** (see section 8) and their UI, including the password-reset page.
- Wire route protection (middleware) to the Auth.js session instead of the Supabase session, so protected pages still redirect signed-out visitors to login and signed-in visitors away from the login page.
- Update the local environment example/notes so a developer knows which variables to set (no real secret values committed).

## 3. Out of Scope (explicitly NOT in this move)

- Creating the Google OAuth client in Google Cloud (that is the outstanding item from Move 1) and setting production redirect URIs (Move 9). This move assumes those credentials will exist; it does not produce them.
- Switching the app's actual data reads/writes from Supabase to the mini gateway — that is **Move 5**. Callers of `auth.getUser()` elsewhere in the app are migrated there, not here.
- Any production deployment or DNS/live cutover (Move 10).
- Additional sign-in providers (Apple, email magic links, etc.).
- Self-service account creation for the public. Access is allowlist-only for now.
- Migrating the Android/PWA wrapper's auth behaviour (revisit at cutover).

---

## 4. User Stories & Acceptance Criteria

### Story 1 — Existing user signs in with Google
**As a** returning meditator whose account was created under the old email/password system,
**I want** to sign in with my Google account,
**so that** I reach my dashboard and all my past sessions, journal entries, and settings are still mine.

Acceptance criteria:
- Given my Google email matches an existing account's email, when I complete Google sign-in, then I land on `/dashboard` signed in.
- The token minted for me carries the **existing** internal user id for that email (not a new one), so my historical rows are visible.
- Signing out returns me to the public landing page and clears my session.

### Story 2 — Allowlisted person with no existing account
**As an** allowlisted person who never had an old account,
**I want** clear, predictable behaviour when I sign in with Google,
**so that** I'm not left in a broken half-signed-in state.

Acceptance criteria (decision required — see section 6 for the recommended rule):
- Given my email is on the allowlist but has no matching existing account, when I sign in, then the agreed rule in section 6 is applied consistently and I either (a) get a usable session tied to a stable id, or (b) am cleanly refused with a plain-English message — never a broken session.

### Story 3 — Non-allowlisted person is refused
**As the** app owner,
**I want** anyone whose email is not on the allowlist to be refused at sign-in,
**so that** the app stays private during the migration.

Acceptance criteria:
- Given my email is not on the allowlist, when I complete Google sign-in, then I am **not** granted a session and I see a plain-English "you don't have access" message.
- No token is minted and no protected page is reachable for a refused email.

### Story 4 — Signed-out visitor is protected
**As the** app owner,
**I want** protected pages to stay protected,
**so that** logged-out visitors can't reach app data.

Acceptance criteria:
- Given I am signed out, when I visit any protected page (`/dashboard`, `/timer`, `/journal`, `/stats`, `/teacher`, `/settings`), then I am redirected to the login page.
- Given I am signed in, when I visit the login page or the landing page, then I am redirected to `/dashboard` (preserving today's behaviour).

### Story 5 — The gateway accepts my token
**As a** signed-in user,
**I want** the app's minted token to be accepted by the data gateway,
**so that** the app can read and write my data on the mini in the next move.

Acceptance criteria:
- The minted token is HS256, signed with the mini's shared gateway secret.
- It carries `sub` = my mapped internal UUID and `role` = `authenticated`, plus a sensible expiry.
- A live call to the gateway (`http://127.0.0.1:8097`) with my token returns **only my** rows; the same call with no token / anon returns nothing.

### Story 6 — Old email/password journeys are gone
**As the** app owner,
**I want** the retired email/password screens and server actions removed,
**so that** there's no dead or confusing second way to sign in.

Acceptance criteria:
- The login page shows **Sign in with Google** and no password field.
- The signup, forgot-password, and reset-password journeys are removed (or reduced to nothing that calls Supabase password APIs).
- The retired server actions (`signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser`) no longer exist or are no longer reachable from the UI.
- The app still builds and runs (`npm run dev`) with no references to the removed pieces.

---

## 5. Auth flow (the mechanism)

```
Person clicks "Sign in with Google"
        │
        ▼
Auth.js Google provider  ──►  Google consent  ──►  back to the app
        │
        ▼
sign-in check:  is this email on AUTH_ALLOWED_EMAILS?
        │  no ──► refuse, no session, plain-English message
        │
        │  yes
        ▼
map email ──► internal user UUID  (look up the mini's auth.users seed / migration export)
        │
        ▼
Auth.js session is created, carrying that internal UUID
        │
        ▼
whenever a server call needs the gateway:
   mint an HS256 token  { sub: <internal UUID>, role: "authenticated", exp: <short-lived> }
   signed with POSTGREST_JWT_SECRET
        │
        ▼
PostgREST (127.0.0.1:8097) reads sub ──► auth.uid() shim ──► RLS returns only that user's rows
```

Key mechanical facts this must honour (established by earlier moves — do not re-derive):
- The gateway's `auth.uid()` is a shim returning the `sub` claim as a UUID. So the token **must** put the mapped UUID in `sub`.
- The token **must** include `role: "authenticated"` or RLS treats it as anonymous.
- HS256, signed with `POSTGREST_JWT_SECRET` (already generated and stored on the mini). Proven working already.

---

## 6. Email → existing-user mapping & allowlist behaviour

**Mapping rule:** match the Google account's email (lower-cased, trimmed) against the mini's seeded `auth.users` table. There are **4 existing accounts**; each maps to its existing internal user UUID.

> **The actual email → UUID mapping is PII and is intentionally NOT stored here** (this doc may be committed to a public repo). The authoritative mapping is the mini's `auth.users` table and the migration export (`migration-capture/auth_users_*.csv`, git-ignored). Do not paste real emails/ids into this doc, the public board, or committed code.

**Allowlist:** `AUTH_ALLOWED_EMAILS` (comma-separated) is the gate. Sign-in proceeds only if the email is on it.

Three cases, and the required behaviour:

1. **Allowlisted AND has an existing account** → sign in, map to the existing UUID. (Normal case — all four accounts above.)
2. **Not allowlisted** → refuse at sign-in. No session, no token, plain-English refusal.
3. **Allowlisted BUT no existing account** → this is the one genuine product decision in this move.
   - **Recommended rule (lowest risk, matches "allowlist-only, four known users" reality):** treat "on the allowlist" and "has a seeded account" as the same gate — i.e. only emails that map to a known internal id may complete sign-in; an allowlisted-but-unmapped email is refused with a message like "your account isn't set up yet." This avoids minting a token with no valid `sub` (which RLS would reject anyway) and avoids silently creating orphan accounts mid-migration.
   - If the team instead wants brand-new people to self-onboard later, that needs its own story (create an internal user row + default settings on first sign-in) and should **not** be smuggled into this move. Flagged for the "definition of done" conversation.

---

## 7. `getCurrentUser()` helper contract

A single server-side helper other code will call in place of `supabase.auth.getUser()`.

- **Location:** a server-only module (e.g. under `src/lib/`). Server components and server actions only — never shipped to the browser.
- **Reads:** the Auth.js session.
- **Returns:** the signed-in user as at least `{ id, email }`, where `id` is the **mapped internal UUID** (the same value that goes in the token's `sub`) and `email` is the signed-in email. Returns `null`/undefined when nobody is signed in.
- **Why `id` must be the mapped UUID:** roughly 25 places in the app today read `user.id` and use it as the owner key for data. In Move 5 those switch to `getCurrentUser()`, so its `id` has to be the exact UUID the data rows are keyed on — otherwise a signed-in user would see an empty app.
- **Does not** throw for a signed-out user; callers decide whether to redirect.

---

## 8. What is retired (exact files/flows)

Remove or gut so nothing calls the Supabase password APIs:

- `src/app/(auth)/actions.ts` — the actions `signInWithPassword` (used inside `login`), `signUp` (inside `signup`), `resetPasswordForEmail` (inside `resetPasswordRequest`), and `updateUser` (inside `updatePassword`). `logout` stays in spirit but is re-pointed at Auth.js sign-out.
- `src/app/(auth)/reset-password/page.tsx` — the whole page, including its `getSession()` check.
- `src/app/(auth)/forgot-password/page.tsx` — the request-a-reset page (retire alongside reset-password).
- `src/app/(auth)/signup/page.tsx` — the password signup page (allowlist-only means no public signup).
- `src/app/(auth)/login/page.tsx` — kept, but reworked to a single **Sign in with Google** button (no email/password fields).
- `src/middleware.ts` — the Supabase `getUser()` gate is replaced by the Auth.js session check (same redirect rules). Note: middleware currently also sets useful security headers and a CSP — those must be preserved, and the CSP `connect-src`/`frame-src` may need Google's domains added for the OAuth flow.

Note for the build step: `src/lib/supabase/server.ts` is **not** fully removed here — `deleteUserAccount()` and the admin client still rely on Supabase during the migration window. Only the auth-session reads move. Full removal is later.

---

## 9. Non-functional requirements

- **Secrets never in the repo.** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_ALLOWED_EMAILS`, `POSTGREST_URL`, `POSTGREST_JWT_SECRET` live only in local env / the mini's config files. The committed example file carries names and placeholder values only.
- **Token lifetime:** the minted gateway token must be **short-lived** (e.g. minutes, not days) and minted server-side per use (or per session with refresh), never exposed to the browser. It should not outlive the Auth.js session.
- **JWT secret handling:** the HS256 secret is read from env/mini config at run time only; it is never logged, never sent to the client, never placed in a URL.
- **Signing algorithm pinned to HS256** to match what the gateway verifies. Reject/avoid `alg: none`.
- **Same-origin only** for the app's own routes; keep the existing security headers (nosniff, frame-deny, referrer policy, permissions policy) and adjust CSP minimally for Google OAuth.
- **No email enumeration regressions:** refusal messages should not leak whether a specific email exists as an account beyond what the allowlist already implies.
- **Local-first:** everything must be demonstrable with `npm run dev` against the mini, with no dependency on the live Supabase auth.

---

## 10. Dependencies & Blockers

- **BLOCKER (hard):** The Google OAuth client (client id + secret) **does not exist yet.** It must be created in the owner's Google Cloud account — this is Move 1's outstanding item. Until it exists, sign-in cannot be exercised end-to-end. Everything else (allowlist logic, mapping, token minting, helper, retiring old flows, middleware) can be built and unit-checked, but the final "Google sign-in works locally" acceptance test is gated on this credential.
- **Redirect URIs:** the OAuth client's authorised redirect URIs are set in **Move 9**. The local dev callback URL must be added there before local sign-in completes.
- **Depends on Moves 2–3 (done):** the mini DB, PostgREST at `127.0.0.1:8097`, RLS policies, the `auth.uid()` shim, the seeded `auth.users` mapping table, and the working `POSTGREST_JWT_SECRET`.
- **Feeds Move 5:** `getCurrentUser()` is the contract Move 5 builds on; its return shape must be settled here.

---

## 11. Rough effort / scope estimate

Small-to-medium. One focused build session for someone comfortable with Auth.js.

- Auth.js + Google provider wiring, sign-in allowlist check, email→UUID mapping: ~half the effort.
- Token minting for the gateway + `getCurrentUser()` helper: a compact, well-defined piece (the Favourites app is a working template).
- Retiring the old pages/actions and re-pointing middleware: mostly deletion plus a login-page rework — low risk, touches several files.
- **Caveat:** the end-to-end "it actually signs in with Google" verification is blocked until the OAuth client exists, so the story cannot be marked fully Done before that credential is in hand — even though nearly all the code can be written now.

---

## 12. Definition of Done (consolidated acceptance checklist)

Expanded from the card's three headline criteria into concrete, testable items:

**Sign-in works locally (Google)**
- [ ] A **Sign in with Google** button appears on the login page; no email/password fields remain anywhere.
- [ ] Completing Google sign-in with an allowlisted, mapped email lands the user on `/dashboard`, signed in.
- [ ] Signing out returns to the landing page and clears the session.

**Allowlist & mapping behave correctly**
- [ ] A non-allowlisted email is refused: no session, no token, plain-English message.
- [ ] An allowlisted, existing email maps to its **existing** internal UUID (verified against the four seeded accounts).
- [ ] The allowlisted-but-unmapped case behaves per the agreed rule in section 6 (recommended: refuse cleanly) — never a broken/half-signed-in state.

**The gateway accepts the token**
- [ ] The minted token is HS256, signed with `POSTGREST_JWT_SECRET`, and carries `sub` = mapped UUID and `role` = `authenticated`, with a short expiry.
- [ ] A live call to `http://127.0.0.1:8097` with the token returns only that user's rows; anon/no-token returns nothing.
- [ ] The token is minted server-side and never exposed to the browser.

**Old email/password UI removed**
- [ ] `reset-password`, `forgot-password`, and `signup` password journeys are gone.
- [ ] `signInWithPassword`, `signUp`, `resetPasswordForEmail`, `updateUser` are no longer reachable.
- [ ] `login` page reworked; `logout` re-pointed to Auth.js sign-out.

**Server helper contract**
- [ ] `getCurrentUser()` exists, is server-only, reads the Auth.js session, and returns `{ id, email }` with `id` = mapped internal UUID (or null when signed out).

**Route protection preserved**
- [ ] Signed-out users hitting a protected route are redirected to login.
- [ ] Signed-in users hitting login/landing are redirected to `/dashboard`.
- [ ] Existing security headers preserved; CSP adjusted minimally for Google OAuth.

**Non-functional**
- [ ] No secrets committed; example env carries names/placeholders only.
- [ ] App builds and runs via `npm run dev` against the mini with no dead references.

**Blocker acknowledged**
- [ ] Google OAuth client creation (Move 1) and redirect URIs (Move 9) are the two external items gating the final end-to-end sign-in test; the story is not fully Done until the OAuth client exists.
