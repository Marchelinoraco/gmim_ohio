DROP INDEX "ws_template_date_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "ws_template_date_uq" ON "worship_services" USING btree ("template_id","service_date","kolom_id");