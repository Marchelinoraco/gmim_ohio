-- Backfill `template_id` pada worship_services yang lahir dari seed Rencana 2b.
-- Seed sengaja menyetel NULL untuk menghindari bentrok index dua-kolom yang
-- lama; migrasi 0002 sudah membetulkan bentuk index itu, jadi keterhubungan
-- template -> ibadah kini bisa dipulihkan.
--
-- Kunci pencocokan bertiga: category_id + day_of_week + start_time. Bertiga
-- karena `ibadah_jemaat` dan `sekolah_minggu` sama-sama Minggu 10:00 — hanya
-- kategorinya yang membedakan.
--
-- Diverifikasi sebelum ditulis: 6 template tanpa duplikat pada kunci itu, dan
-- 0 dari 72 baris tanpa template yang cocok. Jadi pemetaan ini deterministik.
UPDATE "worship_services" s
SET "template_id" = t."id"
FROM "schedule_templates" t
WHERE s."template_id" IS NULL
  AND t."category_id" = s."category_id"
  AND t."day_of_week" = EXTRACT(DOW FROM s."service_date")::int
  AND t."start_time" = s."start_time";
