# Design: Drop Supabase, Google OAuth via @react-oauth/google

Date: 2026-07-12

## Goal

Remove all Supabase functionality. Replace Supabase Auth with client-side
Google sign-in using [`@react-oauth/google`](https://www.npmjs.com/package/@react-oauth/google),
backed by our own session. All data already lives in Neon (Drizzle); this
change touches **authentication only**, plus dropping the Supabase seed/dir.

## Context / current state

- **Data layer is already 100% Neon.** `src/server/db/operations.ts` uses
  Drizzle exclusively. There is no runtime data sync from Supabase.
- Supabase is used only for auth and one admin delete:
  - `src/lib/supabase/browser.ts` — browser OAuth sign-in / sign-out
  - `src/services/http/authService.ts` — `loginWithGoogle` / `logout`
  - `src/app/auth/callback/route.ts` — PKCE code exchange
  - `src/server/supabase.ts` — per-request server client (reads session cookie)
  - `src/server/auth.ts` — `requireUser()` reads the Supabase session
  - `src/server/supabaseAdmin.ts` — `deleteAuthUser` (service-role delete)
  - `src/proxy.ts` — Next 16 middleware refreshing the Supabase session cookie
- `users.id` is a UUID equal to the old Supabase auth user id. A Google `sub`
  is a numeric string, not a UUID.
- `src/server/db/seed.ts` reads question seed SQL from
  `supabase/migrations/20260712000002_seed_questions.sql`.

## Decisions (approved)

1. **Session** — own signed JWT in an httpOnly cookie (via `jose`), not
   per-request Google-token re-verification.
2. **Identity mapping** — add a `google_sub` column to `users`, matched on the
   Google `sub`. `users.id` stays UUID, DB-generated on first insert.
3. **Cleanup** — full Supabase removal: drop npm deps, delete Supabase source
   files, delete the `supabase/` dir, relocate the question seed SQL.
4. **Login UI** — keep the existing custom terracotta button using
   `useGoogleLogin` (implicit flow → access token).
5. **Existing users** — on first post-migration login, match `google_sub`
   first, then fall back to matching an existing row by email and backfill its
   `google_sub` (preserves plans/rooms/roles).

### Library choice

`jose` for signing/verifying our session JWT. It is edge-runtime compatible
(the previous middleware ran on edge); `google-auth-library` is node-only and
is not used.

Google identity is resolved with the **implicit flow**: `useGoogleLogin`
returns a Google **access token**; the server calls Google's userinfo endpoint
(`https://www.googleapis.com/oauth2/v3/userinfo`) with that token to obtain
`sub`, `email`, `name`, `picture`. This keeps the custom button and needs **no**
`GOOGLE_CLIENT_SECRET` (an auth-code flow would).

## Auth flow (new)

```
Browser: useGoogleLogin({ flow: 'implicit' }) → onSuccess({ access_token })
  → authService.loginWithGoogle(access_token)
  → POST /api/auth/google  { accessToken }

Server /api/auth/google:
  1. fetch userinfo with the access token → { sub, email, name, picture }
     (401 if the token is invalid)
  2. syncAuthProfile({ sub, name, email, avatarUrl }) → ProfileRow (Neon)
  3. assertActiveProfile(profile)
  4. session = signSession({ uid: profile.id })   (jose)
  5. Set-Cookie: session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=7d
  6. return toUser(profile)

requireUser():
  read "session" cookie → verifySession → getProfileView(uid)
  → assertActiveProfile → toUser.  401 if missing/invalid.

logout: POST /api/auth/logout → clear "session" cookie.
```

## Components

### New files

- `src/server/session.ts`
  - `signSession(payload: { uid: string }): Promise<string>`
  - `verifySession(token: string): Promise<{ uid: string } | null>`
  - `SESSION_COOKIE = 'session'`, cookie options helper, 7-day expiry.
  - Secret from `process.env.SESSION_SECRET`.
- `src/server/google.ts`
  - `fetchGoogleProfile(accessToken: string): Promise<{ sub; email; name; picture }>`
  - Throws `HttpError(401, 'not_authenticated', …)` on a bad token.
- `src/app/api/auth/google/route.ts` — `POST`, login endpoint above.
- `src/app/api/auth/logout/route.ts` — `POST`, clears the cookie, returns 204.

### Modified files

- `src/server/db/schema.ts` — add `google_sub: varchar('google_sub', { length: 64 })`
  to `users`, plus a unique index. Add `.defaultRandom()` to `users.id`.
- `src/server/db/operations.ts`
  - `syncAuthProfile` input becomes `{ sub, name, email, avatarUrl }` (no `id`,
    no `providerName` — provider is always `'google'`).
  - Lookup order: by `google_sub`; else by `email` (backfill `google_sub` and
    reactivate mapping); else insert a new row (DB-generated UUID) with
    `google_sub` set.
  - Drop the `requireUuid(input.id)` guard (id no longer supplied by caller).
  - `finalizeSoftDeleteUser` additionally sets `google_sub = null` so a later
    re-login creates a clean row.
- `src/server/auth.ts` — `requireUser()` rewritten to read/verify the session
  cookie instead of Supabase. `requireAdmin` unchanged.
- `src/app/api/me/route.ts` — DELETE drops `deleteAuthUser`; keeps
  `markUserDeletionProcessing` + `finalizeSoftDeleteUser`.
- `src/app/api/admin/users/[id]/route.ts` — DELETE drops `deleteAuthUser`.
- `src/services/http/authService.ts`
  - `loginWithGoogle(accessToken: string)` → `POST /api/auth/google`, returns `User`.
  - `logout()` → `POST /api/auth/logout`.
  - `deleteAccount()` → `DELETE /api/me` (no Supabase signOut).
  - remove `supabaseBrowser` import.
- `src/services/types.ts` — `AuthService.loginWithGoogle` signature takes the
  access token string.
- `src/context/AuthContext.tsx` — `login(accessToken: string)`.
- `src/views/LoginPage.tsx` — wire the custom button to
  `useGoogleLogin({ flow: 'implicit', onSuccess })`; on success call
  `login(tokenResponse.access_token)`.
- `src/app/providers.tsx` — wrap children in
  `<GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>`.
- `src/server/db/seed.ts` — read seed SQL from the new relocated path.
- `package.json` — remove `@supabase/ssr`, `@supabase/supabase-js`; add
  `jose`, `@react-oauth/google`.
- `.env.example` / `.env` — remove `NEXT_PUBLIC_SUPABASE_*`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`; add `SESSION_SECRET`.

### Deleted

- `src/lib/supabase/browser.ts` (+ `src/lib/supabase/` dir)
- `src/server/supabase.ts`
- `src/server/supabaseAdmin.ts`
- `src/app/auth/callback/route.ts` (+ `src/app/auth/` dir)
- `src/proxy.ts` (middleware; own JWT needs no per-request refresh, API routes
  gate via `requireUser`)
- `supabase/` dir — after relocating the question seed SQL to
  `drizzle/seed/questions.sql` (path referenced by `seed.ts`).

## Data flow

Login: client access token → server userinfo → Neon upsert → session cookie.
Every authed request: session cookie → `requireUser` → Neon profile. No
Supabase in any path.

## Schema migration

New Drizzle migration (`db:generate`) adding:
- `user.google_sub varchar(64)` nullable
- unique index on `user.google_sub`
- default random on `user.id` (`gen_random_uuid()`)

Existing rows keep their UUIDs; `google_sub` stays null until first login
(backfilled by email match).

## Error handling

- Bad/expired Google access token → `HttpError(401, 'not_authenticated')`.
- Missing/invalid session cookie → `requireUser` throws 401 (existing contract).
- Inactive account → `assertActiveProfile` throws 403 (unchanged).
- Missing `SESSION_SECRET` → `HttpError(500, 'config_error')` at sign time.

## Testing

- Unit: `session.ts` round-trip (sign → verify), tamper/expiry → null.
- Unit: `syncAuthProfile` lookup order — new user, google_sub hit, email
  backfill — using an in-memory/mocked Drizzle client consistent with existing
  test style.
- `fetchGoogleProfile` — mock fetch: valid token → profile, 401 → HttpError.
- Manual: real Google login end-to-end, logout, delete account, re-login
  creates fresh row.

## Out of scope

- No refresh-token / sliding-session logic (7-day fixed cookie; re-login after).
- No change to any non-auth API route or business logic.
- No change to the questions/rooms/plans data model beyond `users`.
