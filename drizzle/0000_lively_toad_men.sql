CREATE TYPE "public"."location_type" AS ENUM('gedung_gereja', 'rumah');--> statement-breakpoint
CREATE TYPE "public"."publish_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."worship_category_key" AS ENUM('ibadah_jemaat', 'kaum_bapa', 'kaum_ibu', 'pemuda_remaja', 'sekolah_minggu', 'kolom');--> statement-breakpoint
CREATE TYPE "public"."gallery_item_type" AS ENUM('image', 'youtube');--> statement-breakpoint
CREATE TYPE "public"."contact_status" AS ENUM('new', 'read', 'done');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kolom" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"number" integer NOT NULL,
	"coordinator_name" text,
	"coordinator_phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schedule_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"kolom_id" uuid,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"default_location_type" "location_type" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worship_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "worship_category_key" NOT NULL,
	"name_id" text NOT NULL,
	"name_en" text NOT NULL,
	"slug" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "worship_categories_key_unique" UNIQUE("key"),
	CONSTRAINT "worship_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "worship_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"kolom_id" uuid,
	"template_id" uuid,
	"service_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time,
	"location_type" "location_type" NOT NULL,
	"host_family_name" text,
	"host_address" text,
	"location_note" text,
	"theme_id" text,
	"theme_en" text,
	"bible_reading" text,
	"preacher_name" text,
	"liturgist_name" text,
	"liturgy_pdf_url" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulletins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_date" date NOT NULL,
	"title_id" text NOT NULL,
	"title_en" text NOT NULL,
	"summary_id" text NOT NULL,
	"summary_en" text NOT NULL,
	"body_id" text,
	"body_en" text,
	"pdf_url" text,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bulletin_has_content" CHECK ("bulletins"."pdf_url" is not null or "bulletins"."body_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "devotionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title_id" text NOT NULL,
	"title_en" text NOT NULL,
	"author_name" text NOT NULL,
	"published_date" date NOT NULL,
	"cover_image_url" text,
	"excerpt_id" text NOT NULL,
	"excerpt_en" text NOT NULL,
	"body_id" text NOT NULL,
	"body_en" text NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devotionals_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery_albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_id" text NOT NULL,
	"title_en" text NOT NULL,
	"album_date" date NOT NULL,
	"cover_image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" "publish_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"type" "gallery_item_type" NOT NULL,
	"image_url" text,
	"youtube_url" text,
	"caption_id" text,
	"caption_en" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"message" text NOT NULL,
	"status" "contact_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_category_id_worship_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."worship_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_templates" ADD CONSTRAINT "schedule_templates_kolom_id_kolom_id_fk" FOREIGN KEY ("kolom_id") REFERENCES "public"."kolom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worship_services" ADD CONSTRAINT "worship_services_category_id_worship_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."worship_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worship_services" ADD CONSTRAINT "worship_services_kolom_id_kolom_id_fk" FOREIGN KEY ("kolom_id") REFERENCES "public"."kolom"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worship_services" ADD CONSTRAINT "worship_services_template_id_schedule_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."schedule_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_album_id_gallery_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."gallery_albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "ws_service_date_idx" ON "worship_services" USING btree ("service_date");--> statement-breakpoint
CREATE INDEX "ws_category_date_idx" ON "worship_services" USING btree ("category_id","service_date");--> statement-breakpoint
CREATE INDEX "ws_status_date_idx" ON "worship_services" USING btree ("status","service_date");--> statement-breakpoint
CREATE UNIQUE INDEX "ws_template_date_uq" ON "worship_services" USING btree ("template_id","service_date");