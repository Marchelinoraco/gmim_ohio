# Rencana 3c — Warta & Renungan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengurus bisa menulis, mengubah, menerbitkan, dan menghapus warta serta renungan sendiri lewat dashboard — dengan editor rich text yang keluarannya bersih dan tersanitasi sebelum tersimpan.

**Architecture:** Sanitasi dipindah ke titik simpan (tetap dipertahankan di titik baca sebagai lapis kedua), lalu editor Tiptap yang ekstensinya sengaja dibatasi persis ke allowlist sanitizer yang sudah ada. Di atasnya, satu file mutasi per domain dengan pola `ensureAdmin() → validasi Zod → sanitasi → tulis`.

**Tech Stack:** TanStack Start (React 19), Drizzle ORM + Postgres (Neon), Zod v4, Tiptap 3, `sanitize-html`, Tailwind CSS v4, shadcn/ui, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-07-rencana-3-admin-dashboard.md` (§Fase 3)

## Global Constraints

- **Token saja** — tanpa class `dark:`, tanpa hex literal di komponen.
- **Benar di kedua tema** — semua pasangan teks/latar ≥ WCAG AA.
- **Dwibahasa** — tiap kunci UI ada di `messages/id.json` DAN `messages/en.json`, nama kunci identik.
- `src/components/ui/**` prettier-ignored.
- **Bahasa komentar & commit: Indonesia.**
- **Gerbang hijau tiap task**: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` (baseline **219** unit), `pnpm test:e2e` (baseline **132** lulus + 4 skipped).
- **Jangan pernah menjalankan dua `pnpm test:e2e` bersamaan** — `reuseExistingServer` membuat run tumpang tindih menghasilkan kegagalan palsu. Bersihkan dengan `lsof -ti:3000` kalau ragu.
- **Tiap route admin baru**: taruh di bawah `admin._app`, panggil `ensureAdmin()` di server fn-nya, DAN tambahkan path-nya ke daftar gerbang di `tests/e2e/admin.spec.ts`.
- **`DATABASE_URL` menunjuk database yang melayani situs live.**

---

## Yang sudah ada dan dipakai ulang

Diperiksa sebelum plan disusun — plan ini tidak membangun ulang apa pun dari daftar ini:

| Aset | Keadaan |
|---|---|
| `src/lib/sanitize.ts` | `sanitizeRichText(dirty): SanitizedHtml` + tipe branded. Allowlist: `h2 h3 h4 p ul ol li strong em a br blockquote`, atribut `a` hanya `href/rel/target`, skema `http/https/mailto`, `transformTags` memaksa `rel="noopener noreferrer"` |
| Pemanggilan sanitasi saat BACA | `src/features/content/bulletins.ts` dan `devotionals.ts` sudah memanggilnya lazy |
| `bulletins` | `weekDate`, `titleId/En`, `summaryId/En`, `bodyId/En`, `pdfUrl`, `status` + check `bulletin_has_content` (`pdfUrl` **atau** `bodyId` wajib ada) |
| `devotionals` | `slug` (unique), `titleId/En`, `authorName`, `publishedDate`, `coverImageUrl`, `excerptId/En`, `bodyId/En` (keduanya NOT NULL), `status` |
| Fondasi admin | `ensureAdmin()`, layout ber-gerbang, komponen shadcn, pola form `useState` + `useId` |

**Tidak dikerjakan di sini:** upload PDF warta dan gambar sampul renungan. Keputusan itu diambil di penutup Rencana 3b — seluruh urusan unggah (PDF tata ibadah, PDF warta, sampul renungan, foto galeri) ditangani satu rencana tersendiri supaya lapisan unggahnya ditulis sekali. Sampai itu ada, `pdfUrl` dan `coverImageUrl` diisi sebagai URL teks biasa, dan constraint `bulletin_has_content` tetap terpenuhi lewat body dari editor.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `src/lib/sanitize.ts` (modify) | Tambah `ALLOWED_TAGS` yang diekspor supaya editor dan sanitizer punya satu sumber |
| `tests/unit/sanitize-simpan.test.ts` (create) | Uji sanitasi menolak yang berbahaya di titik simpan |
| `src/components/admin/rich-text-editor.tsx` (create) | Editor Tiptap + toolbar, ekstensi dibatasi ke allowlist |
| `src/features/content/admin-queries.ts` (create) | Baca warta & renungan untuk admin (termasuk draft) |
| `src/features/content/bulletin-mutations.ts` (create) | CRUD warta + skema Zod |
| `src/features/content/devotional-mutations.ts` (create) | CRUD renungan + skema Zod |
| `tests/unit/content-validation.test.ts` (create) | Uji kedua skema Zod |
| `src/components/admin/bulletin-form.tsx` (create) | Form warta |
| `src/components/admin/devotional-form.tsx` (create) | Form renungan |
| `src/routes/admin._app.warta.index.tsx` (create) | Daftar warta |
| `src/routes/admin._app.warta.baru.tsx` (create) | Buat warta |
| `src/routes/admin._app.warta.$id.tsx` (create) | Ubah warta |
| `src/routes/admin._app.renungan.index.tsx` (create) | Daftar renungan |
| `src/routes/admin._app.renungan.baru.tsx` (create) | Buat renungan |
| `src/routes/admin._app.renungan.$id.tsx` (create) | Ubah renungan |
| `tests/e2e/admin-konten.spec.ts` (create) | Alur end-to-end warta & renungan |
| `messages/{id,en}.json` (modify) | Kunci UI |

**Penamaan route:** perhatikan `.index.tsx` untuk halaman daftar. Rencana 3b menemukan ini dengan cara yang mahal: `jadwal.tsx` membuat TanStack menjadikannya PARENT bagi `jadwal.baru` dan `jadwal.$id`, dan karena ia merender daftar tanpa `<Outlet/>`, kedua halaman anak itu tidak muncul sama sekali sementara typecheck, lint, dan build semuanya hijau. Sebagai `.index`, ketiganya jadi sibling.

---

## Task 1: Satu sumber allowlist + sanitasi di titik simpan

Sanitasi saat ini hanya berjalan saat MEMBACA. Spec meminta sanitasi saat MENYIMPAN, supaya yang tersimpan di database sudah bersih.

Sanitasi saat baca **tidak dicabut**: ia melindungi baris lama yang sudah telanjur tersimpan sebelum plan ini, dan tetap jadi lapis kedua kalau suatu hari ada jalur tulis yang lupa menyanitasi.

**Files:**
- Modify: `src/lib/sanitize.ts`
- Test: `tests/unit/sanitize-simpan.test.ts`

**Interfaces:**
- Consumes: —
- Produces: `ALLOWED_TAGS: readonly string[]` diekspor dari `@/lib/sanitize`. Task 2 memakainya untuk membatasi ekstensi editor, sehingga editor dan sanitizer tidak bisa saling menyimpang.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/sanitize-simpan.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { sanitizeRichText, ALLOWED_TAGS } from '@/lib/sanitize'

/**
 * Sanitasi di titik SIMPAN. Yang diuji di sini bukan "sanitizer bekerja"
 * (`sanitize-html` sudah punya testnya sendiri), melainkan bahwa allowlist
 * proyek ini benar-benar menutup jalur yang penting, dan bahwa daftar tag yang
 * dipakai editor sama persis dengan yang diterima sanitizer.
 */
