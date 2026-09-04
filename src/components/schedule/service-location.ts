import type { UpcomingService } from '@/features/schedule/services'

/**
 * Hasil resolusi lokasi satu ibadah — bentuk terstruktur, BUKAN string
 * terlokalisasi (pemanggil yang merender jadi teks/JSON-LD). `unknown` berarti
 * `rumah` tanpa `hostFamilyName` — TIDAK PERNAH jatuh ke gedung gereja
 * (bug nyata yang sudah dua kali muncul: Rencana 2a, lalu JSON-LD Task 9).
 *
 * Satu sumber kebenaran dipakai `<ServiceCard>`, tampilan `/jadwal/$id`, DAN
 * JSON-LD `Event` route yang sama — sebelumnya tiga salinan ternary identik
 * yang bisa menyimpang lagi kapan saja salah satu diubah sendiri-sendiri.
 */
export type ServiceLocation =
  | { kind: 'church' }
  | { kind: 'home'; hostFamilyName: string; hostAddress: string | null }
  | { kind: 'unknown' }

export function resolveServiceLocation(
  service: Pick<UpcomingService, 'locationType' | 'hostFamilyName' | 'hostAddress'>,
): ServiceLocation {
  if (service.locationType === 'gedung_gereja') return { kind: 'church' }
  if (service.hostFamilyName) {
    return {
      kind: 'home',
      hostFamilyName: service.hostFamilyName,
      hostAddress: service.hostAddress,
    }
  }
  return { kind: 'unknown' }
}
