import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import type { NormalizedCourtImportItem } from "./court-import-strategy.types";
import type {
  SaeImportInput,
  SaeImportItemDto,
  SaePreviewInput,
  SaePreviewItemDto
} from "./sae.schemas";
import { SaeTucumanImportStrategy } from "./sae-tucuman-import.strategy";

const importSessionTtlMs = 10 * 60 * 1000;
const importTransactionTimeoutMs = 120_000;
const importTransactionMaxWaitMs = 20_000;

type SaeImportSession = {
  expiresAt: Date;
  items: NormalizedCourtImportItem[];
  tenantId: string;
  userId: string;
};

@Injectable()
export class SaeImportService {
  private readonly sessions = new Map<string, SaeImportSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly saeTucumanStrategy: SaeTucumanImportStrategy
  ) {}

  async preview(tenantId: string, userId: string, input: SaePreviewInput) {
    const normalizedItems = await this.saeTucumanStrategy.preview(input);
    const items = await this.annotateImportActions(tenantId, normalizedItems);
    const importSessionId = randomUUID();
    const expiresAt = new Date(Date.now() + importSessionTtlMs);

    this.cleanupExpiredSessions();
    this.sessions.set(importSessionId, { expiresAt, items, tenantId, userId });

    return {
      expiresAt: expiresAt.toISOString(),
      importSessionId,
      items: items.map(toPreviewItemDto),
      summary: {
        createCount: items.filter((item) => item.action === "create").length,
        total: items.length,
        updateCount: items.filter((item) => item.action === "update").length,
        warningCount: items.filter((item) => item.warnings.length > 0).length
      }
    };
  }

  async commitImport(tenantId: string, userId: string, input: SaeImportInput) {
    const session = this.getSession(input.importSessionId, tenantId, userId);
    const selectedExternalIds = new Set(input.selectedExternalIds);
    const selectedItems = session.items.filter((item) => selectedExternalIds.has(item.externalId));

    if (selectedItems.length === 0) {
      throw new BadRequestException("No hay expedientes seleccionados para importar.");
    }

    const provinceIdsByText = await this.resolveProvinceIdsByText(selectedItems);
    const results = await this.prisma.runWithTenant(tenantId, async (tx) => {
      const items: SaeImportItemDto[] = [];

      for (const item of selectedItems) {
        items.push(await importCourtItem(tx, tenantId, userId, item, provinceIdsByText));
      }

      return items;
    }, {
      maxWait: importTransactionMaxWaitMs,
      timeout: importTransactionTimeoutMs
    });

    this.sessions.delete(input.importSessionId);

    return {
      importedCount: results.filter((item) => item.status === "imported").length,
      items: results,
      skippedCount: results.filter((item) => item.status === "skipped").length,
      updatedCount: results.filter((item) => item.status === "updated").length
    };
  }

  private getSession(importSessionId: string, tenantId: string, userId: string) {
    this.cleanupExpiredSessions();
    const session = this.sessions.get(importSessionId);

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("La busqueda SAE expiro. Ejecuta una nueva busqueda.");
    }

    if (session.tenantId !== tenantId || session.userId !== userId) {
      throw new ForbiddenException("La busqueda SAE no pertenece a esta sesion.");
    }

    return session;
  }

  private cleanupExpiredSessions() {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.expiresAt.getTime() < now) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private async annotateImportActions(tenantId: string, items: NormalizedCourtImportItem[]) {
    if (items.length === 0) {
      return [];
    }

    const [references, cases] = await Promise.all([
      this.prisma.caseExternalReference.findMany({
        where: {
          externalId: { in: items.map((item) => item.externalId) },
          source: { in: [...new Set(items.map((item) => item.source))] },
          tenantId
        },
        select: { externalId: true, source: true }
      }),
      this.prisma.case.findMany({
        where: {
          caseNumber: { in: items.map((item) => item.caseNumber) },
          tenantId
        },
        select: { caseNumber: true }
      })
    ]);
    const referenceKeys = new Set(
      references.map((reference) => toReferenceKey(reference.source, reference.externalId))
    );
    const existingCaseNumbers = new Set(cases.map((caseItem) => caseItem.caseNumber));

    return items.map((item) => ({
      ...item,
      action:
        referenceKeys.has(toReferenceKey(item.source, item.externalId)) ||
        existingCaseNumbers.has(item.caseNumber)
          ? ("update" as const)
          : ("create" as const)
    }));
  }

  private async resolveProvinceIdsByText(items: NormalizedCourtImportItem[]) {
    const provinceTexts = [
      ...new Set(
        items
          .map((item) => item.provinceText)
          .filter((provinceText): provinceText is string => Boolean(provinceText))
      )
    ];

    if (provinceTexts.length === 0) {
      return new Map<string, string>();
    }

    const expectedProvinces = new Set(provinceTexts.map(normalizeCatalogText));
    const provinces = await this.prisma.province.findMany({
      where: { active: true },
      select: { code: true, id: true, name: true, province: true }
    });
    const provinceIdsByText = new Map<string, string>();

    for (const province of provinces) {
      for (const value of [province.code, province.name, province.province]) {
        if (!value) {
          continue;
        }

        const normalizedValue = normalizeCatalogText(value);
        if (expectedProvinces.has(normalizedValue)) {
          provinceIdsByText.set(normalizedValue, province.id);
        }
      }
    }

    return provinceIdsByText;
  }
}