describe('sanitizeRichText di titik simpan', () => {
  it('membuang <script> beserta isinya', () => {
    const out = sanitizeRichText('<p>halo</p><script>alert(1)</script>')
    expect(out).not.toContain('script')
    expect(out).not.toContain('alert')
    expect(out).toContain('<p>halo</p>')
  })

  it('membuang handler inline seperti onclick', () => {
    const out = sanitizeRichText('<p onclick="steal()">halo</p>')
    expect(out).not.toContain('onclick')
    expect(out).toContain('halo')
  })

  it('membuang href berskema javascript:', () => {
    const out = sanitizeRichText('<a href="javascript:alert(1)">klik</a>')
    expect(out).not.toContain('javascript:')
  })

  it('mempertahankan href http/https/mailto', () => {
    expect(sanitizeRichText('<a href="https://a.test">x</a>')).toContain('https://a.test')
    expect(sanitizeRichText('<a href="mailto:a@b.test">x</a>')).toContain('mailto:a@b.test')
  })

  it('memaksa rel aman pada tautan keluar', () => {
    const out = sanitizeRichText('<a href="https://a.test">x</a>')
    expect(out).toContain('rel="noopener noreferrer"')
  })

  it('membuang tag di luar allowlist tapi menyimpan teksnya', () => {
    const out = sanitizeRichText('<marquee>penting</marquee>')
    expect(out).not.toContain('marquee')
    expect(out).toContain('penting')
  })

  it('mempertahankan seluruh tag di allowlist', () => {
    const html = '<h2>a</h2><p><strong>b</strong> <em>c</em></p><ul><li>d</li></ul><blockquote>e</blockquote>'
    const out = sanitizeRichText(html)
    for (const tag of ['h2', 'p', 'strong', 'em', 'ul', 'li', 'blockquote']) {
      expect(out).toContain(`<${tag}>`)
    }
  })

  it('string kosong dan nilai bukan-string tidak melempar', () => {
    expect(sanitizeRichText('')).toBe('')
    expect(() => sanitizeRichText(undefined as unknown as string)).not.toThrow()
  })

  // Editor dan sanitizer WAJIB memakai daftar yang sama. Kalau editor bisa
  // menghasilkan tag yang sanitizer buang, pengurus akan melihat formatnya hilang
  // setelah menyimpan — tanpa pesan galat apa pun.
  it('ALLOWED_TAGS diekspor dan memuat tag yang dipakai toolbar editor', () => {
    for (const tag of ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote']) {
      expect(ALLOWED_TAGS).toContain(tag)
    }
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/sanitize-simpan.test.ts`
Expected: FAIL pada test terakhir — `ALLOWED_TAGS` belum diekspor. Test lain kemungkinan sudah lulus, karena sanitizer-nya memang sudah benar; yang belum ada hanya ekspornya.

- [ ] **Step 3: Ekspor allowlist sebagai satu sumber**

Di `src/lib/sanitize.ts`, angkat daftar tag jadi konstanta yang diekspor, lalu pakai di `OPTIONS`:

```ts
/**
 * Tag yang boleh lolos sanitizer — dan karenanya satu-satunya tag yang boleh
 * dihasilkan editor.
 *
 * Diekspor supaya editor rich text bisa membatasi ekstensinya ke daftar yang
 * SAMA. Kalau keduanya menyimpang, pengurus akan mengetik sesuatu yang terlihat
 * benar di editor lalu melihat formatnya hilang setelah simpan, tanpa pesan
 * galat apa pun — kegagalan diam yang mahal dilacak.
 */
export const ALLOWED_TAGS = [
  'h2',
  'h3',
  'h4',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'a',
  'br',
  'blockquote',
] as const

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [...ALLOWED_TAGS],
  // sisa OPTIONS tidak berubah
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/sanitize-simpan.test.ts`
Expected: PASS (9 test).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/lib/sanitize.ts tests/unit/sanitize-simpan.test.ts
git commit -m "Ekspor ALLOWED_TAGS sebagai satu sumber untuk editor & sanitizer

Editor rich text di task berikutnya harus dibatasi ke tag yang sama persis
dengan yang diterima sanitizer. Kalau keduanya menyimpang, pengurus mengetik
sesuatu yang terlihat benar di editor lalu melihat formatnya hilang setelah
simpan, tanpa pesan galat apa pun.

Test barunya menguji allowlist proyek ini, bukan sanitize-html itu sendiri:
script, handler inline, dan href javascript: ditolak; http/https/mailto lolos
dengan rel dipaksa aman; tag di luar daftar dibuang tapi teksnya bertahan."
```

---

## Task 2: Editor rich text

**Files:**
- Modify: `package.json`
- Create: `src/components/admin/rich-text-editor.tsx`
- Modify: `messages/id.json`, `messages/en.json`

**Interfaces:**
- Consumes: `ALLOWED_TAGS` (Task 1).
- Produces: `<RichTextEditor value={string} onChange={(html: string) => void} label={string} />`

- [ ] **Step 1: Pasang Tiptap**

```bash
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-link
```

Kenapa Tiptap dan bukan `contenteditable` + `document.execCommand`: `execCommand` sudah deprecated, perilakunya berbeda antar browser, dan ia menghasilkan `<span style="...">` serta `<font>` yang justru dibuang sanitizer — pengurus akan melihat formatnya hilang setelah simpan. Tiptap menghasilkan HTML terkontrol yang bisa dicocokkan persis dengan allowlist.

- [ ] **Step 2: Tambahkan kunci pesan**

Ke `messages/id.json` (dan pasangan Inggrisnya dengan kunci identik):

```json
  "editor_bold": "Tebal",
  "editor_italic": "Miring",
  "editor_h2": "Judul",
  "editor_h3": "Subjudul",
  "editor_bullet": "Daftar berpoin",
  "editor_ordered": "Daftar bernomor",
  "editor_quote": "Kutipan",
  "editor_link": "Tautan",
  "editor_link_prompt": "Alamat tautan (http/https/mailto):",
  "editor_unlink": "Hapus tautan",
```

Inggris: "Bold", "Italic", "Heading", "Subheading", "Bullet list", "Numbered list", "Quote", "Link", "Link address (http/https/mailto):", "Remove link".

- [ ] **Step 3: Tulis komponen editor**

Buat `src/components/admin/rich-text-editor.tsx`:

```tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Unlink } from 'lucide-react'
import * as m from '@/paraglide/messages'

type Props = {
  value: string
  onChange: (html: string) => void
  label: string
}

/**
 * Editor rich text untuk body warta & renungan.
 *
 * Ekstensinya sengaja dibatasi persis ke `ALLOWED_TAGS` di `@/lib/sanitize`:
 * heading (h2/h3), paragraf, daftar, tebal, miring, kutipan, tautan. Yang tidak
 * ada di allowlist dimatikan di sini — bukan dibiarkan lalu dibuang sanitizer,
 * karena itu membuat pengurus mengetik sesuatu yang terlihat benar lalu melihat
 * formatnya hilang setelah simpan.
 *
 * Keluarannya tetap disanitasi lagi di server saat simpan. Pembatasan di sini
 * untuk pengalaman pengguna; sanitasi di server untuk keamanan.
 */
export function RichTextEditor({ value, onChange, label }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Di luar allowlist sanitizer — dimatikan supaya tak pernah bisa dibuat.
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        // h1 dipakai judul halaman; body hanya boleh mulai dari h2.
        heading: { levels: [2, 3, 4] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
    ],
    content: value,
    // SSR: Tiptap butuh DOM. `immediatelyRender: false` mencegahnya mencoba
    // merender di server dan menyebabkan mismatch hidrasi.
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'prose-admin border-border bg-surface text-ink min-h-40 w-full rounded-b border border-t-0 px-3 py-2 text-sm outline-none',
        'aria-label': label,
      },
    },
  })

  if (!editor) return null

  const tombol = [
    { aksi: () => editor.chain().focus().toggleBold().run(), aktif: editor.isActive('bold'), Icon: Bold, nama: m.editor_bold() },
    { aksi: () => editor.chain().focus().toggleItalic().run(), aktif: editor.isActive('italic'), Icon: Italic, nama: m.editor_italic() },
    { aksi: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), aktif: editor.isActive('heading', { level: 2 }), Icon: Heading2, nama: m.editor_h2() },
    { aksi: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), aktif: editor.isActive('heading', { level: 3 }), Icon: Heading3, nama: m.editor_h3() },
    { aksi: () => editor.chain().focus().toggleBulletList().run(), aktif: editor.isActive('bulletList'), Icon: List, nama: m.editor_bullet() },
    { aksi: () => editor.chain().focus().toggleOrderedList().run(), aktif: editor.isActive('orderedList'), Icon: ListOrdered, nama: m.editor_ordered() },
    { aksi: () => editor.chain().focus().toggleBlockquote().run(), aktif: editor.isActive('blockquote'), Icon: Quote, nama: m.editor_quote() },
  ]

  function pasangTautan() {
    const sebelumnya = editor?.getAttributes('link').href ?? ''
    const url = window.prompt(m.editor_link_prompt(), sebelumnya)
    if (url === null) return
    if (url === '') {
      editor?.chain().focus().unsetLink().run()
      return
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-col">
      <div
        role="toolbar"
        aria-label={label}
        className="border-border bg-surface-2 flex flex-wrap gap-0.5 rounded-t border p-1"
      >
        {tombol.map(({ aksi, aktif, Icon, nama }) => (
          <button
            key={nama}
            type="button"
            onClick={aksi}
            aria-pressed={aktif}
            aria-label={nama}
            title={nama}
            className="text-ink hover:bg-surface aria-pressed:bg-surface aria-pressed:text-primary inline-flex h-8 w-8 items-center justify-center rounded"
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        ))}
        <button
          type="button"
          onClick={pasangTautan}
          aria-pressed={editor.isActive('link')}
          aria-label={m.editor_link()}
          title={m.editor_link()}
          className="text-ink hover:bg-surface aria-pressed:bg-surface aria-pressed:text-primary inline-flex h-8 w-8 items-center justify-center rounded"
        >
          <Link2 aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label={m.editor_unlink()}
          title={m.editor_unlink()}
          className="text-ink hover:bg-surface inline-flex h-8 w-8 items-center justify-center rounded"
        >
          <Unlink aria-hidden="true" className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
```

- [ ] **Step 4: Beri gaya isi editor**

Isi editor tidak mewarisi gaya prosa halaman publik. Tambahkan di `src/styles/app.css`, di dalam `@layer components`:

```css
  /* Isi editor rich text. Cukup untuk membedakan heading, daftar, dan kutipan
     saat mengetik — bukan tiruan persis tampilan publik, karena menyamakan
     keduanya menjanjikan WYSIWYG yang tidak bisa ditepati (halaman publik punya
     lebar, latar, dan skala tipografi yang berbeda). */
  .prose-admin h2 {
    @apply font-serif text-xl font-semibold;
  }
  .prose-admin h3 {
    @apply font-serif text-lg font-semibold;
  }
  .prose-admin p {
    @apply my-2;
  }
  .prose-admin ul {
    @apply my-2 list-disc pl-5;
  }
  .prose-admin ol {
    @apply my-2 list-decimal pl-5;
  }
  .prose-admin blockquote {
    @apply border-border text-muted my-2 border-l-2 pl-3;
  }
  .prose-admin a {
    @apply text-primary underline underline-offset-2;
  }
```

- [ ] **Step 5: Verifikasi build & typecheck**

Run: `pnpm typecheck && pnpm lint && pnpm build`
Expected: hijau. Kalau Tiptap 3 mengeluh soal tipe `useEditor`, periksa API-nya di `node_modules/@tiptap/react` dan sesuaikan pemanggilan — jangan melonggarkan tipe dengan `any`.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/admin/rich-text-editor.tsx src/styles/app.css messages/
git commit -m "Tambah editor rich text untuk body warta & renungan

Ekstensi Tiptap dibatasi persis ke ALLOWED_TAGS: heading h2-h4, paragraf,
daftar, tebal, miring, kutipan, tautan. Yang di luar allowlist (code block,
strikethrough, garis horizontal) dimatikan di editor, bukan dibiarkan lalu
dibuang sanitizer — kalau dibiarkan, pengurus mengetik sesuatu yang terlihat
benar lalu melihat formatnya hilang setelah simpan.

Tiptap dipilih ketimbang contenteditable + execCommand: execCommand sudah
deprecated, perilakunya beda antar browser, dan ia menghasilkan span/font
bergaya inline yang justru dibuang sanitizer.

immediatelyRender: false karena Tiptap butuh DOM; tanpa itu ia mencoba
merender di server dan menyebabkan mismatch hidrasi."
```

---

## Task 3: Query admin untuk warta & renungan

**Files:**
- Create: `src/features/content/admin-queries.ts`

**Interfaces:**
- Consumes: `ensureAdmin`.
- Produces:
  - `listBulletinsForAdmin(): Promise<AdminBulletinRow[]>`
  - `getBulletinForAdmin(id: string): Promise<AdminBulletinDetail | null>`
  - `listDevotionalsForAdmin(): Promise<AdminDevotionalRow[]>`
  - `getDevotionalForAdmin(id: string): Promise<AdminDevotionalDetail | null>`

- [ ] **Step 1: Tulis modulnya**

Buat `src/features/content/admin-queries.ts`:

```ts
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

export type AdminBulletinRow = {
  id: string
  weekDate: string
  titleId: string
  status: 'draft' | 'published'
  punyaPdf: boolean
}

export type AdminBulletinDetail = {
  id: string
  weekDate: string
  titleId: string
  titleEn: string
  summaryId: string
  summaryEn: string
  bodyId: string | null
  bodyEn: string | null
  pdfUrl: string | null
  status: 'draft' | 'published'
}

export type AdminDevotionalRow = {
  id: string
  slug: string
  titleId: string
  authorName: string
  publishedDate: string
  status: 'draft' | 'published'
}

export type AdminDevotionalDetail = AdminDevotionalRow & {
  titleEn: string
  coverImageUrl: string | null
  excerptId: string
  excerptEn: string
  bodyId: string
  bodyEn: string
}

/**
 * Daftar warta untuk dashboard — termasuk draft, yang tidak pernah dikembalikan
 * `listBulletins` publik.
 *
 * Body sengaja TIDAK diambil di sini: ia bisa panjang, dan daftar hanya
 * memerlukan judul serta status. `punyaPdf` cukup sebagai penanda tanpa
 * menarik URL-nya.
 *
 * `ensureAdmin()` dipanggil di server fn, bukan hanya di route: route yang
 * dijaga tidak menghalangi pemanggilan langsung lewat HTTP.
 */
export const listBulletinsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminBulletinRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const rows = await db.query.bulletins.findMany({
      orderBy: (b, { desc }) => [desc(b.weekDate)],
      columns: { id: true, weekDate: true, titleId: true, status: true, pdfUrl: true },
      limit: 500,
    })
    return rows.map((r) => ({
      id: r.id,
      weekDate: r.weekDate,
      titleId: r.titleId,
      status: r.status,
      punyaPdf: Boolean(r.pdfUrl),
    }))
  },
)

export const getBulletinForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminBulletinDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const r = await db.query.bulletins.findFirst({ where: (b, { eq }) => eq(b.id, id) })
    if (!r) return null
    return {
      id: r.id,
      weekDate: r.weekDate,
      titleId: r.titleId,
      titleEn: r.titleEn,
      summaryId: r.summaryId,
      summaryEn: r.summaryEn,
      bodyId: r.bodyId,
      bodyEn: r.bodyEn,
      pdfUrl: r.pdfUrl,
      status: r.status,
    }
  })

