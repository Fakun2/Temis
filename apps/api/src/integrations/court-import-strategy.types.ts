import type { Prisma } from "@prisma/client";
import type { SaePreviewInput, SaePreviewItemDto } from "./sae.schemas";

export type CourtImportCredentials = SaePreviewInput;

export type NormalizedCourtImportItem = SaePreviewItemDto & {
  description: string;
  rawPayload: Prisma.InputJsonValue;
  source: string;
};

export interface CourtImportStrategy {
  readonly source: string;
  preview(input: CourtImportCredentials): Promise<NormalizedCourtImportItem[]>;
}
