import 'dotenv/config'
import { seedBulletins } from './bulletins'
import { seedCategories } from './categories'
import { seedDevotionals } from './devotionals'
import { seedGallery } from './gallery'
import { seedKolom } from './kolom'
import { seedSchedule } from './schedule'
import { seedSettings } from './settings'

/**
 * Runner `pnpm db:seed`. Idempoten — aman di-run berkali-kali. TIDAK membuat
 * admin (lihat `pnpm seed:admin`). Mengisi data referensi (kategori, kolom,
 * setting) + konten placeholder situs publik (warta, renungan, galeri —
 * Rencana 2a) + jadwal ibadah (template & ibadah — Rencana 2b).
 * `seedSchedule` dipanggil setelah `seedKolom` karena ia butuh kategori &
 * kolom sudah ada di database.
 */
async function main() {
  const categories = await seedCategories()
  const kolom = await seedKolom()
  const schedule = await seedSchedule()
  const settings = await seedSettings()
  const bulletins = await seedBulletins()
  const devotionals = await seedDevotionals()
  const gallery = await seedGallery()
  console.log(
    `Seed selesai: ${categories} kategori, ${kolom} kolom, ${schedule} ibadah, ` +
      `${settings} setting, ${bulletins} warta, ${devotionals} renungan, ${gallery} baris galeri.`,
  )
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
