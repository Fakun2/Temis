import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle("TEMIS API")
    .setDescription("API del monolito modular TEMIS.")
    .setVersion("0.1.0")
    .addBearerAuth()
    .addApiKey(
      {
        type: "apiKey",
        name: "x-tenant-id",
        in: "header"
      },
      "tenant"
    )
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function setupOpenApi(app: INestApplication) {
  if (!shouldExposeOpenApi()) {
    return;
  }

  const document = createOpenApiDocument(app);
  SwaggerModule.setup("api/docs", app, document, {
    jsonDocumentUrl: "api/docs-json"
  });
}

function shouldExposeOpenApi() {
  return process.env.NODE_ENV !== "production";
}