export const listDevotionalsForAdmin = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AdminDevotionalRow[]> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    return db.query.devotionals.findMany({
      orderBy: (d, { desc }) => [desc(d.publishedDate)],
      columns: {
        id: true,
        slug: true,
        titleId: true,
        authorName: true,
        publishedDate: true,
        status: true,
      },
      limit: 500,
    })
  },
)

export const getDevotionalForAdmin = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<AdminDevotionalDetail | null> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const r = await db.query.devotionals.findFirst({ where: (d, { eq }) => eq(d.id, id) })
    if (!r) return null
    return {
      id: r.id,
      slug: r.slug,
      titleId: r.titleId,
      titleEn: r.titleEn,
      authorName: r.authorName,
      publishedDate: r.publishedDate,
      coverImageUrl: r.coverImageUrl,
      excerptId: r.excerptId,
      excerptEn: r.excerptEn,
      bodyId: r.bodyId,
      bodyEn: r.bodyEn,
      status: r.status,
    }
  })
```

- [ ] **Step 2: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/content/admin-queries.ts
git commit -m "Tambah query warta & renungan untuk dashboard

Menampilkan draft, yang tidak pernah dikembalikan query publik. Body tidak
diambil di daftar — ia bisa panjang dan daftar hanya butuh judul serta status;
punyaPdf cukup sebagai penanda tanpa menarik URL-nya.

ensureAdmin() dipanggil di server fn, bukan hanya di route."
```

