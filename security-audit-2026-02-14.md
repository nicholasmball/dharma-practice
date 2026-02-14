# Security Audit Report — Buddha Balla

**Date:** 14 February 2026
**App:** buddha-balla.com (Next.js 16 + Supabase + Claude AI)

---

## Executive Summary

**Overall posture: MODERATE.** The app has solid foundations — proper auth middleware, Row Level Security on all tables, no XSS vectors, and safe database queries. However, two critical gaps were found that need immediate attention, especially before any public promotion.

---

## CRITICAL Findings (Fixed)

### 1. No Rate Limiting on AI Teacher Chat API
**File:** `src/app/api/chat/route.ts`

**What was wrong:** Any authenticated user could make unlimited calls to the Claude API endpoint. There was no check on how many requests a user sent, no validation of message size, and internal error details were leaked to the client.

**Why it matters:** Someone could burn through your Anthropic credits in hours — potentially costing hundreds or thousands of dollars. Malformed requests could also crash the endpoint.

**What was fixed:**
- Added rate limiting: max 10 requests per minute per user (returns a friendly "too quickly" message if exceeded)
- Added input validation: checks message array structure, role values (must be "user" or "assistant"), content length (max 10,000 characters), and array size (max 50 messages)
- Error messages are now generic to the client ("The teacher is unavailable right now") — full details are only logged server-side
- Auto-cleanup of rate limit entries every 5 minutes to prevent memory leaks

### 2. API Keys Exposed on VibeCodes Board
**Task:** "API Key details" in the Done column

**What was wrong:** The task description contained actual Anthropic, Supabase, and Resend API keys in plain text. Anyone with access to the board could see them.

**What was fixed:**
- Redacted the task description entirely
- Updated the title to flag that keys need rotation

**What you still need to do:**
1. **Rotate your Anthropic API key** — go to dashboard.anthropic.com, API Keys section, regenerate
2. **Rotate your Supabase service role key** — go to Supabase dashboard, Settings > API, regenerate the service_role key (the anon key is public by design, so that's fine)
3. **Rotate your Resend API key** — go to resend.com, API Keys, regenerate
4. **Update `.env.local`** with the new keys
5. **Update Vercel environment variables** with the new keys (Vercel dashboard > Settings > Environment Variables)
6. **Redeploy** after updating Vercel env vars

---

## HIGH Findings (Fixed)

### 3. No Rate Limiting on Password Reset
**File:** `src/app/(auth)/actions.ts`

**What was wrong:** Anyone could send unlimited password reset emails for any email address — enabling email flooding attacks and account enumeration (confirming which emails have accounts).

**What was fixed:**
- Added rate limiting: max 5 requests per 15 minutes per email address
- The response now always says "If an account exists with this email, you'll receive a reset link" — regardless of whether the email exists. This prevents attackers from discovering which emails are registered.

### 4. Internal Error Messages Leaked to Client
**File:** `src/app/api/chat/route.ts`

**What was wrong:** The catch block returned `error.message` directly to the browser. This could expose Anthropic API error details, rate limit info, or server configuration.

**What was fixed:** Client now gets a generic message. The actual error is logged server-side only using `console.error` with just the message string (not the full error object).

### 5. No Input Validation on Chat Messages
**File:** `src/app/api/chat/route.ts`

**What was wrong:** The request body was parsed without any validation. A malicious user could send a messages array with thousands of entries, invalid roles, or massive content strings.

**What was fixed:** Added a `validateMessages()` function that checks:
- Messages is an array
- Length is between 1 and 50
- Each message has a valid `role` ("user" or "assistant") and `content` (string, 1-10,000 chars)
- Returns 400 Bad Request if validation fails

---

## Passed (No Issues Found)

| Area | Status | Notes |
|------|--------|-------|
| **XSS Prevention** | PASS | No `dangerouslySetInnerHTML` with user content. All user text rendered as plain text. |
| **SQL Injection** | PASS | All queries use Supabase query builder (parameterised). No raw SQL anywhere. |
| **CSRF Protection** | PASS | All mutations use Next.js Server Actions which have built-in CSRF tokens. |
| **Route Protection** | PASS | Middleware correctly protects all app routes and redirects unauthenticated users. |
| **Account Deletion** | PASS | Properly checks authenticated user, uses admin client for auth deletion, signs out after. |
| **Data Export** | PASS | Only returns data filtered by the authenticated user's ID. |
| **Environment Variables** | PASS | Service role key is server-only. Only public-safe values use `NEXT_PUBLIC_` prefix. |
| **Row Level Security** | PASS | All tables have RLS enabled. Code also filters by `user_id` as a belt-and-braces approach. |

---

## Remaining Recommendations (All Fixed)

All recommendations have been implemented:

| # | Item | Severity | Status |
|---|------|----------|--------|
| 1 | Add rate limiting to login/signup attempts | Medium | FIXED — 5 per 15 min per email in `actions.ts` |
| 2 | Add Content Security Policy headers | Medium | FIXED — CSP + X-Frame-Options + others in `middleware.ts` |
| 3 | Wrap `createAdminClient()` with ownership checks | Low | FIXED — Now private, exposed via `deleteUserAccount()` wrapper |
| 4 | Verify RLS policies periodically | Low | Manual — Add to a monthly checklist |

---

## Files Changed in This Audit

| File | Changes |
|------|---------|
| `src/app/api/chat/route.ts` | Rate limiting, input validation, safe error handling |
| `src/app/(auth)/actions.ts` | Login/signup/password-reset rate limiting, anti-enumeration |
| `src/app/(auth)/forgot-password/page.tsx` | Updated to handle new response format |
| `src/middleware.ts` | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| `src/lib/supabase/server.ts` | Admin client now private, exposed via safe `deleteUserAccount()` wrapper |
| `src/app/(app)/settings/actions.ts` | Updated to use `deleteUserAccount()` instead of raw admin client |

---

## Action Checklist

- [ ] Test all changes locally with `npm run dev`
- [ ] Test the teacher chat works normally
- [ ] Test login/signup still work
- [ ] Test forgot password flow
- [ ] **Rotate Anthropic API key**
- [ ] **Rotate Supabase service role key**
- [ ] **Rotate Resend API key**
- [ ] Update `.env.local` with new keys
- [ ] Update Vercel environment variables
- [ ] Deploy
