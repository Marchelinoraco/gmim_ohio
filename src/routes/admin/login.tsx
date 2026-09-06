import { createFileRoute } from '@tanstack/react-router'
import * as m from '@/paraglide/messages'
import { LoginForm } from '@/components/admin/login-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * `/admin/login` — SENGAJA di luar pathless layout `admin._app.tsx`.
 *
 * Layout itu memasang `ensureAdmin()` di `beforeLoad`, yang me-redirect ke
 * halaman ini saat tak ada sesi. Kalau halaman ini ikut berada di bawahnya,
 * redirect-nya menunjuk ke dirinya sendiri dan jadi loop tak berujung.
 */
export const Route = createFileRoute('/admin/login')({
  head: () => ({ meta: [{ title: 'Masuk Dashboard — GMIM Musafir' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
})

function LoginPage() {
  return (
    <main className="bg-surface-2 flex min-h-svh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{m.admin_login_title()}</CardTitle>
          <p className="text-muted text-sm">{m.admin_login_subtitle()}</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