---

## Task 4: Mutasi warta + validasi

**Files:**
- Create: `src/features/content/bulletin-mutations.ts`
- Test: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Consumes: `sanitizeRichText` (Task 1), `ensureAdmin`.
- Produces: `bulletinInputSchema`, `createBulletin`, `updateBulletin`, `deleteBulletin`, `setBulletinStatus`.

- [ ] **Step 1: Tulis test yang gagal**

Buat `tests/unit/content-validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bulletinInputSchema } from '@/features/content/bulletin-mutations'

const valid = {
  weekDate: '2026-10-04',
  titleId: 'Warta Minggu',
  titleEn: 'Weekly Bulletin',
  summaryId: 'Ringkasan',
  summaryEn: 'Summary',
  bodyId: '<p>isi</p>',
  bodyEn: '<p>body</p>',
  status: 'draft' as const,
}

describe('bulletinInputSchema', () => {
  it('menerima input yang sah', () => {
    expect(bulletinInputSchema.safeParse(valid).success).toBe(true)
  })

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, weekDate: '2026-02-30' }).success).toBe(false)
  })

  it('menolak judul kosong', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, titleId: '   ' }).success).toBe(false)
  })

  // Constraint `bulletin_has_content` di database mewajibkan pdfUrl ATAU bodyId.
  // Divalidasi di sini supaya pengurus dapat pesan yang bisa dipahami, bukan
  // error constraint mentah dari Postgres.
  it('menolak warta tanpa body dan tanpa PDF', () => {
    const r = bulletinInputSchema.safeParse({ ...valid, bodyId: '', bodyEn: '', pdfUrl: '' })
    expect(r.success).toBe(false)
  })

  it('menerima warta ber-PDF tanpa body', () => {
    const r = bulletinInputSchema.safeParse({
      ...valid,
      bodyId: '',
      bodyEn: '',
      pdfUrl: 'https://contoh.test/warta.pdf',
    })
    expect(r.success).toBe(true)
  })

  it('menerima warta ber-body tanpa PDF', () => {
    expect(bulletinInputSchema.safeParse({ ...valid, pdfUrl: '' }).success).toBe(true)
  })

  it('menolak pdfUrl yang bukan http/https', () => {
    const r = bulletinInputSchema.safeParse({ ...valid, pdfUrl: 'javascript:alert(1)' })
    expect(r.success).toBe(false)
  })

  // Body yang isinya cuma markup kosong dari editor bukan body sungguhan.
  // Tiptap menghasilkan `<p></p>` untuk editor yang dikosongkan.
  it('menganggap body kosong-versi-editor sebagai tidak ada', () => {
    const r = bulletinInputSchema.safeParse({
      ...valid,
      bodyId: '<p></p>',
      bodyEn: '<p><br></p>',
      pdfUrl: '',
    })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/content-validation.test.ts`
Expected: FAIL — modul belum ada.

- [ ] **Step 3: Tulis mutasi warta**

Buat `src/features/content/bulletin-mutations.ts`:

