# CariTopik

Permainan kartu pertanyaan digital untuk mendorong obrolan yang lebih dalam bareng orang-orang terdekat — pasangan, teman, atau keluarga. Pilih kategori dan gaya kepribadian peserta, lalu CariTopik menyiapkan satu dek kartu pertanyaan (dari ringan ke dalam) yang bisa dibahas satu per satu dalam sebuah "room". Kartu favorit bisa disimpan, dan sesi bisa diakhiri kapan saja.

Akun Gratis dibatasi maksimal 2 peserta per room dan 5 pertanyaan per sesi. Akun Pro (berbayar via Midtrans) membuka batas tersebut tanpa batas peserta maupun pertanyaan.

Yang bisa dilakukan pengguna:

- Login pakai akun Google.
- Buat room, pilih kategori (pasangan/teman/keluarga), mode pair/group, dan kepribadian peserta (introvert/extrovert).
- Jalani sesi tanya-jawab kartu demi kartu, tandai pertanyaan favorit, dan akhiri sesi kapan saja.
- Lihat riwayat & daftar room di dashboard, hapus room yang tidak diperlukan.
- Upgrade ke akun Pro lewat pembayaran Midtrans untuk buka batas peserta, pertanyaan, dan mode group tanpa batas.
- Pasang aplikasi sebagai PWA (akun Pro).
- Ganti bahasa tampilan (Indonesia/Inggris), lihat status plan & histori pembayaran, serta hapus akun sendiri.
- Kalau punya akses admin: kelola bank pertanyaan, user, konfigurasi harga/batas plan, pengumuman, dan lihat analitik penggunaan.

## Fitur

**Onboarding & auth**
- Landing page dengan contoh kartu, penjelasan cara main, dan foto per kategori (pasangan/teman/keluarga).
- Login/register via Google OAuth sungguhan (`@react-oauth/google` + verifikasi id_token server-side). Sesi disimpan sebagai cookie signed JWT.
- Aplikasi bisa dipasang sebagai PWA (`beforeinstallprompt` / `usePwaInstall`) — install gate: belum login → diarahkan login, login tapi akun Gratis → paywall upgrade, akun Pro → boleh pasang.

**Room & sesi tanya-jawab**
- Setup room 3 langkah: pilih kategori (pasangan/teman/keluarga) → mode pair (2 peserta, masing-masing pilih kepribadian introvert/extrovert) atau group (3+ peserta, tanpa personalisasi) → mulai.
- Dek pertanyaan disusun otomatis mengikuti urutan kedalaman (ringan → sedang → dalam) dan bias kepribadian peserta.
- Sesi menampilkan satu kartu pertanyaan pada satu waktu, bisa maju ke kartu berikutnya, dan ditandai favorit.
- Sesi bisa diakhiri kapan saja; layar penutup menampilkan jumlah pertanyaan yang dibahas dan daftar kartu favorit.
- Dashboard menampilkan daftar room (aktif/selesai) dengan kategori, tanggal, dan bisa dihapus (dengan cooldown penghapusan).
- Akun Gratis: kuota pertanyaan per sesi habis → countdown "hh:mm:ss" sampai kuota terbuka lagi; batas jumlah room aktif dan peserta per room memicu modal paywall upgrade ke Pro.

**Pembayaran & langganan (Pro)**
- Halaman Pricing membandingkan fitur Gratis vs Pro (jumlah room, mode group, jumlah pertanyaan, personalisasi kepribadian, dukungan offline/PWA) dan harga (dengan potongan harga opsional).
- Upgrade ke Pro lewat Midtrans Snap (sandbox/production sesuai env); setelah checkout, halaman Profile melakukan polling status transaksi sampai `completed`/gagal/timeout.
- Webhook notification Midtrans mengupdate status transaksi & subscription; cron harian (`vercel.json`, `/api/payment/expire`) menandai transaksi pending yang kedaluwarsa dan subscription yang habis masa berlaku.

**Profil pengguna**
- Ubah bahasa (ID/EN), lihat status plan & histori pembayaran, logout, dan hapus akun (soft delete dengan konfirmasi).

**Admin panel (`/admin`)**
- **Overview**: statistik & analitik (jumlah user, room, transaksi, tren, distribusi kategori/kedalaman) lewat chart (bar, sparkline, stacked bar, trend).
- **Questions**: CRUD bank pertanyaan bilingual (ID/EN) dengan tag kategori, kedalaman, bias, dan flag khusus mode group; filter per kategori.
- **Users**: cari, lihat, dan kelola user (ubah role/plan, suspend, hapus).
- **Config**: atur parameter bisnis — batas peserta/pertanyaan/room akun Gratis, harga Pro & harga setelah diskon.
- **Announcement**: kelola pesan pengumuman bilingual yang bisa ditampilkan/disembunyikan di seluruh aplikasi (juga dipakai untuk mode maintenance).

