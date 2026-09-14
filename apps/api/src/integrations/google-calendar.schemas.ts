import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const googleCalendarSyncModeSchema = z.enum(["global", "custom"]);
export const googleCalendarSyncSourceSchema = z.enum([
  "all_hearings",
  "my_tasks",
  "my_area_tasks",
  "participating_hearings",
  "all_tasks"
]);
export const googleCalendarSyncPreferencesSchema = z
  .object({
    syncMode: googleCalendarSyncModeSchema,
    syncSources: z.array(googleCalendarSyncSourceSchema).max(5).default([])
  })
  .superRefine((input, ctx) => {
    if (input.syncMode === "custom" && input.syncSources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona al menos una fuente de sincronizacion.",
        path: ["syncSources"]
      });
    }
  });

export class GoogleCalendarSyncPreferencesDto extends createZodDto(
  googleCalendarSyncPreferencesSchema
) {}

export class GoogleCalendarStatusDto {
  @ApiProperty() connected!: boolean;
  @ApiPropertyOptional() status!: string | null;
  @ApiPropertyOptional() googleEmail!: string | null;
  @ApiPropertyOptional() calendarName!: string | null;
  @ApiPropertyOptional() lastSyncAt!: string | null;
  @ApiPropertyOptional() lastError!: string | null;
  @ApiProperty() activeEventCount!: number;
  @ApiProperty() requiresReauthorization!: boolean;
  @ApiProperty({ enum: ["global", "custom"] }) syncMode!: "global" | "custom";
  @ApiProperty({
    enum: ["all_hearings", "my_tasks", "my_area_tasks", "participating_hearings", "all_tasks"],
    isArray: true
  })
  syncSources!: string[];
}

export class GoogleCalendarOAuthStartDto {
  @ApiProperty() authorizationUrl!: string;
}
