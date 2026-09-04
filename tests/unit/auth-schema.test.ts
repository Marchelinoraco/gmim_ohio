import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { user, account } from '@/db/schema'

/**
 * Mengunci invarian skema auth yang di-patch manual di `src/db/schema/auth.ts`
 * (lihat header file itu). `@better-auth/cli` @ 1.4.x tidak menghasilkan
 * `user.role`, `user.isActive`, `account.issuer`, maupun unique index
 * `(issuer, account_id)` yang diwajibkan better-auth 1.7. Kalau `pnpm
 * auth:generate` (atau merge) menghapusnya, CI harus gagal keras di sini —
 * bukan login produksi yang diam-diam patah.
 */

describe('skema tabel account', () => {
  const cfg = getTableConfig(account)

  it('punya kolom `issuer` yang notNull', () => {
    const issuer = cfg.columns.find((c) => c.name === 'issuer')
    expect(issuer).toBeDefined()
    expect(issuer?.notNull).toBe(true)
  })

  it('punya unique index atas (issuer, account_id)', () => {
    const idx = cfg.indexes.find((i) => i.config.name === 'account_issuer_accountId_uidx')
    expect(idx).toBeDefined()
    expect(idx?.config.unique).toBe(true)
    const cols = idx?.config.columns.map((c) => (c as { name?: string }).name)
    expect(cols).toEqual(['issuer', 'account_id'])
  })
})

describe('skema tabel user', () => {
  const cfg = getTableConfig(user)
  const names = cfg.columns.map((c) => c.name)

  it('punya kolom `role` dan `is_active`', () => {
    expect(names).toContain('role')
    expect(names).toContain('is_active')
  })

  it('`role` dan `is_active` keduanya notNull', () => {
    expect(cfg.columns.find((c) => c.name === 'role')?.notNull).toBe(true)
    expect(cfg.columns.find((c) => c.name === 'is_active')?.notNull).toBe(true)
  })
})
