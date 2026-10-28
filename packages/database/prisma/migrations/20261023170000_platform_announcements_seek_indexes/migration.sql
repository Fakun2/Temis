CREATE INDEX "platform_announcements_created_at_id_idx"
  ON "platform_announcements"("created_at", "id");
CREATE INDEX "platform_announcements_category_created_at_id_idx"
  ON "platform_announcements"("category", "created_at", "id");
CREATE INDEX "platform_announcements_severity_created_at_id_idx"
  ON "platform_announcements"("severity", "created_at", "id");
CREATE INDEX "platform_announcements_audience_created_at_id_idx"
  ON "platform_announcements"("audience", "created_at", "id");
CREATE INDEX "platform_announcements_title_trgm_idx"
  ON "platform_announcements" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "platform_announcements_body_trgm_idx"
  ON "platform_announcements" USING GIN ("body" gin_trgm_ops);
