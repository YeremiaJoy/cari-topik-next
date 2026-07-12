# CariTopik (Next.js)

Migrasi `cari-topik-frontend` (Vite SPA) ke Next.js App Router. Semua logika
bisnis kini lewat **API routes** (`src/app/api/*`). Data sepenuhnya di Neon;
auth memakai Google sign-in (`@react-oauth/google`) + sesi milik aplikasi.

## Arsitektur

- **Auth** — Google sign-in di browser via `@react-oauth/google`
  (`useGoogleLogin`, implicit flow → access token). `POST /api/auth/google`
  memverifikasi token ke endpoint userinfo Google, sinkron profil ke Neon
  (`syncAuthProfile`, cocokkan `google_sub` lalu email), lalu menandatangani
  JWT sesi (`jose`) dan menaruhnya di cookie httpOnly. `requireUser`
  (`src/server/auth.ts`) memverifikasi cookie tiap request; `POST /api/auth/logout`
  menghapusnya. Tidak ada middleware/proxy — API route menjaga aksesnya sendiri.
- **API routes** — kontrak di `docs/API_SPEC.md` repo lama, base `/api`:
  - `GET/DELETE /api/me`, `POST /api/me/upgrade`
  - `GET/POST /api/rooms`, `GET/DELETE /api/rooms/:id`,
    `POST /api/rooms/:id/{advance,end}`, `POST /api/rooms/:id/favorites/:questionId`
  - `GET /api/questions` (login), `GET /api/config`, `GET /api/announcement` (publik)
  - `GET /api/admin/{stats,analytics,users,questions,config,announcement}` + mutasinya
  - Error: `{ statusCode, code, message, resetAt? }`; kuota → **402** `paywall:*`.
- **Komposisi deck** pindah ke server (`POST /api/rooms` → `src/lib/deck.ts`);
  kuota free ditegakkan transaksi Drizzle di API route.
- **Klien** — `src/services/http/*` mengimplementasikan interface lama
  (`AuthService`, `RoomService`, `AdminService`, config store); halaman tidak berubah
  kontraknya. Paywall 402 dipetakan kembali ke `PaywallError`.
- **DB** — data aplikasi memakai Neon Postgres + Drizzle ORM. Schema Drizzle
  ada di `src/server/db/schema.ts`; migration keluar ke folder `drizzle/`; seed
  bank pertanyaan dari `drizzle/seed/questions.sql`.

## Setup

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL, NEXT_PUBLIC_GOOGLE_CLIENT_ID, SESSION_SECRET
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

`SESSION_SECRET` — buat dengan
`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
Di Google Cloud Console, tambahkan origin JavaScript resmi (mis.
`http://localhost:3000`) pada OAuth Client ID; implicit flow tidak butuh redirect URI.

## Catatan migrasi

- `react-router-dom` → App Router (`Link href`, `useRouter`, `useParams`,
  `NavLink` custom di `src/components/NavLink.tsx`).
- Font Google via `next/font` (Fraunces + Plus Jakarta Sans), bukan `<link>`.
- PWA: manifest + ikon dibawa; service worker `vite-plugin-pwa` **belum**
  diganti (tambah `@serwist/next` atau sejenis bila mode offline dibutuhkan).
- Halaman lama `src/pages/*` → `src/views/*` (client components); `src/app/*`
  hanya wiring route + guard.

## Skrip

- `npm run dev` / `npm run build` / `npm run start`
- `npm run test` — vitest (deck, countdown, storage, installGate, kamus i18n)
- `npm run typecheck`
- `npm run db:generate` / `npm run db:migrate` / `npm run db:seed`
# cari-topik-next
# cari-topik-next
