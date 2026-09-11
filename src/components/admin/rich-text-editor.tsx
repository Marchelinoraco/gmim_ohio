import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  Unlink,
} from 'lucide-react'
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
 * heading (h2–h4), paragraf, daftar, tebal, miring, kutipan, tautan. Yang tidak
 * ada di allowlist dimatikan DI SINI — bukan dibiarkan lalu dibuang sanitizer,
 * karena itu membuat pengurus mengetik sesuatu yang terlihat benar lalu melihat
 * formatnya hilang setelah simpan, tanpa pesan galat apa pun.
 *
 * Keluarannya tetap disanitasi lagi di server saat simpan. Pembatasan di sini
 * untuk pengalaman pengguna; sanitasi di server untuk keamanan.
 *
 * Link dikonfigurasi lewat StarterKit, bukan diimpor terpisah: di Tiptap 3
 * StarterKit sudah memuat `@tiptap/extension-link` dan mengeksposnya sebagai
 * opsi `link`. Memasangnya lagi sebagai dependency sendiri berisiko dua instans
 * ekstensi yang sama terdaftar.
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
        // h1 milik judul halaman; body hanya boleh mulai dari h2.
        heading: { levels: [2, 3, 4] },
        link: {
          openOnClick: false,
          autolink: false,
          protocols: ['http', 'https', 'mailto'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
    ],
    content: value,
    // Tiptap butuh DOM. Tanpa ini ia mencoba merender saat SSR dan menyebabkan
    // mismatch hidrasi.
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

  const gayaTombol =
    'text-ink hover:bg-surface aria-pressed:bg-surface aria-pressed:text-primary inline-flex h-8 w-8 items-center justify-center rounded'

  const tombol = [
    {
      aksi: () => editor.chain().focus().toggleBold().run(),
      aktif: editor.isActive('bold'),
      Icon: Bold,
      nama: m.editor_bold(),
    },
    {
      aksi: () => editor.chain().focus().toggleItalic().run(),
      aktif: editor.isActive('italic'),
      Icon: Italic,
      nama: m.editor_italic(),
    },
    {
      aksi: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      aktif: editor.isActive('heading', { level: 2 }),
      Icon: Heading2,
      nama: m.editor_h2(),
    },
    {
      aksi: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      aktif: editor.isActive('heading', { level: 3 }),
      Icon: Heading3,
      nama: m.editor_h3(),
    },
    {
      aksi: () => editor.chain().focus().toggleBulletList().run(),
      aktif: editor.isActive('bulletList'),
      Icon: List,
      nama: m.editor_bullet(),
    },
    {
      aksi: () => editor.chain().focus().toggleOrderedList().run(),
      aktif: editor.isActive('orderedList'),
      Icon: ListOrdered,
      nama: m.editor_ordered(),
    },
    {
      aksi: () => editor.chain().focus().toggleBlockquote().run(),
      aktif: editor.isActive('blockquote'),
      Icon: Quote,
      nama: m.editor_quote(),
    },
  ]

  function pasangTautan() {
    const sebelumnya = (editor?.getAttributes('link').href as string | undefined) ?? ''
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
            className={gayaTombol}
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
          className={gayaTombol}
        >
          <Link2 aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
          aria-label={m.editor_unlink()}
          title={m.editor_unlink()}
          className={gayaTombol}
        >
          <Unlink aria-hidden="true" className="size-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
