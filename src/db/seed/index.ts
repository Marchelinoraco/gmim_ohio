import 'dotenv/config'
import { seedCategories } from './categories'
import { seedKolom } from './kolom'
import { seedSettings } from './settings'

/**
 * Runner `pnpm db:seed`. Idempoten — aman di-run berkali-kali. TIDAK membuat
 * admin (lihat `pnpm seed:admin`) dan tidak mengisi konten/jadwal (Rencana 2/3).
 */
async function main() {
  const categories = await seedCategories()
  const kolom = await seedKolom()
  const settings = await seedSettings()
  console.log(`Seed selesai: ${categories} kategori, ${kolom} kolom, ${settings} setting.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
