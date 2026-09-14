DO $$
DECLARE
  item RECORD;
  client_uuid_folder_id UUID;
  client_name_folder_id UUID;
  case_uuid_folder_id UUID;
  case_name_folder_id UUID;
  client_folder_name TEXT;
  case_folder_name TEXT;
  skipped_without_primary_client INTEGER;
BEGIN
  FOR item IN
    SELECT DISTINCT
      c."tenant_id",
      c."id" AS case_id,
      c."case_number",
      c."caption",
      cl."id" AS client_id,
      cl."type" AS client_type,
      cl."business_name",
      cl."first_name",
      cl."last_name"
    FROM "documents" d
    JOIN "cases" c ON c."tenant_id" = d."tenant_id" AND c."id" = d."case_id"
    JOIN "clients" cl ON cl."tenant_id" = c."tenant_id" AND cl."id" = c."primary_client_id"
    WHERE d."deleted_at" IS NULL
      AND d."status" = 'active'
      AND d."case_id" IS NOT NULL
  LOOP
    client_folder_name := left(
      COALESCE(
        NULLIF(
          btrim(
            CASE
              WHEN item.client_type::text = 'legal_entity' THEN item.business_name
              ELSE concat_ws(' ', item.first_name, item.last_name)
            END
          ),
          ''
        ),
        'Cliente sin nombre'
      ),
      120
    );
    case_folder_name := left(
      COALESCE(NULLIF(btrim(item.case_number || ' - ' || item.caption), ''), 'Sin nombre'),
      120
    );

    SELECT "id" INTO client_uuid_folder_id
    FROM "document_folders"
    WHERE "tenant_id" = item."tenant_id"
      AND "parent_id" IS NULL
      AND lower("name") = lower(item.client_id::text)
    LIMIT 1;

    IF client_uuid_folder_id IS NULL THEN
      INSERT INTO "document_folders" ("tenant_id", "parent_id", "name", "notes")
      VALUES (
        item."tenant_id",
        NULL,
        item.client_id::text,
        'system:case-library:client-uuid'
      )
      RETURNING "id" INTO client_uuid_folder_id;
    ELSE
      UPDATE "document_folders"
      SET "notes" = 'system:case-library:client-uuid'
      WHERE "id" = client_uuid_folder_id;
    END IF;

    SELECT "id" INTO client_name_folder_id
    FROM "document_folders"
    WHERE "tenant_id" = item."tenant_id"
      AND "parent_id" = client_uuid_folder_id
      AND lower("name") = lower(client_folder_name)
    LIMIT 1;

    IF client_name_folder_id IS NULL THEN
      INSERT INTO "document_folders" ("tenant_id", "parent_id", "name", "notes")
      VALUES (
        item."tenant_id",
        client_uuid_folder_id,
        client_folder_name,
        'system:case-library:client-name'
      )
      RETURNING "id" INTO client_name_folder_id;
    ELSE
      UPDATE "document_folders"
      SET "notes" = 'system:case-library:client-name'
      WHERE "id" = client_name_folder_id;
    END IF;

    SELECT "id" INTO case_uuid_folder_id
    FROM "document_folders"
    WHERE "tenant_id" = item."tenant_id"
      AND "parent_id" = client_name_folder_id
      AND lower("name") = lower(item.case_id::text)
    LIMIT 1;

    IF case_uuid_folder_id IS NULL THEN
      INSERT INTO "document_folders" ("tenant_id", "parent_id", "name", "notes")
      VALUES (
        item."tenant_id",
        client_name_folder_id,
        item.case_id::text,
        'system:case-library:case-uuid'
      )
      RETURNING "id" INTO case_uuid_folder_id;
    ELSE
      UPDATE "document_folders"
      SET "notes" = 'system:case-library:case-uuid'
      WHERE "id" = case_uuid_folder_id;
    END IF;

    SELECT "id" INTO case_name_folder_id
    FROM "document_folders"
    WHERE "tenant_id" = item."tenant_id"
      AND "parent_id" = case_uuid_folder_id
      AND lower("name") = lower(case_folder_name)
    LIMIT 1;

    IF case_name_folder_id IS NULL THEN
      INSERT INTO "document_folders" ("tenant_id", "parent_id", "name", "notes")
      VALUES (
        item."tenant_id",
        case_uuid_folder_id,
        case_folder_name,
        'system:case-library:case-name'
      )
      RETURNING "id" INTO case_name_folder_id;
    ELSE
      UPDATE "document_folders"
      SET "notes" = 'system:case-library:case-name'
      WHERE "id" = case_name_folder_id;
    END IF;

    UPDATE "documents"
    SET "folder_id" = case_name_folder_id
    WHERE "tenant_id" = item."tenant_id"
      AND "case_id" = item.case_id
      AND "deleted_at" IS NULL
      AND "status" = 'active'
      AND "folder_id" IS DISTINCT FROM case_name_folder_id;
  END LOOP;

  SELECT COUNT(*) INTO skipped_without_primary_client
  FROM "documents" d
  JOIN "cases" c ON c."tenant_id" = d."tenant_id" AND c."id" = d."case_id"
  WHERE d."deleted_at" IS NULL
    AND d."status" = 'active'
    AND d."case_id" IS NOT NULL
    AND c."primary_client_id" IS NULL;

  IF skipped_without_primary_client > 0 THEN
    RAISE NOTICE 'Skipped % active case documents without primary client.', skipped_without_primary_client;
  END IF;
END $$;
