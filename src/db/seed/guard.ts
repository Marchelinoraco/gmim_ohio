/**
 * Pagar `pnpm db:seed`.
 *
 * Satu database melayani pengembangan DAN situs live (Neon branch `dev` — lihat
 * `docs/dev/rencana-2b-handoff.md` §6), jadi seed yang salah jalan menimpa data
 * jemaat sungguhan. Begitu dashboard admin ada, `db:seed` tidak boleh lagi
 * dijalankan tanpa keputusan sadar.
 *
 * Pemeriksaannya sengaja kasar — kosong atau tidak. Alternatif yang lebih pintar
 * (menandai baris "pernah disunting" lewat `updatedAt` != `createdAt`) bergantung
 * pada tiap mutasi disiplin menyetel `updatedAt`, dan Drizzle tidak melakukannya
 * sendiri; satu mutasi yang lupa akan membuat pagar diam-diam berhenti menjaga.
 * "Kosong atau tidak" tidak punya mode gagal seperti itu.
 */
export type ContentCounts = Record<string, number>

export function assertSeedAllowed(counts: ContentCounts, allowNonEmpty: boolean): void {
  if (allowNonEmpty) return

  const berisi = Object.entries(counts).filter(([, n]) => n > 0)
  if (berisi.length === 0) return

  const rincian = berisi.map(([tabel, n]) => `  - ${tabel} (${n})`).join('\n')
  throw new Error(
    `Tabel konten sudah berisi data:\n${rincian}\n\n` +
      `Seed dihentikan supaya tidak menimpa isi yang mungkin dikelola pengurus lewat ` +
      `dashboard. Database ini juga melayani situs live.\n\n` +
      `Kalau memang disengaja, jalankan ulang dengan:\n` +
      `  SEED_ALLOW_NON_EMPTY=1 pnpm db:seed`,
  )
}
