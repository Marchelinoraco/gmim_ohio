/**
 * `groupByKolom` — kelompokkan array ibadah per baris `kolomList` (Task 11,
 * `/pelayanan/kolom`). Beda dengan `groupByDate` (`month-calendar.tsx`): satu
 * grup dihasilkan untuk SETIAP baris `kolomList`, TERMASUK kolom yang belum
 * punya ibadah sama sekali (`services: []`) — supaya pemanggil bisa merender
 * `<SectionTitle as="h3">` + `<EmptyState>` per kolom, bukan diam-diam
 * menghilangkan kolom yang kosong dari daftar.
 *
 * Pencocokan lewat `kolom.id` — BUKAN `kolom.name`. `kolom.name` di schema
 * (`src/db/schema/worship.ts`) TIDAK punya unique constraint, jadi
 * mengelompokkan by nama string rapuh (dua kolom bisa kebetulan bernama sama).
 * `UpcomingService.kolom` sudah membawa `id` sejak Task 11 Step 0 persis untuk
 * ini.
 *
 * Ibadah yang `kolom`-nya `null` (bukan kategori kolom) atau menunjuk kolom
 * yang TAK ADA di `kolomList` (mis. kolom sudah dinonaktifkan — `listKolom()`
 * hanya mengembalikan kolom aktif) sengaja diabaikan — tak masuk grup manapun.
 *
 * Urutan grup mengikuti urutan `kolomList` (sudah terurut `number` oleh
 * `listKolom()`), BUKAN urutan kemunculan di `services`.
 *
 * Generik atas `T`/`K`, pola sama dengan `groupByDate`: modul ini sengaja tak
 * bergantung pada tipe `UpcomingService`/`Kolom` dari lapisan fitur, hanya
 * bentuk minimal yang disentuh.
 */
type HasKolomId = { kolom: { id: string } | null }
type KolomRow = { id: string }

export function groupByKolom<T extends HasKolomId, K extends KolomRow>(
  services: T[],
  kolomList: K[],
): Array<{ kolom: K; services: T[] }> {
  return kolomList.map((kolom) => ({
    kolom,
    services: services.filter((s) => s.kolom?.id === kolom.id),
  }))
}