```ts
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => {
    const [y, mo, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y!, mo! - 1, d!))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo! - 1 && dt.getUTCDate() === d
  }, 'Tanggal itu tidak ada di kalender')

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

/**
 * Body dari editor. Tiptap menghasilkan `<p></p>` atau `<p><br></p>` untuk
 * editor yang dikosongkan — secara teknis ada isinya, tapi bagi pembaca itu
 * kosong. Diperlakukan sebagai null supaya constraint `bulletin_has_content`
 * tidak lolos oleh markup hampa.
 */
const badanOpsional = z
  .string()
  .optional()
  .transform((v) => {
    const teks = (v ?? '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
    return teks === '' ? null : (v ?? null)
  })

const urlOpsional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//.test(v), {
    message: 'Alamat berkas harus diawali http:// atau https://',
  })

export const bulletinInputSchema = z
  .object({
    weekDate: tanggal,
    titleId: wajibIsi,
    titleEn: wajibIsi,
    summaryId: wajibIsi,
    summaryEn: wajibIsi,
    bodyId: badanOpsional,
    bodyEn: badanOpsional,
    pdfUrl: urlOpsional,
    status: z.enum(['draft', 'published']),
  })
  // Cermin constraint `bulletin_has_content` di database. Divalidasi di sini
  // supaya pengurus dapat kalimat yang bisa dipahami, bukan error constraint
  // mentah dari Postgres.
  .refine((v) => Boolean(v.pdfUrl ?? v.bodyId), {
    message: 'Warta butuh isi atau berkas PDF',
    path: ['bodyId'],
  })

export type BulletinInput = z.infer<typeof bulletinInputSchema>

/** Sanitasi di titik simpan; lapisan baca tetap menyanitasi lagi. */
async function bersihkan(input: BulletinInput): Promise<BulletinInput> {
  const { sanitizeRichText } = await import('@/lib/sanitize')
  return {
    ...input,
    bodyId: input.bodyId === null ? null : sanitizeRichText(input.bodyId),
    bodyEn: input.bodyEn === null ? null : sanitizeRichText(input.bodyEn),
  }
}

export const createBulletin = createServerFn({ method: 'POST' })
  .validator((d: unknown) => bulletinInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const [row] = await db
      .insert(bulletins)
      .values(await bersihkan(data))
      .returning({ id: bulletins.id })
    if (!row) throw new Error('Gagal menyimpan warta')
    return { id: row.id }
  })

export const updateBulletin = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(bulletinInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    const [row] = await db
      .update(bulletins)
      .set({ ...(await bersihkan(rest)), updatedAt: new Date() })
      .where(eq(bulletins.id, id))
      .returning({ id: bulletins.id })
    if (!row) throw new Error('Warta tidak ditemukan')
    return { id: row.id }
  })

export const deleteBulletin = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(bulletins).where(eq(bulletins.id, id))
    return { ok: true }
  })

export const setBulletinStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { bulletins } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(bulletins)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(bulletins.id, data.id))
    return { ok: true }
  })
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/content-validation.test.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/content/bulletin-mutations.ts tests/unit/content-validation.test.ts
git commit -m "Tambah mutasi warta + validasi

Sanitasi dijalankan di titik SIMPAN, bukan hanya saat baca — yang tersimpan
di database kini sudah bersih. Sanitasi saat baca tidak dicabut: ia melindungi
baris lama dan tetap jadi lapis kedua kalau suatu hari ada jalur tulis yang
lupa menyanitasi.

Constraint bulletin_has_content dicerminkan di Zod supaya pengurus dapat
kalimat yang bisa dipahami, bukan error constraint mentah dari Postgres.

Body 'kosong-versi-editor' (<p></p> dan <p><br></p> yang Tiptap hasilkan untuk
editor yang dikosongkan) diperlakukan sebagai tidak ada — kalau tidak,
constraint itu lolos oleh markup hampa dan warta terbit tanpa isi."
```

---

## Task 5: Mutasi renungan + validasi

**Files:**
- Create: `src/features/content/devotional-mutations.ts`
- Modify: `tests/unit/content-validation.test.ts`

**Interfaces:**
- Consumes: `sanitizeRichText`, `ensureAdmin`.
- Produces: `devotionalInputSchema`, `createDevotional`, `updateDevotional`, `deleteDevotional`, `setDevotionalStatus`.

- [ ] **Step 1: Tambahkan test yang gagal**

Tambahkan di akhir `tests/unit/content-validation.test.ts`:

```ts
import { devotionalInputSchema } from '@/features/content/devotional-mutations'

const renungan = {
  slug: 'hidup-dalam-syukur',
  titleId: 'Hidup dalam Syukur',
  titleEn: 'Living in Gratitude',
  authorName: 'Tim Renungan',
  publishedDate: '2026-10-04',
  excerptId: 'Kutipan',
  excerptEn: 'Excerpt',
  bodyId: '<p>isi</p>',
  bodyEn: '<p>body</p>',
  status: 'draft' as const,
}

describe('devotionalInputSchema', () => {
  it('menerima input yang sah', () => {
    expect(devotionalInputSchema.safeParse(renungan).success).toBe(true)
  })

  // Slug masuk ke URL publik `/renungan/<slug>`. Spasi dan huruf kapital di sana
  // menghasilkan tautan yang rusak atau ter-encode aneh.
  it('menolak slug ber-spasi atau huruf kapital', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'Hidup Dalam' }).success).toBe(false)
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'Hidup' }).success).toBe(false)
  })

  it('menerima slug huruf kecil, angka, dan tanda hubung', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, slug: 'renungan-2' }).success).toBe(true)
  })

  // `bodyId`/`bodyEn` NOT NULL di schema — berbeda dari warta.
  it('menolak body kosong di salah satu bahasa', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, bodyId: '<p></p>' }).success).toBe(false)
    expect(devotionalInputSchema.safeParse({ ...renungan, bodyEn: '' }).success).toBe(false)
  })

  it('menolak tanggal yang tidak ada di kalender', () => {
    expect(devotionalInputSchema.safeParse({ ...renungan, publishedDate: '2026-02-30' }).success).toBe(false)
  })

  it('menolak coverImageUrl yang bukan http/https', () => {
    const r = devotionalInputSchema.safeParse({ ...renungan, coverImageUrl: 'javascript:alert(1)' })
    expect(r.success).toBe(false)
  })
})
```

- [ ] **Step 2: Jalankan test — pastikan GAGAL**

Run: `pnpm test tests/unit/content-validation.test.ts`
Expected: FAIL — modul `devotional-mutations` belum ada.

- [ ] **Step 3: Tulis mutasi renungan**

Buat `src/features/content/devotional-mutations.ts`. Strukturnya sejajar `bulletin-mutations.ts` — ulangi bentuknya, jangan mengimpor bagian dalamnya, karena aturan kedua domain akan menyimpang seiring waktu dan berbagi skema akan membuat perubahan di satu sisi diam-diam mengubah sisi lain:

