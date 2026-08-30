import { relations } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  time,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { idPk, timestamps } from './_helpers'

export const worshipCategoryKey = pgEnum('worship_category_key', [
  'ibadah_jemaat',
  'kaum_bapa',
  'kaum_ibu',
  'pemuda_remaja',
  'sekolah_minggu',
  'kolom',
])
export const locationType = pgEnum('location_type', ['gedung_gereja', 'rumah'])
export const publishStatus = pgEnum('publish_status', ['draft', 'published'])

export const worshipCategories = pgTable('worship_categories', {
  id: idPk(),
  key: worshipCategoryKey('key').notNull().unique(),
  nameId: text('name_id').notNull(),
  nameEn: text('name_en').notNull(),
  slug: text('slug').notNull().unique(),
  color: text('color').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const kolom = pgTable('kolom', {
  id: idPk(),
  name: text('name').notNull(),
  number: integer('number').notNull(),
  coordinatorName: text('coordinator_name'),
  coordinatorPhone: text('coordinator_phone'),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const scheduleTemplates = pgTable('schedule_templates', {
  id: idPk(),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => worshipCategories.id),
  kolomId: uuid('kolom_id').references(() => kolom.id),
  dayOfWeek: integer('day_of_week').notNull(), // 0=Minggu..6=Sabtu
  startTime: time('start_time').notNull(),
  endTime: time('end_time'),
  defaultLocationType: locationType('default_location_type').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
})

export const worshipServices = pgTable(
  'worship_services',
  {
    id: idPk(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => worshipCategories.id),
    kolomId: uuid('kolom_id').references(() => kolom.id),
    templateId: uuid('template_id').references(() => scheduleTemplates.id),
    serviceDate: date('service_date').notNull(), // Eastern wall-clock
    startTime: time('start_time').notNull(), // Eastern wall-clock
    endTime: time('end_time'),
    locationType: locationType('location_type').notNull(),
    hostFamilyName: text('host_family_name'),
    hostAddress: text('host_address'),
    locationNote: text('location_note'),
    themeId: text('theme_id'),
    themeEn: text('theme_en'),
    bibleReading: text('bible_reading'),
    preacherName: text('preacher_name'),
    liturgistName: text('liturgist_name'),
    liturgyPdfUrl: text('liturgy_pdf_url'),
    status: publishStatus('status').notNull().default('draft'),
    ...timestamps,
  },
  (t) => [
    index('ws_service_date_idx').on(t.serviceDate),
    index('ws_category_date_idx').on(t.categoryId, t.serviceDate),
    index('ws_status_date_idx').on(t.status, t.serviceDate),
    // templateId nullable → NULL distinct di Postgres, jadi entri manual tak bentrok.
    // Idempotensi hanya untuk output generator jadwal.
    uniqueIndex('ws_template_date_uq').on(t.templateId, t.serviceDate),
  ],
)

export const worshipCategoriesRelations = relations(worshipCategories, ({ many }) => ({
  services: many(worshipServices),
  templates: many(scheduleTemplates),
}))

export const worshipServicesRelations = relations(worshipServices, ({ one }) => ({
  category: one(worshipCategories, {
    fields: [worshipServices.categoryId],
    references: [worshipCategories.id],
  }),
  kolom: one(kolom, { fields: [worshipServices.kolomId], references: [kolom.id] }),
  template: one(scheduleTemplates, {
    fields: [worshipServices.templateId],
    references: [scheduleTemplates.id],
  }),
}))
