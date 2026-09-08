import { type FormEvent, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { signIn } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Form masuk dashboard — komponen KLIEN. Memakai `@/lib/auth-client`, bukan
 * `@/lib/auth` (server-only).
 *
 * Pola state-nya mengikuti `contact-form.tsx`: `useState` + `useId`, tanpa form
 * library. Pesan galat sengaja SAMA untuk email salah dan kata sandi salah —
 * membedakannya memberi tahu penebak bahwa sebuah email terdaftar.
 */
export function LoginForm() {
  const baseId = useId()
  const emailId = `${baseId}-email`
  const passwordId = `${baseId}-password`
  const errorId = `${baseId}-error`

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // `disabled` memblok klik tapi bukan submit lewat Enter.
    if (sending) return
    setSending(true)
    setFailed(false)
    const { error } = await signIn.email({ email, password })
    if (error) {
      setFailed(true)
      setSending(false)
      return
    }
    // Navigasi full-page ke /admin: menjamin permintaan berikutnya ke server
    // membawa cookie sesi yang baru dibuat. Client-side navigation tidak dapat
    // menjamin itu, karena cookie dapat disimpan SETELAH navigation dimulai.
    // Di Task 7, gerbang `beforeLoad` layout admin membutuhkan sesi ini untuk
    // melihat bahwa pengguna sudah masuk. Full-page navigation ke server baru
    // memastikan semuanya sinkron.
    window.location.href = '/admin'
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={emailId}>{m.admin_login_email()}</Label>
        <Input
          id={emailId}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>{m.admin_login_password()}</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <p
        id={errorId}
        role="status"
        aria-live="polite"
        className="text-destructive min-h-5 text-sm"
      >
        {failed ? m.admin_login_error() : ''}
      </p>

      <Button type="submit" variant="primary" className="h-11 w-full" disabled={sending} aria-describedby={errorId}>
        {sending ? m.admin_login_submitting() : m.admin_login_submit()}
      </Button>
    </form>
  )
}
