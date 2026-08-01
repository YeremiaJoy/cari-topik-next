-- Catatan: `drizzle-kit generate` awalnya menghasilkan lebih banyak statement
-- di sini (tabel subscriptions/transactions, kolom plan.duration_days, dst),
-- karena histori snapshot Drizzle ketinggalan dari kondisi database live —
-- objek-objek tersebut sudah diterapkan di database lewat commit c76ad67
-- tanpa pernah melalui migration file. File ini sengaja dipangkas agar hanya
-- berisi perubahan yang benar-benar belum diterapkan (kolom `type` di
-- `questions`). Snapshot & journal Drizzle (`meta/0004_snapshot.json`,
-- `meta/_journal.json`) TIDAK dipangkas — biarkan tetap menggambarkan skema
-- penuh, supaya `db:generate` berikutnya tetap akurat. Jangan
-- "membetulkan" file ini dengan menjalankan generate ulang.
CREATE TYPE "public"."question_type" AS ENUM('question', 'flag');--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "type" "question_type" DEFAULT 'question' NOT NULL;
