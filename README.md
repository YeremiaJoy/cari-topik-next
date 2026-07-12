# CariTopik (Next.js)

Migrasi `cari-topik-frontend` (Vite SPA) ke Next.js App Router. Semua logika
bisnis kini lewat **API routes** (`src/app/api/*`); klien tidak lagi query
Supabase langsung — hanya alur auth (OAuth Google) yang memakai klien browser.

## Arsitektur

- **Auth** — Supabase Auth (Google, PKCE) via `@supabase/ssr`; sesi disimpan di
  cookie, di-refresh middleware (`src/middleware.ts`), ditukar di
  `/auth/callback`. API route membaca sesi dari cookie per-request
  (`src/server/supabase.ts`).
- **API routes** — kontrak di `docs/API_SPEC.md` repo lama, base `/api`:
  - `GET/DELETE /api/me`, `POST /api/me/upgrade`
  - `GET/POST /api/rooms`, `GET/DELETE /api/rooms/:id`,
    `POST /api/rooms/:id/{advance,end}`, `POST /api/rooms/:id/favorites/:questionId`
  - `GET /api/questions` (login), `GET /api/config`, `GET /api/announcement` (publik)
  - `GET /api/admin/{stats,analytics,users,questions,config,announcement}` + mutasinya
  - Error: `{ statusCode, code, message, resetAt? }`; kuota → **402** `paywall:*`.
- **Komposisi deck** pindah ke server (`POST /api/rooms` → `src/lib/deck.ts`);
  kuota free tetap ditegakkan RPC Postgres (SECURITY DEFINER) seperti sebelumnya.
- **Klien** — `src/services/http/*` mengimplementasikan interface lama
  (`AuthService`, `RoomService`, `AdminService`, config store); halaman tidak berubah
  kontraknya. Paywall 402 dipetakan kembali ke `PaywallError`.
- **DB** — folder `supabase/` (schema, seed, RPC) disalin apa adanya; project
  Supabase yang sama tetap dipakai (`yarn db:link && yarn db:push`).

## Setup

```bash
yarn
cp .env.example .env.local   # isi URL + publishable key Supabase
yarn dev
```

Redirect URL OAuth di Supabase perlu ditambah: `http://localhost:3000/auth/callback`
(dan domain produksi `/auth/callback`).

## Catatan migrasi

- `react-router-dom` → App Router (`Link href`, `useRouter`, `useParams`,
  `NavLink` custom di `src/components/NavLink.tsx`).
- Font Google via `next/font` (Fraunces + Plus Jakarta Sans), bukan `<link>`.
- PWA: manifest + ikon dibawa; service worker `vite-plugin-pwa` **belum**
  diganti (tambah `@serwist/next` atau sejenis bila mode offline dibutuhkan).
- Halaman lama `src/pages/*` → `src/views/*` (client components); `src/app/*`
  hanya wiring route + guard.

## Skrip

- `yarn dev` / `yarn build` / `yarn start`
- `yarn test` — vitest (deck, countdown, storage, installGate, kamus i18n)
- `yarn typecheck`
# cari-topik-next
# cari-topik-next
