import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { SITE_SETTINGS_KEYS, type SiteSettingsKey } from '@/features/content/site-settings'
import { getSettingsForAdmin } from '@/features/master/admin-queries'
import { updateSetting } from '@/features/master/mutations'
import {
  ContactInfoForm,
  GivingInfoForm,
  HeroForm,
  LiveStreamForm,
  PastoralContactsForm,
  ServiceTimesForm,
  SocialLinksForm,
} from '@/components/admin/setting-forms'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/_app/pengaturan/')({
  loader: () => getSettingsForAdmin(),
  component: Pengaturan,
})

type FormProps = { nilai: unknown; onSimpan: (value: unknown) => Promise<void> }

/**
 * Satu bagian per kunci `site_settings`, urutannya mengikuti
 * `SITE_SETTINGS_KEYS` supaya menambah kunci baru di sana langsung terlihat
 * di sini sebagai kesalahan tipe, bukan sebagai bagian yang diam-diam hilang.
 */
const BAGIAN: Record<
  SiteSettingsKey,
  { judul: () => string; Form: (p: FormProps) => React.ReactElement }
> = {
  hero: { judul: () => m.admin_settings_hero(), Form: HeroForm },
  service_times: { judul: () => m.admin_settings_service_times(), Form: ServiceTimesForm },
  contact_info: { judul: () => m.admin_settings_contact(), Form: ContactInfoForm },
  social_links: { judul: () => m.admin_settings_social(), Form: SocialLinksForm },
  pastoral_contacts: { judul: () => m.admin_settings_pastoral(), Form: PastoralContactsForm },
  live_stream: { judul: () => m.admin_settings_live(), Form: LiveStreamForm },
  giving_info: { judul: () => m.admin_settings_giving(), Form: GivingInfoForm },
}

function Pengaturan() {
  const settings = Route.useLoaderData()
  const router = useRouter()
  const [kabar, setKabar] = useState('')

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold">{m.admin_settings_title()}</h1>

      <p role="status" aria-live="polite" className="text-muted min-h-5 text-sm">
        {kabar}
      </p>

      {SITE_SETTINGS_KEYS.map((key) => {
        const { judul, Form } = BAGIAN[key]
        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle>{judul()}</CardTitle>
            </CardHeader>
            <CardContent>
              <Form
                nilai={settings[key]}
                onSimpan={async (value) => {
                  // Per kunci: menyimpan satu bagian tidak menyentuh enam lainnya.
                  await updateSetting({ data: { key, value } })
                  setKabar(m.admin_master_saved())
                  await router.invalidate()
                }}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
