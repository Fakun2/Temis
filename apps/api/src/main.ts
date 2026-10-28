import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { json, urlencoded } from "express";
import { ZodValidationPipe } from "nestjs-zod";
import { AppModule } from "./app.module";
import { setupOpenApi } from "./openapi.setup";
import { createCorsOptions } from "./security/cors.config";
import { createGlobalRateLimitMiddleware } from "./security/rate-limit.middleware";
import { REDIS_CLIENT } from "./redis/redis.constants";
import { createRequestMetricsMiddleware } from "./platform/request-metrics";
import type Redis from "ioredis";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: "1mb" }));
  app.use(urlencoded({ extended: true, limit: "1mb" }));
  app.setGlobalPrefix("api");
  app.enableCors(createCorsOptions());
  app.use(createGlobalRateLimitMiddleware());
  app.use(createRequestMetricsMiddleware(app.get<Redis>(REDIS_CLIENT)));
  app.useGlobalPipes(new ZodValidationPipe());

  setupOpenApi(app);

  const port = Number(process.env.API_PORT ?? 3001);
  const host = process.env.API_HOST ?? "0.0.0.0";

  await app.listen(port, host);
}

void bootstrap();
