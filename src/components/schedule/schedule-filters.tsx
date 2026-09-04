import { useId, type ChangeEvent } from 'react'
import * as m from '@/paraglide/messages'
import type { Kolom, WorshipCategory } from '@/features/schedule/taxonomy'

/**
 * State filter halaman `/jadwal`, digambarkan sebagai query string sehingga
 * bisa dibagikan/di-bookmark. `parseScheduleSearch` dipakai LANGSUNG sebagai
 * `validateSearch` route TanStack Router (Task 7) — murni, tanpa efek samping,
 * selalu mengembalikan bentuk lengkap (default bila kosong/tak dikenal, buang
 * nilai yang bukan string/format salah) supaya `search` di route selalu punya
 * tipe pasti, tak pernah `unknown`.
 *
 * `kategori`/`kolom` sengaja disingkat (bukan `categorySlug`/`kolomId` seperti
 * `ServiceFilter` di `@/features/schedule/services`) supaya URL enak dibaca
 * (`?kategori=kaum-ibu`, bukan `?categorySlug=kaum-ibu`); Task 7 yang memetakan
 * nama field satu ke field lain saat memanggil `listServices`.
 */
export type ScheduleSearch = {
  view: 'daftar' | 'kalender'
  kategori?: string
  kolom?: string
  bulan?: string
}

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)

/**
 * Memvalidasi query string mentah (`Record<string, unknown>` dari
 * `validateSearch`) menjadi `ScheduleSearch`. `view` tak dikenal atau hilang
 * jatuh ke `'daftar'`; `bulan` yang bukan `YYYY-MM` dibuang (bukan dilempar
 * error — URL ngawur tak boleh mematikan halaman); `kategori`/`kolom` non-string
 * (mis. array dari `?kategori=a&kategori=b`) dibuang jadi `undefined`.
 */
export function parseScheduleSearch(raw: Record<string, unknown>): ScheduleSearch {
  const view = raw.view === 'kalender' ? 'kalender' : 'daftar'
  const bulan = str(raw.bulan)
  return {
    view,
    kategori: str(raw.kategori),
    kolom: str(raw.kolom),
    bulan: bulan && MONTH_RE.test(bulan) ? bulan : undefined,
  }
}

const selectClass =
  'border-border bg-surface text-ink focus-visible:ring-secondary/60 focus-visible:ring-offset-surface rounded border px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

/**
 * `<ScheduleFilters>` — kontrol kategori + kolom untuk halaman `/jadwal`.
 *
 * TERKENDALI PENUH: `categories`/`kolomList` sudah dimuat pemanggil (tak ada
 * fetch di sini), `value` adalah `ScheduleSearch` yang berlaku sekarang, dan
 * setiap perubahan memanggil `onChange(next)` — komponen ini TIDAK menyentuh
 * URL/router sama sekali; Task 7 yang menuliskan `next` lewat
 * `navigate({ search })`. `view`/`bulan` di `value` diteruskan apa adanya
 * (`...value`) supaya memilih kategori/kolom tak pernah menghapus tampilan
 * kalender/bulan yang sedang aktif.
 *
 * Select kolom HANYA muncul saat kategori terpilih ber-`key === 'kolom'`
 * (satu-satunya kategori yang punya sub-filter kolom). Berpindah KELUAR dari
 * kategori kolom (baik ke "Semua" maupun kategori lain) menyertakan
 * `kolom: undefined` di `onChange` yang sama — bukan cuma menyembunyikan
 * select-nya — supaya query string tak menyisakan `kolom` basi yang mem-filter
 * ibadah tanpa UI untuk mengubahnya.
 */
export function ScheduleFilters({
  categories,
  kolomList,
  value,
  onChange,
  locale,
}: {
  categories: WorshipCategory[]
  kolomList: Kolom[]
  value: ScheduleSearch
  onChange: (next: ScheduleSearch) => void
  locale: 'id' | 'en'
}) {
  const baseId = useId()
  const categoryId = `${baseId}-kategori`
  const kolomId = `${baseId}-kolom`

  const selectedCategory = categories.find((c) => c.slug === value.kategori)
  const showKolom = selectedCategory?.key === 'kolom'

  function handleCategoryChange(e: ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value
    const next = categories.find((c) => c.slug === slug)
    onChange({
      ...value,
      kategori: str(slug),
      kolom: next?.key === 'kolom' ? value.kolom : undefined,
    })
  }

  function handleKolomChange(e: ChangeEvent<HTMLSelectElement>) {
    onChange({ ...value, kolom: str(e.target.value) })
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={categoryId} className="text-ink text-sm font-medium">
          {m.jadwal_filter_category()}
        </label>
        <select
          id={categoryId}
          value={value.kategori ?? ''}
          onChange={handleCategoryChange}
          className={selectClass}
        >
          <option value="">{m.jadwal_filter_all()}</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {locale === 'id' ? c.nameId : c.nameEn}
            </option>
          ))}
        </select>
      </div>

      {showKolom && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={kolomId} className="text-ink text-sm font-medium">
            {m.jadwal_filter_kolom()}
          </label>
          <select
            id={kolomId}
            value={value.kolom ?? ''}
            onChange={handleKolomChange}
            className={selectClass}
          >
            <option value="">{m.jadwal_filter_all()}</option>
            {kolomList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
