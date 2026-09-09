DROP INDEX "ws_template_date_uq";--> statement-breakpoint
ALTER TABLE "worship_services" ADD CONSTRAINT "ws_template_date_uq" UNIQUE NULLS NOT DISTINCT("template_id","service_date","kolom_id");