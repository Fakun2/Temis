import { ApiProperty } from "@nestjs/swagger";

export type PublicHealthComponent = "authentication" | "documents" | "async-processing";
export type PublicHealthStatus = "operational" | "unavailable";

export class PublicHealthResponseDto {
  @ApiProperty({ enum: ["authentication", "documents", "async-processing"] })
  component!: PublicHealthComponent;

  @ApiProperty({ example: "2026-10-24T15:30:00.000Z" })
  checkedAt!: string;

  @ApiProperty({ enum: ["operational", "unavailable"] })
  status!: PublicHealthStatus;
}