## Stack

- **Framework**: Next.js 16 (App Router), React 19.
- **Database**: PostgreSQL (Neon serverless) lewat Drizzle ORM — schema di `src/server/db/schema.ts`, migrasi di `drizzle/`.
- **Auth**: Login Google sungguhan (`@react-oauth/google` di client, verifikasi id_token dengan `jose` di `src/app/api/auth/google/route.ts`), sesi disimpan sebagai cookie signed JWT.
- **Pembayaran**: Midtrans Snap (`midtrans-client`) untuk upgrade ke Pro — endpoint di `src/app/api/payment/*`, status transaksi/langganan disimpan di tabel `transactions` & `subscriptions`.
- **i18n**: `i18next` + `react-i18next`, locale ID/EN di `src/i18n/locales/`.
- **Styling/animasi**: Tailwind CSS v4 (tema cream/terracotta hangat), animasi dengan `motion` (Framer Motion) yang menghormati `prefers-reduced-motion`.
- **Testing**: Vitest.

## Cara Menjalankan

1. Siapkan `.env.local` (lihat `.env.example`) — minimal butuh:
   - `DATABASE_URL` / `DATABASE_MIGRATION_URL` — koneksi Neon Postgres.
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` — OAuth client ID Google.
   - `SESSION_SECRET` — random string untuk sign cookie sesi.
   - `MIDTRANS_SERVER_KEY` / `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` / `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` — kredensial Midtrans Snap.
   - `CRON_SECRET` — proteksi endpoint cron expire pembayaran.
2. Jalankan migrasi & seed database:
   ```bash
   yarn db:generate   # (opsional, kalau schema berubah)
   yarn db:migrate
   yarn db:seed
   ```
3. Jalankan dev server:
   ```bash
   yarn
   yarn dev
   ```
   Aplikasi berjalan di `http://localhost:3000`.

## Arsitektur Singkat

- **Halaman** (`src/app/*/page.tsx`, komponen di `src/views/`): landing, login, room setup, sesi room, pricing, profile, dan area admin (`/admin`) untuk kelola bank pertanyaan, user, config, dan pengumuman.
- **API routes** (`src/app/api/*/route.ts`): auth (login/logout Google), rooms (create/advance/end/favorite), questions, payment (create/status/notification webhook/expire cron), config, announcement, dan admin (analytics, stats, CRUD user/soal).
- **Service layer (client)**: `src/services/http/*` — wrapper client-side yang memanggil API routes di atas lewat `src/services/http/client.ts`. Interface bersama ada di `src/services/types.ts`.
- **Data layer (server)**: `src/server/db/` — koneksi Drizzle (`index.ts`), schema tabel (`schema.ts`: user, provider, plan, plan_benefit, role, question_category, questions, rooms, transactions, subscriptions, app_config, announcements), dan operasi query (`operations.ts`).
- **Auth & proteksi rute**: `src/context/AuthContext.tsx` membungkus status login dan expose lewat `useAuth()`. Rute yang butuh login dijaga oleh `src/components/RequireAuth.tsx`.
- **Pembayaran**: alur upgrade Pro membuat `transaction` (status `pending`), redirect ke Midtrans Snap, lalu diupdate lewat webhook notification atau di-expire otomatis oleh cron (`vercel.json`, jalan tiap tengah malam) kalau tidak dibayar.
- **Data soal**: Bank pertanyaan Bahasa Indonesia disimpan di tabel `questions` (bilingual ID/EN), ditag berdasarkan kategori (pasangan/teman/keluarga), kedalaman (ringan/sedang/dalam), dan bias kepribadian (introvert/extrovert/netral). Deck disusun mengikuti urutan kedalaman dan bias sesuai setup room (`src/lib/deck.ts`).

## Scripts

| Perintah          | Fungsi                                          |
| ------------------ | ------------------------------------------------ |
| `yarn dev`         | Menjalankan server pengembangan (Next.js)        |
| `yarn build`       | Build produksi (Next.js)                         |
| `yarn start`       | Menjalankan hasil build produksi                 |
| `yarn typecheck`   | Type-check (`tsc --noEmit`)                       |
| `yarn test`        | Menjalankan seluruh unit test (Vitest)           |
| `yarn db:generate` | Generate migrasi Drizzle dari schema             |
| `yarn db:migrate`  | Menjalankan migrasi ke database                  |
| `yarn db:seed`     | Seed data awal (plan, role, kategori, soal, dll) |
