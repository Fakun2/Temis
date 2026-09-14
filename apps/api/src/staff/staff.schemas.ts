import { ApiProperty } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional()
);

const requiredName = z.string().trim().min(3).max(40);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dniSchema = z.preprocess(
  (value) => {
    if (typeof value === "string" && value.trim() === "") {
      return undefined;
    }

    return typeof value === "number" ? String(value) : value;
  },
  z.string().trim().regex(/^\d{7,8}$/).optional()
);
const phoneSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().regex(/^\d{0,15}$/).optional()
);
const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/)
  .regex(/[a-z]/)
  .regex(/[0-9]/)
  .regex(/[@#$\-_%]/);

export const listStaffQuerySchema = z.object({
  cursor: optionalTrimmedString,
  firstName: optionalTrimmedString,
  lastName: optionalTrimmedString,
  limit: z.coerce.number().int().min(1).max(50).default(6),
  practiceAreaId: optionalTrimmedString,
  role: optionalTrimmedString,
  sortBy: z.enum(["firstName", "lastName", "role", "status"]).default("lastName"),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  status: z.enum(["active", "invited", "suspended"]).optional()
});

export const listParticipantOptionsQuerySchema = z.object({
  cursor: optionalTrimmedString,
  limit: z.coerce.number().int().min(1).max(50).default(20),
  practiceAreaId: optionalTrimmedString,
  role: optionalTrimmedString,
  search: optionalTrimmedString.pipe(z.string().max(120).optional())
});

export const createStaffSchema = z.object({
  firstName: requiredName,
  lastName: requiredName,
  dni: dniSchema,
  email: z.string().trim().toLowerCase().regex(emailRegex),
  password: passwordSchema,
  role: z.string().trim().min(1),
  status: z.enum(["active", "suspended"]).default("active"),
  practiceAreaIds: z.array(z.string().uuid()).default([]),
  phone: phoneSchema,
  avatarUrl: optionalTrimmedString.pipe(z.string().url().optional())
});

export const updateStaffSchema = createStaffSchema
  .omit({ password: true })
  .extend({
    password: passwordSchema.optional()
  });

export class ListStaffQueryDto extends createZodDto(listStaffQuerySchema) {}
export class ListParticipantOptionsQueryDto extends createZodDto(listParticipantOptionsQuerySchema) {}

export class CreateStaffDto extends createZodDto(createStaffSchema) {
  @ApiProperty({ minLength: 3, maxLength: 50, example: "Mateo" })
  firstName!: string;

  @ApiProperty({ minLength: 3, maxLength: 50, example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ required: false, minLength: 7, maxLength: 8, example: "30111222" })
  dni?: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, example: "Abogado@123" })
  password!: string;

  @ApiProperty({ example: "lawyer" })
  role!: string;

  @ApiProperty({ enum: ["active", "suspended"], required: false, default: "active" })
  status!: "active" | "suspended";

  @ApiProperty({ required: false, type: [String], format: "uuid" })
  practiceAreaIds!: string[];

  @ApiProperty({ required: false, minLength: 0, maxLength: 15, example: "5491155555555" })
  phone?: string;

  @ApiProperty({ required: false, example: "https://cdn.temis.local/avatar.png" })
  avatarUrl?: string;
}

export class UpdateStaffDto extends createZodDto(updateStaffSchema) {
  @ApiProperty({ minLength: 3, maxLength: 50, example: "Mateo" })
  firstName!: string;

  @ApiProperty({ minLength: 3, maxLength: 50, example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ required: false, minLength: 7, maxLength: 8, example: "30111222" })
  dni?: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ required: false, minLength: 8, maxLength: 72, example: "Abogado@123" })
  password?: string;

  @ApiProperty({ example: "lawyer" })
  role!: string;

  @ApiProperty({ enum: ["active", "suspended"], required: false, default: "active" })
  status!: "active" | "suspended";

  @ApiProperty({ required: false, type: [String], format: "uuid" })
  practiceAreaIds!: string[];

  @ApiProperty({ required: false, minLength: 0, maxLength: 15, example: "5491155555555" })
  phone?: string;

  @ApiProperty({ required: false, example: "https://cdn.temis.local/avatar.png" })
  avatarUrl?: string;
}

export class StaffPracticeAreaDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Derecho Civil" })
  name!: string;

  @ApiProperty({ nullable: true, type: String, example: "Asuntos civiles y patrimoniales." })
  description!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "derecho-civil" })
  templateCode!: string | null;

  @ApiProperty({ example: false })
  custom!: boolean;
}

