import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const platformAccountProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(30).optional()
  )
});

const platformAccountPasswordSchema = z
  .object({
    currentPassword: z.string().max(72).optional(),
    newPassword: z
      .string()
      .min(16, "La nueva contrasena debe tener al menos 16 caracteres.")
      .max(72, "La nueva contrasena no puede superar 72 caracteres.")
      .regex(/[A-Za-z]/, "La nueva contrasena debe incluir al menos una letra.")
      .regex(/[0-9]/, "La nueva contrasena debe incluir al menos un numero.")
  })
  .refine((value) => !value.currentPassword || value.currentPassword !== value.newPassword, {
    message: "La nueva contrasena no puede ser igual a la actual.",
    path: ["newPassword"]
  });

const listPlatformUsersQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(120).optional()
  ),
  sortBy: z.enum(["name", "status", "lastLoginAt", "createdAt"]).default("createdAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["active", "inactive"]).optional()
});

export class UpdatePlatformAccountProfileDto extends createZodDto(platformAccountProfileSchema) {
  @ApiProperty({ example: "Mateo" })
  firstName!: string;

  @ApiProperty({ example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ required: false, nullable: true, example: "+54 11 5555-5555" })
  phone?: string;
}

export class UpdatePlatformAccountPasswordDto extends createZodDto(platformAccountPasswordSchema) {
  @ApiProperty({ required: false, maxLength: 72, example: "password123" })
  currentPassword?: string;

  @ApiProperty({ minLength: 16, maxLength: 72 })
  newPassword!: string;
}

export type UpdatePlatformAccountProfileInput = z.infer<typeof platformAccountProfileSchema>;
export type UpdatePlatformAccountPasswordInput = z.infer<typeof platformAccountPasswordSchema>;
export type ListPlatformUsersQuery = z.infer<typeof listPlatformUsersQuerySchema>;

export class PlatformMeDto {
  @ApiProperty({ example: "super_admin" })
  role!: "super_admin";

  @ApiProperty({
    example: ["platform:access", "platform:observability:read", "platform:users:read"]
  })
  permissions!: string[];
}

export class PlatformAccountDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Mateo" })
  firstName!: string;

  @ApiProperty({ example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@temis.com" })
  email!: string;

  @ApiProperty({ nullable: true, type: String })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl!: string | null;

  @ApiProperty({ example: true })
  hasPassword!: boolean;
}

export class PlatformObservabilitySummaryDto {
  @ApiProperty({ example: "healthy", enum: ["healthy", "degraded", "unavailable"] })
  status!: "healthy" | "degraded" | "unavailable";

  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: [Object] })
  checks!: Array<{
    name: string;
    status: "healthy" | "degraded" | "unavailable";
    latencyMs: number | null;
  }>;

  @ApiProperty({ type: Object })
  outbox!: { failed: number | null; oldestPendingAt: string | null; pending: number | null };

  @ApiProperty({ required: false, nullable: true, type: Object })
  requests!: {
    averageLatencyMs: number | null;
    clientErrorRate: number | null;
    errorRate: number | null;
    p95LatencyMs: number | null;
    servedRate: number | null;
    total: number;
    windowMinutes: number;
  } | null;
}

export class PlatformObservabilityHistoryDayDto {
  @ApiProperty({ example: "2026-10-22", format: "date" })
  date!: string;

  @ApiProperty({ enum: ["healthy", "degraded", "unavailable", "no_data"] })
  status!: "healthy" | "degraded" | "unavailable" | "no_data";

  @ApiProperty({ example: 288 })
  samples!: number;

  @ApiProperty({ example: 99.65, nullable: true, type: Number })
  uptimePercent!: number | null;
}

export class PlatformObservabilityHistoryComponentDto {
  @ApiProperty({ enum: ["api", "postgresql", "redis", "rabbitmq", "worker"] })
  key!: "api" | "postgresql" | "redis" | "rabbitmq" | "worker";

  @ApiProperty({ example: "PostgreSQL" })
  name!: string;

  @ApiProperty({ enum: ["healthy", "degraded", "unavailable", "no_data"] })
  currentStatus!: "healthy" | "degraded" | "unavailable" | "no_data";

  @ApiProperty({ example: 12, nullable: true, type: Number })
  currentLatencyMs!: number | null;

  @ApiProperty({ example: 99.97, nullable: true, type: Number })
  uptimePercent!: number | null;

  @ApiProperty({ type: [PlatformObservabilityHistoryDayDto] })
  days!: PlatformObservabilityHistoryDayDto[];
}

export class PlatformObservabilityHistoryDto {
  @ApiProperty({ example: 30 })
  days!: number;

  @ApiProperty({ example: "2026-09-23", format: "date" })
  from!: string;

  @ApiProperty({ example: "2026-10-22", format: "date" })
  to!: string;

  @ApiProperty({ example: "America/Argentina/Buenos_Aires" })
  timeZone!: string;

  @ApiProperty({ example: "2026-10-22T12:00:00.000Z", format: "date-time" })
  generatedAt!: string;

  @ApiProperty({ type: [PlatformObservabilityHistoryComponentDto] })
  components!: PlatformObservabilityHistoryComponentDto[];
}

export class PlatformDashboardUsersDto {
  @ApiProperty({ example: 88 })
  active!: number;

  @ApiProperty({ example: 6 })
  inactive!: number;

  @ApiProperty({ example: 94 })
  total!: number;
}

export class PlatformDashboardSummaryDto {
  @ApiProperty({ type: PlatformDashboardUsersDto })
  users!: PlatformDashboardUsersDto;

  @ApiProperty({ example: "2026-10-14T12:00:00.000Z" })
  generatedAt!: string;
}

export class ListPlatformUsersQueryDto extends createZodDto(listPlatformUsersQuerySchema) {}

export class PlatformUserDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Ana Perez" })
  fullName!: string;

  @ApiProperty({ example: "ana@estudio.com" })
  email!: string;

  @ApiProperty({ enum: ["active", "inactive"] })
  status!: "active" | "inactive";

  @ApiProperty({
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        peopleCount: { type: "number" },
        status: { type: "string", enum: ["active", "inactive"] }
      },
      required: ["id", "name", "peopleCount", "status"]
    }
  })
  foundedTenants!: Array<{
    id: string;
    name: string;
    peopleCount: number;
    status: "active" | "inactive";
  }>;

  @ApiProperty({ example: 12 })
  peopleCount!: number;

  @ApiProperty({ nullable: true, type: String, format: "date-time" })
  lastLoginAt!: Date | null;

  @ApiProperty({ type: String, format: "date-time" })
  createdAt!: Date;
}

export class PlatformUsersPageInfoDto {
  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;
}

export class PlatformUsersListDto {
  @ApiProperty({ type: [PlatformUserDto] })
  items!: PlatformUserDto[];

  @ApiProperty({ type: PlatformUsersPageInfoDto })
  pageInfo!: PlatformUsersPageInfoDto;
}