```ts
import { z } from 'zod'
import { createServerFn } from '@tanstack/react-start'
import { ensureAdmin } from '@/lib/auth.functions'

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine((v) => {
    const [y, mo, d] = v.split('-').map(Number)
    const dt = new Date(Date.UTC(y!, mo! - 1, d!))
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo! - 1 && dt.getUTCDate() === d
  }, 'Tanggal itu tidak ada di kalender')

const wajibIsi = z.string().trim().min(1, 'Wajib diisi')

/** Body renungan WAJIB ada di kedua bahasa — kolomnya NOT NULL, beda dari warta. */
const badanWajib = z.string().refine((v) => {
  const teks = v
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return teks !== ''
}, 'Isi renungan wajib diisi')

/**
 * Slug masuk ke URL publik `/renungan/<slug>`. Dibatasi huruf kecil, angka, dan
 * tanda hubung supaya tautannya tidak pernah perlu di-encode.
 */
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung')

const urlOpsional = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : null))
  .refine((v) => v === null || /^https?:\/\//.test(v), {
    message: 'Alamat gambar harus diawali http:// atau https://',
  })

export const devotionalInputSchema = z.object({
  slug,
  titleId: wajibIsi,
  titleEn: wajibIsi,
  authorName: wajibIsi,
  publishedDate: tanggal,
  coverImageUrl: urlOpsional,
  excerptId: wajibIsi,
  excerptEn: wajibIsi,
  bodyId: badanWajib,
  bodyEn: badanWajib,
  status: z.enum(['draft', 'published']),
})

export type DevotionalInput = z.infer<typeof devotionalInputSchema>

const DUPLICATE_SLUG = 'DUPLICATE_SLUG'
export { DUPLICATE_SLUG }

/** Postgres unique_violation — di sini artinya slug sudah dipakai renungan lain. */
function slugBentrok(e: unknown): boolean {
  const kode =
    (e as { cause?: { code?: string }; code?: string })?.cause?.code ??
    (e as { code?: string })?.code
  return kode === '23505'
}

async function bersihkan(input: DevotionalInput): Promise<DevotionalInput> {
  const { sanitizeRichText } = await import('@/lib/sanitize')
  return { ...input, bodyId: sanitizeRichText(input.bodyId), bodyEn: sanitizeRichText(input.bodyEn) }
}

export const createDevotional = createServerFn({ method: 'POST' })
  .validator((d: unknown) => devotionalInputSchema.parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    try {
      const [row] = await db
        .insert(devotionals)
        .values(await bersihkan(data))
        .returning({ id: devotionals.id })
      if (!row) throw new Error('Gagal menyimpan renungan')
      return { id: row.id }
    } catch (e) {
      if (slugBentrok(e)) throw new Error(DUPLICATE_SLUG, { cause: e })
      throw e
    }
  })

export const updateDevotional = createServerFn({ method: 'POST' })
  .validator((d: unknown) => z.object({ id: z.uuid() }).and(devotionalInputSchema).parse(d))
  .handler(async ({ data }): Promise<{ id: string }> => {
    await ensureAdmin()
    const { id, ...rest } = data
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    try {
      const [row] = await db
        .update(devotionals)
        .set({ ...(await bersihkan(rest)), updatedAt: new Date() })
        .where(eq(devotionals.id, id))
        .returning({ id: devotionals.id })
      if (!row) throw new Error('Renungan tidak ditemukan')
      return { id: row.id }
    } catch (e) {
      if (slugBentrok(e)) throw new Error(DUPLICATE_SLUG, { cause: e })
      throw e
    }
  })

export const deleteDevotional = createServerFn({ method: 'POST' })
  .validator((id: unknown) => z.uuid().parse(id))
  .handler(async ({ data: id }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db.delete(devotionals).where(eq(devotionals.id, id))
    return { ok: true }
  })

export const setDevotionalStatus = createServerFn({ method: 'POST' })
  .validator((d: unknown) =>
    z.object({ id: z.uuid(), status: z.enum(['draft', 'published']) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await ensureAdmin()
    const { db } = await import('@/db')
    const { devotionals } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')
    await db
      .update(devotionals)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(devotionals.id, data.id))
    return { ok: true }
  })
```

- [ ] **Step 4: Jalankan test — pastikan LULUS**

Run: `pnpm test tests/unit/content-validation.test.ts`
Expected: PASS (14 test — 8 warta + 6 renungan).

- [ ] **Step 5: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
git add src/features/content/devotional-mutations.ts tests/unit/content-validation.test.ts
git commit -m "Tambah mutasi renungan + validasi

Slug dibatasi huruf kecil, angka, dan tanda hubung: ia masuk ke URL publik
/renungan/<slug>, dan spasi atau huruf kapital di sana menghasilkan tautan
yang rusak atau ter-encode aneh.

Body wajib di KEDUA bahasa — kolomnya NOT NULL di schema, berbeda dari warta
yang boleh berisi PDF saja. Markup hampa dari editor yang dikosongkan tetap
dihitung kosong.

Bentrok slug ditangkap sebagai kode DUPLICATE_SLUG, bukan dibiarkan tayang
sebagai error constraint mentah. Skemanya sengaja tidak berbagi bagian dalam
dengan warta: aturan kedua domain akan menyimpang, dan berbagi akan membuat
perubahan di satu sisi diam-diam mengubah sisi lain."
```

---

## Task 6: Halaman warta

**Files:**
- Create: `src/components/admin/bulletin-form.tsx`
- Create: `src/routes/admin._app.warta.index.tsx`, `admin._app.warta.baru.tsx`, `admin._app.warta.$id.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: Task 2, 3, 4.
- Produces: route `/admin/warta`, `/admin/warta/baru`, `/admin/warta/$id`.

- [ ] **Step 1: Tambahkan kunci pesan**

Ke kedua katalog, dengan nama kunci identik:

```json
  "admin_bulletin_title": "Warta Jemaat",
  "admin_bulletin_new": "Tambah Warta",
  "admin_bulletin_empty": "Belum ada warta.",
  "admin_bulletin_week": "Minggu",
  "admin_bulletin_has_pdf": "PDF",
  "admin_bulletin_new_title": "Tambah Warta",
  "admin_bulletin_edit_title": "Ubah Warta",
  "admin_bulletin_title_id": "Judul (Indonesia)",
  "admin_bulletin_title_en": "Judul (Inggris)",
  "admin_bulletin_summary_id": "Ringkasan (Indonesia)",
  "admin_bulletin_summary_en": "Ringkasan (Inggris)",
  "admin_bulletin_body_id": "Isi (Indonesia)",
  "admin_bulletin_body_en": "Isi (Inggris)",
  "admin_bulletin_pdf": "Alamat berkas PDF (opsional)",
  "admin_bulletin_delete_confirm": "Hapus warta ini? Tindakan ini tidak bisa dibatalkan.",
```

Inggris: "Bulletins", "Add Bulletin", "No bulletins yet.", "Week", "PDF", "Add Bulletin", "Edit Bulletin", "Title (Indonesian)", "Title (English)", "Summary (Indonesian)", "Summary (English)", "Body (Indonesian)", "Body (English)", "PDF file address (optional)", "Delete this bulletin? This cannot be undone."

- [ ] **Step 2: Tulis `<BulletinForm>`**

Buat `src/components/admin/bulletin-form.tsx`, mengikuti pola `service-form.tsx` dari Rencana 3b: `useState` + `useId`, tanpa form library, galat server ditampilkan di `role="status"` `aria-live="polite"`, tombol submit terkunci saat mengirim dengan guard `if (sending) return` di awal handler.