async function importCourtItem(
  tx: Prisma.TransactionClient,
  tenantId: string,
  userId: string,
  item: NormalizedCourtImportItem,
  provinceIdsByText: ReadonlyMap<string, string>
) {
  const existingReference = await tx.caseExternalReference.findUnique({
    where: {
      tenantId_source_externalId: {
        externalId: item.externalId,
        source: item.source,
        tenantId
      }
    },
    select: { caseId: true }
  });
  const existingCase = existingReference
    ? null
    : await tx.case.findUnique({
        where: {
          tenantId_caseNumber: {
            caseNumber: item.caseNumber,
            tenantId
          }
        },
        select: { id: true }
      });
  const caseId = existingReference?.caseId ?? existingCase?.id;
  const caseData = toCaseWriteData(item, provinceIdsByText);

  if (caseId) {
    await tx.case.update({
      data: caseData,
      where: { id: caseId }
    });
    await tx.caseExternalReference.upsert({
      create: {
        caseId,
        externalId: item.externalId,
        importedByUserId: userId,
        rawPayload: item.rawPayload,
        source: item.source,
        tenantId
      },
      update: {
        importedByUserId: userId,
        rawPayload: item.rawPayload
      },
      where: {
        tenantId_source_externalId: {
          externalId: item.externalId,
          source: item.source,
          tenantId
        }
      }
    });

    return {
      caseId,
      caseNumber: item.caseNumber,
      externalId: item.externalId,
      message: "Expediente actualizado desde SAE.",
      status: "updated" as const
    };
  }

  const createdCase = await tx.case.create({
    data: {
      ...caseData,
      caseNumber: item.caseNumber,
      caption: item.caption,
      tenantId
    },
    select: { id: true }
  });

  await tx.caseExternalReference.create({
    data: {
      caseId: createdCase.id,
      externalId: item.externalId,
      importedByUserId: userId,
      rawPayload: item.rawPayload,
      source: item.source,
      tenantId
    }
  });

  return {
    caseId: createdCase.id,
    caseNumber: item.caseNumber,
    externalId: item.externalId,
    message: "Expediente importado desde SAE.",
    status: "imported" as const
  };
}

function toCaseWriteData(
  item: NormalizedCourtImportItem,
  provinceIdsByText: ReadonlyMap<string, string>
) {
  const provinceId = item.provinceText
    ? provinceIdsByText.get(normalizeCatalogText(item.provinceText))
    : null;
  const data = {
    court: item.court,
    description: item.description,
    jurisdictionText: item.jurisdictionText,
    provinceText: item.provinceText,
    status: item.suggestedStatus,
    unitText: item.unitText
  };

  return provinceId ? { ...data, provinceId } : data;
}

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toPreviewItemDto(item: NormalizedCourtImportItem): SaePreviewItemDto {
  return {
    action: item.action,
    caption: item.caption,
    caseNumber: item.caseNumber,
    court: item.court,
    externalId: item.externalId,
    jurisdictionText: item.jurisdictionText,
    provinceText: item.provinceText,
    suggestedStatus: item.suggestedStatus,
    unitText: item.unitText,
    warnings: item.warnings
  };
}

function toReferenceKey(source: string, externalId: string) {
  return `${source}:${externalId}`;
}
