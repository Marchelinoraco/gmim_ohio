import { relations, sql } from 'drizzle-orm'
import { check, date, integer, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { idPk, timestamps } from './_helpers'
import { publishStatus } from './worship'

export const galleryItemType = pgEnum('gallery_item_type', ['image', 'youtube'])

export const bulletins = pgTable(
  'bulletins',
  {
    id: idPk(),
    weekDate: date('week_date').notNull(),
    titleId: text('title_id').notNull(),
    titleEn: text('title_en').notNull(),
    summaryId: text('summary_id').notNull(),
    summaryEn: text('summary_en').notNull(),
    bodyId: text('body_id'), // HTML tersanitasi (Rencana 3)
    bodyEn: text('body_en'),
    pdfUrl: text('pdf_url'),
    status: publishStatus('status').notNull().default('draft'),
    ...timestamps,
  },
  (t) => [check('bulletin_has_content', sql`${t.pdfUrl} is not null or ${t.bodyId} is not null`)],
)

export const devotionals = pgTable('devotionals', {
  id: idPk(),
  slug: text('slug').notNull().unique(),
  titleId: text('title_id').notNull(),
  titleEn: text('title_en').notNull(),
  authorName: text('author_name').notNull(),
  publishedDate: date('published_date').notNull(),
  coverImageUrl: text('cover_image_url'),
  excerptId: text('excerpt_id').notNull(),
  excerptEn: text('excerpt_en').notNull(),
  bodyId: text('body_id').notNull(),
  bodyEn: text('body_en').notNull(),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
})

export const galleryAlbums = pgTable('gallery_albums', {
  id: idPk(),
  titleId: text('title_id').notNull(),
  titleEn: text('title_en').notNull(),
  albumDate: date('album_date').notNull(),
  coverImageUrl: text('cover_image_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: publishStatus('status').notNull().default('draft'),
  ...timestamps,
})

export const galleryItems = pgTable('gallery_items', {
  id: idPk(),
  albumId: uuid('album_id')
    .notNull()
    .references(() => galleryAlbums.id, { onDelete: 'cascade' }),
  type: galleryItemType('type').notNull(),
  imageUrl: text('image_url'),
  youtubeUrl: text('youtube_url'),
  captionId: text('caption_id'),
  captionEn: text('caption_en'),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const galleryAlbumsRelations = relations(galleryAlbums, ({ many }) => ({
  items: many(galleryItems),
}))

export const galleryItemsRelations = relations(galleryItems, ({ one }) => ({
  album: one(galleryAlbums, { fields: [galleryItems.albumId], references: [galleryAlbums.id] }),
}))