Field: `weekDate` (`<Input type="date">`), `titleId`, `titleEn`, `summaryId`, `summaryEn` (`<Input>`), `bodyId` dan `bodyEn` (`<RichTextEditor>` dari Task 2), `pdfUrl` (`<Input type="url">`), `status` (select draf/terbit).

Props: `{ awal?: AdminBulletinDetail; onSubmit: (input: BulletinInput) => Promise<void>; onCancel: () => void }`.

Dua hal yang wajib ada dan mudah terlewat:

1. `<RichTextEditor>` di-**lazy load** lewat `React.lazy` + `<Suspense>`, supaya bundle Tiptap tidak ikut ke halaman lain. Fallback-nya cukup satu blok setinggi editor supaya tata letak tidak melompat.
2. Galat `bodyId` dari server (pesan "Warta butuh isi atau berkas PDF") ditampilkan di wilayah `role="status"` yang sama — jangan membuat validasi klien terpisah yang bisa menyimpang dari server.

- [ ] **Step 3: Buat ketiga route**

`admin._app.warta.index.tsx` — loader `listBulletinsForAdmin()`, merender `<Table>` dengan kolom Minggu / Judul / PDF / Status dan aksi per baris (Ubah, Terbitkan atau Jadikan draf, Hapus lewat `<Dialog>` konfirmasi). Tombol "Tambah Warta" di kepala halaman. Empty state memakai `admin_bulletin_empty`.

`admin._app.warta.baru.tsx` — `<BulletinForm>` kosong, submit ke `createBulletin`, lalu `router.navigate({ to: '/admin/warta' })`.

`admin._app.warta.$id.tsx` — loader `getBulletinForAdmin(params.id)`; `null` → `throw notFound()`. `<BulletinForm awal={...}>`, submit ke `updateBulletin`.

Semuanya `createFileRoute('/admin/_app/warta…')`, dan **perhatikan `.index`** untuk daftar — lihat catatan penamaan route di bagian File Structure.

- [ ] **Step 4: Naikkan nav Warta ke `<Link>`**

Di `src/components/admin/admin-shell.tsx`, item `/admin/warta` kini punya route sungguhan. Tambahkan ke daftar path yang dirender sebagai `<Link>` (saat ini `'/admin'` dan `'/admin/jadwal'`).

- [ ] **Step 5: Verifikasi lewat probe Playwright**

Tulis probe sementara `tests/e2e/zz-probe-warta.spec.ts` yang masuk memakai `SEED_ADMIN_*` — pola pemanasan + `networkidle` ada di `tests/e2e/admin.spec.ts` dan `admin-jadwal.spec.ts` — lalu membuktikan:

- `/admin/warta` menampilkan tabel dengan minimal satu baris
- `/admin/warta/baru` menampilkan field judul DAN toolbar editor (`role="toolbar"`), yang membuktikan lazy-load Tiptap benar-benar sampai ke DOM
- menekan tombol Tebal lalu mengetik menghasilkan `<strong>` di dalam editor

Jalankan `--project=chromium`, salin hasil ke laporan, **hapus probe sebelum commit**.

- [ ] **Step 6: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # jalankan sendirian
git add src/components/admin/bulletin-form.tsx src/routes/ src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah halaman warta admin: daftar, buat, ubah

Editor rich text di-lazy load supaya bundle Tiptap tidak ikut ke halaman lain.

Halaman daftar dinamai warta.index.tsx: sebagai warta.tsx ia akan menjadi
PARENT bagi warta.baru dan warta.\$id, dan tanpa <Outlet/> kedua halaman anak
itu tidak muncul sama sekali — persis yang terjadi di Rencana 3b, dan tidak
tertangkap typecheck, lint, maupun build."
```

---

## Task 7: Halaman renungan

**Files:**
- Create: `src/components/admin/devotional-form.tsx`
- Create: `src/routes/admin._app.renungan.index.tsx`, `admin._app.renungan.baru.tsx`, `admin._app.renungan.$id.tsx`
- Modify: `src/components/admin/admin-shell.tsx`, `messages/{id,en}.json`

**Interfaces:**
- Consumes: Task 2, 3, 5.
- Produces: route `/admin/renungan`, `/admin/renungan/baru`, `/admin/renungan/$id`.

- [ ] **Step 1: Tambahkan kunci pesan**

Ke kedua katalog:

```json
  "admin_devotional_title": "Renungan",
  "admin_devotional_new": "Tambah Renungan",
  "admin_devotional_empty": "Belum ada renungan.",
  "admin_devotional_new_title": "Tambah Renungan",
  "admin_devotional_edit_title": "Ubah Renungan",
  "admin_devotional_slug": "Slug URL",
  "admin_devotional_slug_hint": "Huruf kecil, angka, dan tanda hubung. Muncul di alamat halaman.",
  "admin_devotional_author": "Penulis",
  "admin_devotional_date": "Tanggal terbit",
  "admin_devotional_cover": "Alamat gambar sampul (opsional)",
  "admin_devotional_excerpt_id": "Kutipan (Indonesia)",
  "admin_devotional_excerpt_en": "Kutipan (Inggris)",
  "admin_devotional_duplicate": "Slug itu sudah dipakai renungan lain.",
  "admin_devotional_delete_confirm": "Hapus renungan ini? Tindakan ini tidak bisa dibatalkan.",
```

Inggris: "Devotionals", "Add Devotional", "No devotionals yet.", "Add Devotional", "Edit Devotional", "URL slug", "Lowercase letters, numbers, and hyphens. Appears in the page address.", "Author", "Published date", "Cover image address (optional)", "Excerpt (Indonesian)", "Excerpt (English)", "That slug is already used by another devotional.", "Delete this devotional? This cannot be undone."

- [ ] **Step 2: Tulis `<DevotionalForm>`**

Buat `src/components/admin/devotional-form.tsx`, pola sama dengan `bulletin-form.tsx`.

Field: `slug` (`<Input>` + teks bantuan `admin_devotional_slug_hint`), `titleId`, `titleEn`, `authorName`, `publishedDate` (`<Input type="date">`), `coverImageUrl` (`<Input type="url">`), `excerptId`, `excerptEn` (`<Input>`), `bodyId` dan `bodyEn` (`<RichTextEditor>`, lazy), `status`.

Wajib ada: galat `DUPLICATE_SLUG` dari server diterjemahkan jadi `m.admin_devotional_duplicate()`, sama seperti `service-form.tsx` menerjemahkan `DUPLICATE_SERVICE` di Rencana 3b. Tanpa itu, pengurus melihat string `DUPLICATE_SLUG` mentah.

- [ ] **Step 3: Buat ketiga route**

Struktur sama dengan Task 6, memakai `listDevotionalsForAdmin`, `getDevotionalForAdmin`, `createDevotional`, `updateDevotional`, `deleteDevotional`, `setDevotionalStatus`. Kolom tabel: Tanggal / Judul / Penulis / Status.

Perhatikan `.index` untuk daftar.

- [ ] **Step 4: Naikkan nav Renungan ke `<Link>`**

Tambahkan `/admin/renungan` ke daftar path `<Link>` di `admin-shell.tsx`.

- [ ] **Step 5: Verifikasi lewat probe Playwright**

Probe sementara yang membuktikan `/admin/renungan` menampilkan tabel, `/admin/renungan/baru` menampilkan field slug dan toolbar editor. **Hapus sebelum commit.**

- [ ] **Step 6: Gerbang + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # jalankan sendirian
git add src/components/admin/devotional-form.tsx src/routes/ src/components/admin/admin-shell.tsx messages/
git commit -m "Tambah halaman renungan admin: daftar, buat, ubah

Bentrok slug diterjemahkan jadi kalimat yang bisa dipahami, bukan dibiarkan
tayang sebagai kode DUPLICATE_SLUG mentah — pola yang sama dengan penanganan
DUPLICATE_SERVICE di Rencana 3b."
```

