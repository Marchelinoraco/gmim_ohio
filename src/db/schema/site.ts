import { jsonb, pgEnum, pgTable, text } from 'drizzle-orm/pg-core'
import { idPk, timestamps } from './_helpers'
import { user } from './auth'

export const contactStatus = pgEnum('contact_status', ['new', 'read', 'done'])

export const contactMessages = pgTable('contact_messages', {
  id: idPk(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  message: text('message').notNull(),
  status: contactStatus('status').notNull().default('new'),
  ...timestamps,
})

export const siteSettings = pgTable('site_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  // user.id = text (tabel auth, Task 9) → FK text↔text, bukan uuid.
  updatedBy: text('updated_by').references(() => user.id),
  ...timestamps,
})
