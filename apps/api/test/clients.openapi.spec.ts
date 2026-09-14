import "reflect-metadata";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ClientsController } from "../src/clients/clients.controller";
import { ClientsService } from "../src/clients/clients.service";
import { createOpenApiDocument } from "../src/openapi.setup";

@Module({
  controllers: [ClientsController],
  providers: [{ provide: ClientsService, useValue: {} }]
})
class ClientsOpenApiTestModule {}

describe("Clients OpenAPI contract", () => {
  it("documents typed bodies, queries, responses and combined security", async () => {
    const app = await NestFactory.create(ClientsOpenApiTestModule, { logger: false });
    app.setGlobalPrefix("api");

    try {
      const document = createOpenApiDocument(app);
      const clientsPath = document.paths["/api/clients"];
      const detailPath = document.paths["/api/clients/{id}"];
      const archivePath = document.paths["/api/clients/{id}/archive"];

      assert.ok(clientsPath?.get);
      assert.ok(clientsPath.post);
      assert.ok(detailPath?.get);
      assert.ok(detailPath.patch);
      assert.ok(detailPath.delete);
      assert.ok(archivePath?.post);
      assert.deepEqual(clientsPath.post.security, [{ bearer: [], tenant: [] }]);

      const createSchema = getJsonBodySchema(clientsPath.post.requestBody);
      assert.equal(createSchema.oneOf?.length, 2);
      assert.equal(createSchema.discriminator?.propertyName, "type");

      const updateSchema = getJsonBodySchema(detailPath.patch.requestBody);
      assert.equal(updateSchema.anyOf?.length, 5);
      assert.equal(updateSchema.minProperties, 1);

      const queryNames = (clientsPath.get.parameters ?? []).map((parameter) =>
        "$ref" in parameter ? parameter.$ref : parameter.name
      );
      assert.deepEqual(queryNames, [
        "search",
        "type",
        "status",
        "limit",
        "cursor",
        "sort",
        "order"
      ]);

      const idParameter = detailPath.get.parameters?.[0];
      assert.ok(idParameter && !("$ref" in idParameter));
      assert.equal(asSchema(idParameter.schema).format, "uuid");

      const schemas = document.components?.schemas ?? {};
      assert.deepEqual(asSchema(schemas.ClientType).enum, ["human", "legal_entity"]);
      assert.deepEqual(asSchema(schemas.ClientStatus).enum, ["active", "inactive", "archived"]);
      assert.deepEqual(asSchema(schemas.MutableClientStatus).enum, ["active", "inactive"]);
      assert.doesNotMatch(JSON.stringify(createSchema), /tenantId/);
      assert.doesNotMatch(JSON.stringify(updateSchema), /tenantId/);

      const detailSchema = schemas.ClientDetailDto;
      assert.ok(detailSchema && "properties" in detailSchema);
      assert.equal(asSchema(detailSchema.properties?.createdAt).format, "date-time");
      assert.equal(asSchema(detailSchema.properties?.updatedAt).format, "date-time");

      const listSchema = schemas.ClientsListResponseDto;
      assert.ok(listSchema && "properties" in listSchema);
      assert.ok(listSchema.properties?.metrics);

      const archiveSchema = schemas.ClientArchiveResponseDto;
      assert.ok(archiveSchema && "properties" in archiveSchema);
      assert.deepEqual(asSchema(archiveSchema.properties?.clientStatus).enum, ["archived"]);
      assert.deepEqual(asSchema(archiveSchema.properties?.status).enum, ["ok"]);

      const deleteSchema = schemas.ClientDeleteResponseDto;
      assert.ok(deleteSchema && "properties" in deleteSchema);
      assert.deepEqual(asSchema(deleteSchema.properties?.clientStatus).enum, ["deleted"]);
      assert.deepEqual(asSchema(deleteSchema.properties?.status).enum, ["ok"]);
    } finally {
      await app.close();
    }
  });
});

function getJsonBodySchema(requestBody: unknown) {
  assert.ok(requestBody && typeof requestBody === "object" && "content" in requestBody);
  const content = (requestBody as { content: Record<string, { schema?: Record<string, unknown> }> })
    .content;
  const schema = content["application/json"]?.schema;
  assert.ok(schema);
  return schema as {
    anyOf?: unknown[];
    discriminator?: { propertyName?: string };
    minProperties?: number;
    oneOf?: unknown[];
  };
}

function asSchema(value: unknown) {
  assert.ok(value && typeof value === "object" && !("$ref" in value));
  return value as {
    enum?: unknown[];
    format?: string;
  };
}