---

## Task 8: E2E alur warta & renungan

**Files:**
- Create: `tests/e2e/admin-konten.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: seluruh route Task 6 dan 7.
- Produces: —

- [ ] **Step 1: Tambahkan route baru ke daftar gerbang**

Di `tests/e2e/admin.spec.ts`, tambahkan ke daftar yang sudah memuat empat path jadwal:

```ts
  '/admin/warta',
  '/admin/warta/baru',
  '/admin/renungan',
  '/admin/renungan/baru',
```

- [ ] **Step 2: Tulis e2e alur**

Buat `tests/e2e/admin-konten.spec.ts`, mengikuti pola `admin-jadwal.spec.ts` dari Rencana 3b — baca file itu lebih dulu dan tiru strukturnya, termasuk:

- `test.describe.configure({ mode: 'serial' })`
- `test.setTimeout(120_000)` dengan alasan tertulis
- dibatasi `chromium` lewat `testInfo.project.name`
- helper `warm()` untuk endpoint auth dan route
- **penanda unik per run** (`Date.now()`) pada judul dan slug, supaya run yang gagal di tengah tidak menghalangi run berikutnya lewat unique constraint slug
- **langkah 0 pembersihan** sisa run sebelumnya lewat UI, dengan filter regex TANPA anchor `^` — teks baris tabel dimulai dengan tanggal, bukan judul; anchor membuat filter tidak pernah cocok dan pembersihan diam-diam tidak melakukan apa-apa
- helper pembuka halaman publik yang selalu `goto` + `reload`, karena alur ini mengunjungi halaman yang sama beberapa kali sambil mengubah isinya

Yang harus dibuktikan, dalam satu alur berurutan:

1. Buat warta sebagai **draf**, dengan isi diketik lewat editor (tekan tombol Tebal, ketik teks) — ini sekaligus membuktikan editor benar-benar menghasilkan markup, bukan teks polos.
2. Tampil di `/admin/warta` sebagai draf.
3. **TIDAK** muncul di `/warta` publik.
4. Terbitkan → muncul di `/warta` publik, dan **teks tebalnya bertahan** (`<strong>` lolos sanitizer, bukan dibuang).
5. Hapus → hilang dari keduanya.
6. Ulangi 1–5 untuk renungan di `/admin/renungan` dan `/renungan`.

Langkah 4 yang paling berharga di sini: ia membuktikan seluruh rantai — editor menghasilkan tag yang ada di allowlist, sanitasi simpan tidak membuangnya, dan sanitasi baca juga tidak.

- [ ] **Step 3: Buktikan test benar-benar menangkap**

Sementara, persempit `ALLOWED_TAGS` di `src/lib/sanitize.ts` dengan membuang `'strong'`.

Run: `pnpm test:e2e tests/e2e/admin-konten.spec.ts --project=chromium`
Expected: **GAGAL** di langkah 4 — teks tebal hilang setelah terbit.

Kembalikan, jalankan ulang, pastikan hijau. Salin kedua output ke laporan.

- [ ] **Step 4: Pastikan tidak ada baris uji tertinggal**

```bash
cat > zz-probe.mjs <<'EOF'
import 'dotenv/config'
import pg from 'pg'
const c = new pg.Client({ connectionString: process.env.DATABASE_URL })
await c.connect()
for (const t of ['bulletins', 'devotionals']) {
  const r = await c.query(`select count(*)::int n from ${t} where title_id like 'Uji Otomatis%'`)
  console.log(t, 'baris uji tertinggal:', r.rows[0].n)
}
await c.end()
EOF
npx tsx zz-probe.mjs; rm -f zz-probe.mjs
```

Expected: `0` untuk keduanya. Kalau ada yang tertinggal, hapus lewat dashboard — jalur yang sama dengan pengurus.

- [ ] **Step 5: Gerbang penuh + commit**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e   # sendirian, dan jalankan DUA KALI berturut-turut
git add tests/e2e/
git commit -m "Kunci alur warta & renungan dengan e2e

Dua alur berurutan: buat draf -> tidak bocor ke publik -> terbitkan -> muncul
di publik dengan format bertahan -> hapus -> hilang dari keduanya.

Langkah keempat yang paling berharga: teks tebal yang diketik lewat editor
harus bertahan sampai halaman publik. Itu membuktikan seluruh rantai sekaligus
— editor menghasilkan tag yang ada di allowlist, sanitasi simpan tidak
membuangnya, dan sanitasi baca juga tidak. Diverifikasi merah lebih dulu
dengan membuang 'strong' dari ALLOWED_TAGS."
```

---

## Setelah plan ini

Sisa Rencana 3 yang belum dikerjakan:

- **Rencana unggah** — PDF tata ibadah (3b), PDF warta dan sampul renungan (plan ini), foto galeri (3d). Ditunda bersama supaya lapisan unggahnya ditulis sekali. Sampai itu ada, ketiga field itu diisi sebagai URL teks.
- **3d — galeri**: album, item, urutkan, sampul.
- **3e — master data & pesan**: kategori (dengan validasi format warna token), kolom, `site_settings` tujuh kunci, `contact_messages`.
- **Kelola `schedule_templates` lewat UI** (ditunda dari 3b).

Utang yang masih berlaku dari `docs/dev/rencana-3a-handoff.md` §2:

- **Alias `muted`/`accent` maknanya bentrok.** `<Table>` dan `<Dialog>` sudah dipakai sejak 3b, jadi ini sudah terlihat sekarang — kontras baris terpilih terhitung 2.95:1 di terang dan 2.03:1 di gelap, di bawah AA. Plan ini menambah dua tabel lagi, jadi kalau belum digarap saat 3d, kerjakan di sana.
- **`<Toaster>` belum dipasang** di layout mana pun.
- **E2E menulis ke database yang melayani situs live.** Plan ini menambah dua alur yang juga menulis. Semuanya membersihkan diri, tapi database test terpisah tetap utang yang sebenarnya.
- **Terbitkan-massal untuk generator jadwal** — 72 draf harus diterbitkan satu per satu.