export class StaffRoleOptionDto {
  @ApiProperty({ example: "lawyer" })
  code!: string;

  @ApiProperty({ example: "Abogado" })
  name!: string;

  @ApiProperty({ nullable: true, type: String, example: "Gestiona expedientes, clientes y tareas." })
  description!: string | null;

  @ApiProperty({ required: false, example: true })
  assignable?: boolean;

  @ApiProperty({ required: false, example: 2 })
  hierarchyLevel?: 1 | 2 | 3;
}

export class StaffStatusOptionDto {
  @ApiProperty({ enum: ["active", "invited", "suspended"] })
  value!: "active" | "invited" | "suspended";

  @ApiProperty({ example: "Activo" })
  label!: string;
}

export class StaffWorkerDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  userId!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "Mateo" })
  firstName!: string;

  @ApiProperty({ example: "Alvarez" })
  lastName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ nullable: true, type: String, example: "30111222" })
  dni!: string | null;

  @ApiProperty({ nullable: true, type: String, example: "+54 11 5555-5555" })
  phone!: string | null;

  @ApiProperty({ nullable: true, type: StaffRoleOptionDto })
  role!: StaffRoleOptionDto | null;

  @ApiProperty({ enum: ["active", "invited", "suspended"] })
  status!: "active" | "invited" | "suspended";

  @ApiProperty({ type: [StaffPracticeAreaDto] })
  practiceAreas!: StaffPracticeAreaDto[];
}

export class StaffMetricsDto {
  @ApiProperty({ example: 8 })
  totalWorkers!: number;

  @ApiProperty({ example: 6 })
  activeWorkers!: number;

  @ApiProperty({ example: 4 })
  practiceAreasCount!: number;
}

export class StaffFilterOptionsDto {
  @ApiProperty({ type: [StaffPracticeAreaDto] })
  practiceAreas!: StaffPracticeAreaDto[];

  @ApiProperty({ type: [StaffRoleOptionDto] })
  roles!: StaffRoleOptionDto[];

  @ApiProperty({ type: [StaffStatusOptionDto] })
  statuses!: StaffStatusOptionDto[];
}

export class ParticipantFilterOptionsDto {
  @ApiProperty({ type: [StaffPracticeAreaDto] })
  practiceAreas!: StaffPracticeAreaDto[];

  @ApiProperty({ type: [StaffRoleOptionDto] })
  roles!: StaffRoleOptionDto[];
}

export class StaffPageInfoDto {
  @ApiProperty({ example: 6 })
  limit!: number;

  @ApiProperty({ nullable: true, type: String })
  nextCursor!: string | null;

  @ApiProperty({ example: false })
  hasNextPage!: boolean;
}

export class StaffListResponseDto {
  @ApiProperty({ type: [StaffWorkerDto] })
  workers!: StaffWorkerDto[];

  @ApiProperty({ type: StaffMetricsDto })
  metrics!: StaffMetricsDto;

  @ApiProperty({ type: StaffFilterOptionsDto })
  filterOptions!: StaffFilterOptionsDto;

  @ApiProperty({ type: StaffPageInfoDto })
  pageInfo!: StaffPageInfoDto;
}

export class ParticipantOptionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ example: "Mateo Alvarez" })
  fullName!: string;

  @ApiProperty({ example: "mateo@estudio.com" })
  email!: string;

  @ApiProperty({ nullable: true, type: StaffRoleOptionDto })
  role!: StaffRoleOptionDto | null;

  @ApiProperty({ type: [StaffPracticeAreaDto] })
  practiceAreas!: StaffPracticeAreaDto[];
}

export class ParticipantOptionsResponseDto {
  @ApiProperty({ type: [ParticipantOptionDto] })
  items!: ParticipantOptionDto[];

  @ApiProperty({ type: ParticipantFilterOptionsDto })
  filterOptions!: ParticipantFilterOptionsDto;

  @ApiProperty({ type: StaffPageInfoDto })
  pageInfo!: StaffPageInfoDto;
}

export class StaffCreateResponseDto extends StaffWorkerDto {}
export class StaffUpdateResponseDto extends StaffWorkerDto {}

export class StaffDeleteResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";
}

export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type ListParticipantOptionsQuery = z.infer<typeof listParticipantOptionsQuerySchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
