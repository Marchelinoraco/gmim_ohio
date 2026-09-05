import { describe, it, expect } from 'vitest'
import { resolveServiceLocation } from '@/components/schedule/service-location'

/**
 * `resolveServiceLocation` adalah SATU-SATUNYA tempat lokasi ibadah diputuskan
 * (dipakai `<ServiceCard>`, tampilan `/jadwal/$id`, dan JSON-LD `Event` route
 * yang sama). Invarian yang dijaganya — "`rumah` tanpa `hostFamilyName` TIDAK
 * PERNAH jatuh ke nama/alamat gereja" — sudah gagal tiga kali sepanjang rencana
 * ini sebelum akhirnya disentralisasi, jadi ia berhak punya test sendiri.
 *
 * Bentuk input sengaja minimal (`Pick<…>` yang sama dengan signature fn), bukan
 * baris `UpcomingService` lengkap: fn ini memang hanya menyentuh tiga field itu.
 */
type Loc = Parameters<typeof resolveServiceLocation>[0]

const svc = (over: Partial<Loc> = {}): Loc => ({
  locationType: 'rumah',
  hostFamilyName: null,
  hostAddress: null,
  ...over,
})

describe('resolveServiceLocation', () => {
  it('gedung_gereja → kind church, tanpa field lain', () => {
    expect(resolveServiceLocation(svc({ locationType: 'gedung_gereja' }))).toEqual({
      kind: 'church',
    })
  })

  it('gedung_gereja mengabaikan sisa field tuan rumah bila kebetulan terisi', () => {
    const out = resolveServiceLocation(
      svc({
        locationType: 'gedung_gereja',
        hostFamilyName: 'Kel. Contoh',
        hostAddress: '1 Jalan Contoh',
      }),
    )
    expect(out).toEqual({ kind: 'church' })
  })

  it('rumah + hostFamilyName → kind home, alamat diteruskan apa adanya', () => {
    expect(
      resolveServiceLocation(svc({ hostFamilyName: 'Kel. Contoh', hostAddress: '1 Jalan Contoh' })),
    ).toEqual({
      kind: 'home',
      hostFamilyName: 'Kel. Contoh',
      hostAddress: '1 Jalan Contoh',
    })
  })

  it('rumah + hostFamilyName tanpa alamat → kind home dengan hostAddress null', () => {
    expect(resolveServiceLocation(svc({ hostFamilyName: 'Kel. Contoh' }))).toEqual({
      kind: 'home',
      hostFamilyName: 'Kel. Contoh',
      hostAddress: null,
    })
  })

  it('rumah tanpa hostFamilyName → kind unknown (BUKAN gedung gereja)', () => {
    expect(resolveServiceLocation(svc())).toEqual({ kind: 'unknown' })
  })

  it('rumah tanpa hostFamilyName tapi beralamat → tetap kind unknown', () => {
    // Alamat tanpa tuan rumah tidak cukup untuk menyebut lokasi "diketahui":
    // pemanggil merender "Lokasi menyusul" dan TIDAK boleh mencetak alamat itu
    // (lihat `src/routes/jadwal_.$id.tsx`, yang dulu membacanya langsung dari
    // field dan menampilkan keduanya sekaligus — kontradiktif).
    expect(resolveServiceLocation(svc({ hostAddress: '1 Jalan Contoh' }))).toEqual({
      kind: 'unknown',
    })
  })

  it('hostFamilyName string kosong diperlakukan sebagai belum diisi', () => {
    expect(resolveServiceLocation(svc({ hostFamilyName: '' }))).toEqual({ kind: 'unknown' })
  })
})
