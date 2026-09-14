INSERT INTO "permissions" ("id", "code", "resource", "action", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'account:read', 'account', 'read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'account:self_manage', 'account', 'self_manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'account:ai_usage_read', 'account', 'ai_usage_read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'account:studio_manage', 'account', 'studio_manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'account:membership_manage', 'account', 'membership_manage', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'notifications:read', 'notifications', 'read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'notifications:update', 'notifications', 'update', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE
SET "resource" = EXCLUDED."resource", "action" = EXCLUDED."action", "updated_at" = CURRENT_TIMESTAMP;

-- These operations are self-scoped by service methods. Every role needs them so
-- existing custom roles do not lose access to profile or personal notifications.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT gen_random_uuid(), r."id", p."id", CURRENT_TIMESTAMP
FROM "roles" r
CROSS JOIN "permissions" p
WHERE p."code" IN ('account:read', 'account:self_manage', 'notifications:read', 'notifications:update')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

-- Preserve the previous effective policy for custom roles while making it explicit:
-- tenant administrators may manage studio data and AI usage; tenant or billing
-- administrators may manage the subscription settings.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT gen_random_uuid(), rp."role_id", target."id", CURRENT_TIMESTAMP
FROM "role_permissions" rp
JOIN "permissions" source ON source."id" = rp."permission_id"
JOIN "permissions" target ON target."code" IN ('account:ai_usage_read', 'account:studio_manage')
WHERE source."code" = 'tenants:manage'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;

INSERT INTO "role_permissions" ("id", "role_id", "permission_id", "created_at")
SELECT gen_random_uuid(), rp."role_id", target."id", CURRENT_TIMESTAMP
FROM "role_permissions" rp
JOIN "permissions" source ON source."id" = rp."permission_id"
JOIN "permissions" target ON target."code" = 'account:membership_manage'
WHERE source."code" IN ('tenants:manage', 'billing:manage')
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
