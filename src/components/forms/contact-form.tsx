import { type FormEvent, useId, useState } from 'react'
import * as m from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { submitContactMessage } from '@/features/contact/submit'

/**
 * `<ContactForm>` — komponen KLIEN untuk form kontak di halaman `/kunjungi`
 * (dirender oleh Task 12; komponen ini TIDAK membuat route).
 *
 * Mengirim ke server fn `submitContactMessage`. State lokal `status` menggerakkan
 * tombol (disabled saat `sending`) dan wilayah pesan `role="status"`
 * `aria-live="polite"` supaya pembaca layar mengumumkan sukses/gagal.
 * `errorKey` memisahkan "kena rate-limit" dari galat umum.
 *
 * SSR-safe: tak ada akses `window`/`document` di scope modul maupun saat render —
 * hanya di dalam handler submit. Semua `id` dari `useId()` supaya label ⇄ input
 * tetap terikat dan stabil melewati hidrasi.
 *
 * Honeypot: field `website` disembunyikan dari manusia (`hidden`, `tabIndex=-1`,
 * `aria-hidden`) tapi terlihat oleh bot naif yang mengisi semua field. Server fn
 * yang memutuskan diam-diam (`{ ok: true }` tanpa simpan) bila terisi.
 */

type Status = 'idle' | 'sending' | 'success' | 'error'
type ErrorKey = 'generic' | 'rate_limited'

const inputClass =
  'border-border bg-surface text-ink focus-visible:ring-secondary w-full rounded border px-3 py-2 outline-none focus-visible:ring-2'

export function ContactForm() {
  const baseId = useId()
  const nameId = `${baseId}-name`
  const emailId = `${baseId}-email`
  const phoneId = `${baseId}-phone`
  const phoneHintId = `${baseId}-phone-hint`
  const messageId = `${baseId}-message`
  const statusId = `${baseId}-status`

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<Status>('idle')
  const [errorKey, setErrorKey] = useState<ErrorKey>('generic')

  const sending = status === 'sending'

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('sending')
    try {
      await submitContactMessage({ data: { name, email, phone, message, website } })
      setStatus('success')
      setName('')
      setEmail('')
      setPhone('')
      setMessage('')
      setWebsite('')
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err)
      setErrorKey(text.includes('RATE_LIMITED') ? 'rate_limited' : 'generic')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <h2 className="text-ink text-xl font-semibold">{m.contact_heading()}</h2>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-ink text-sm font-medium">
          {m.contact_name_label()}{' '}
          <span className="text-muted font-normal">({m.contact_required_hint()})</span>
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          aria-required="true"
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={emailId} className="text-ink text-sm font-medium">
          {m.contact_email_label()}{' '}
          <span className="text-muted font-normal">({m.contact_required_hint()})</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-required="true"
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={phoneId} className="text-ink text-sm font-medium">
          {m.contact_phone_label()}{' '}
          <span className="text-muted font-normal">({m.contact_phone_hint()})</span>
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-describedby={phoneHintId}
          autoComplete="tel"
          className={inputClass}
        />
        <p id={phoneHintId} className="text-muted text-xs">
          {m.contact_phone_hint()}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={messageId} className="text-ink text-sm font-medium">
          {m.contact_message_label()}{' '}
          <span className="text-muted font-normal">({m.contact_required_hint()})</span>
        </label>
        <textarea
          id={messageId}
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          aria-required="true"
          rows={5}
          className={`${inputClass} resize-y`}
        />
      </div>

      {/* Honeypot — disembunyikan dari manusia, diisi oleh bot naif. */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div>
        <Button type="submit" disabled={sending} aria-disabled={sending}>
          {sending ? m.contact_sending() : m.contact_submit()}
        </Button>
      </div>

      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={
          status === 'success' || status === 'error'
            ? 'border-border bg-surface-2 text-ink rounded border px-3 py-2 text-sm font-medium'
            : 'sr-only'
        }
      >
        {status === 'success'
          ? m.contact_success()
          : status === 'error'
            ? errorKey === 'rate_limited'
              ? m.contact_rate_limited()
              : m.contact_error()
            : ''}
      </p>
    </form>
  )
}
