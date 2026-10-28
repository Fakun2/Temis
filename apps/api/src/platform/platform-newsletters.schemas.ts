import { ApiProperty } from "@nestjs/swagger";
import type { SchemaObject } from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Usá un color hexadecimal válido.");
const fontFamily = z.enum(["sans", "serif", "mono"]);
const textAlign = z.enum(["left", "center", "right", "justify"]);
const fontSize = z.enum(["12px", "14px", "16px", "18px", "20px", "24px", "32px", "40px", "48px"]);
const safeLink = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Usá una ruta interna o un enlace HTTPS.");
const point = z
  .object({ label: text(80), value: z.number().finite().min(-1e12).max(1e12) })
  .strict();
export const newsletterBlockV1Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), text: text(180) }).strict(),
  z.object({ type: z.literal("paragraph"), text: text(4000) }).strict(),
  z.object({ type: z.literal("list"), items: z.array(text(500)).min(1).max(30) }).strict(),
  z
    .object({
      type: z.literal("image"),
      assetId: z.string().uuid(),
      alt: text(300),
      caption: z.string().trim().max(300).default("")
    })
    .strict(),
  z.object({ type: z.literal("callout"), text: text(1000) }).strict(),
  z
    .object({
      type: z.literal("metrics"),
      items: z
        .array(z.object({ label: text(80), value: text(80) }).strict())
        .min(1)
        .max(4)
    })
    .strict(),
  z
    .object({
      type: z.literal("chart"),
      title: text(120),
      chartType: z.enum(["bar", "line", "donut"]),
      data: z.array(point).min(1).max(30)
    })
    .strict(),
  z
    .object({
      type: z.literal("video"),
      provider: z.enum(["youtube", "vimeo"]),
      videoId: z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/),
      title: text(150)
    })
    .strict(),
  z.object({ type: z.literal("cta"), label: text(80), url: safeLink }).strict(),
  z.object({ type: z.literal("separator") }).strict()
]);
export const newsletterContentV1Schema = z
  .object({ version: z.literal(1), blocks: z.array(newsletterBlockV1Schema).max(60) })
  .strict()
  .superRefine((content, ctx) => {
    content.blocks.forEach((block, index) => {
      if (
        block.type === "video" &&
        !(block.provider === "vimeo"
          ? /^\d+$/.test(block.videoId)
          : /^[a-zA-Z0-9_-]{11}$/.test(block.videoId))
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "videoId"],
          message: "ID de video inválido."
        });
      }
      if (
        block.type === "chart" &&
        block.chartType === "donut" &&
        block.data.some((point) => point.value < 0)
      )
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "data"],
          message: "Los valores de una dona no pueden ser negativos."
        });
    });
  });

const richMarkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).strict(),
  z.object({ type: z.literal("italic") }).strict(),
  z.object({ type: z.literal("underline") }).strict(),
  z.object({ type: z.literal("strike") }).strict(),
  z.object({ type: z.literal("link"), attrs: z.object({ href: safeLink }).strict() }).strict(),
  z
    .object({ type: z.literal("highlight"), attrs: z.object({ color: hexColor }).strict() })
    .strict(),
  z
    .object({
      type: z.literal("textStyle"),
      attrs: z
        .object({
          color: hexColor.nullish(),
          backgroundColor: hexColor.nullish(),
          fontFamily: fontFamily.nullish(),
          fontSize: fontSize.nullish()
        })
        .strict()
    })
    .strict()
]);

const richNodeSchema: z.ZodType<unknown> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z
      .object({
        type: z.literal("text"),
        text: z.string().max(4000),
        marks: z.array(richMarkSchema).max(8).optional()
      })
      .strict(),
    z.object({ type: z.literal("hardBreak") }).strict(),
    z
      .object({
        type: z.literal("paragraph"),
        attrs: z.object({ textAlign: textAlign.nullish() }).strict().optional(),
        content: z.array(richNodeSchema).max(200).optional()
      })
      .strict(),
    z
      .object({
        type: z.literal("heading"),
        attrs: z
          .object({
            level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            textAlign: textAlign.nullish()
          })
          .strict(),
        content: z.array(richNodeSchema).max(200).optional()
      })
      .strict(),
    z.object({ type: z.literal("blockquote"), content: z.array(richNodeSchema).max(100) }).strict(),
    z
      .object({ type: z.literal("bulletList"), content: z.array(richNodeSchema).min(1).max(50) })
      .strict(),
    z
      .object({
        type: z.literal("orderedList"),
        attrs: z
          .object({ start: z.number().int().min(1).max(999).nullish() })
          .strict()
          .optional(),
        content: z.array(richNodeSchema).min(1).max(50)
      })
      .strict(),
    z
      .object({ type: z.literal("listItem"), content: z.array(richNodeSchema).min(1).max(20) })
      .strict()
  ])
);

export const richTextDocumentSchema = z
  .object({ type: z.literal("doc"), content: z.array(richNodeSchema).min(1).max(250) })
  .strict()
  .superRefine((document, ctx) => {
    let nodes = 0;
    let characters = 0;
    const visit = (node: unknown, depth: number) => {
      if (!node || typeof node !== "object") return;
      nodes += 1;
      if (depth > 12)
        ctx.addIssue({ code: "custom", message: "El contenido tiene demasiados niveles." });
      const record = node as { text?: unknown; content?: unknown };
      if (typeof record.text === "string") characters += record.text.length;
      if (Array.isArray(record.content)) record.content.forEach((child) => visit(child, depth + 1));
    };
    document.content.forEach((node) => visit(node, 1));
    if (nodes > 1200)
      ctx.addIssue({ code: "custom", message: "El contenido tiene demasiados nodos." });
    if (characters > 40_000)
      ctx.addIssue({
        code: "custom",
        message: "El contenido supera el máximo de texto permitido."
      });
  });

const drawingPointSchema = z
  .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
  .strict();
const drawingStrokeSchema = z
  .object({
    tool: z.enum(["pencil", "highlighter", "eraser"]),
    color: hexColor,
    width: z.number().min(1).max(48),
    points: z.array(drawingPointSchema).min(1).max(2000)
  })
  .strict();
const mediaLayoutSchema = {
  width: z.enum(["small", "medium", "full"]).default("full"),
  align: z.enum(["left", "center", "right"]).default("center"),
  section: z.enum(["header", "body", "footer"]).optional(),
  background: z.boolean().optional()
};
const chartPointV2Schema = point.extend({ color: hexColor.optional() }).strict();

export const newsletterBlockV2Schema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("richText"), document: richTextDocumentSchema }).strict(),
  z
    .object({
      type: z.literal("image"),
      assetId: z.string().uuid(),
      alt: text(300),
      caption: z.string().trim().max(300).default(""),
      ...mediaLayoutSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("gif"),
      assetId: z.string().uuid(),
      alt: text(300),
      caption: z.string().trim().max(300).default(""),
      ...mediaLayoutSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("callout"),
      document: richTextDocumentSchema,
      tone: z.enum(["info", "success", "warning"]).default("info")
    })
    .strict(),
  z
    .object({
      type: z.literal("metrics"),
      items: z
        .array(z.object({ label: text(80), value: text(80) }).strict())
        .min(1)
        .max(4)
    })
    .strict(),
  z
    .object({
      type: z.literal("chart"),
      title: text(120),
      chartType: z.enum(["bar", "line", "donut"]),
      data: z.array(chartPointV2Schema).min(1).max(30),
      showLegend: z.boolean().default(true),
      showLabels: z.boolean().default(true),
      align: z.enum(["left", "center", "right"]).default("left")
    })
    .strict(),
  z
    .object({
      type: z.literal("video"),
      provider: z.enum(["youtube", "vimeo"]),
      videoId: z.string().regex(/^[a-zA-Z0-9_-]{1,32}$/),
      title: text(150),
      ...mediaLayoutSchema
    })
    .strict(),
  z
    .object({
      type: z.literal("drawing"),
      width: z.number().int().min(320).max(1600),
      height: z.number().int().min(180).max(1000),
      backgroundColor: hexColor,
      alt: text(300),
      strokes: z.array(drawingStrokeSchema).max(200)
    })
    .strict(),
  z
    .object({
      type: z.literal("cta"),
      label: text(80),
      url: safeLink,
      align: z.enum(["left", "center", "right"]).default("left")
    })
    .strict(),
  z.object({ type: z.literal("separator") }).strict()
]);

export const newsletterContentV2Schema = z
  .object({
    version: z.literal(2),
    header: richTextDocumentSchema.optional(),
    description: richTextDocumentSchema.optional(),
    footer: richTextDocumentSchema.optional(),
    theme: z
      .object({
        width: z.enum(["compact", "standard", "wide"]),
        fontFamily,
        backgroundColor: hexColor,
        textColor: hexColor,
        accentColor: hexColor
      })
      .strict(),
    blocks: z.array(newsletterBlockV2Schema).max(60)
  })
  .strict()
  .superRefine((content, ctx) => {
    const backgrounds = new Set<string>();
    content.blocks.forEach((block, index) => {
      if ("background" in block && block.background) {
        if (block.section !== "header" && block.section !== "footer")
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index, "background"],
            message: "El fondo solo puede ubicarse en el encabezado o el pie."
          });
        else if (backgrounds.has(block.section))
          ctx.addIssue({
            code: "custom",
            path: ["blocks", index, "background"],
            message: "Solo se permite un fondo por sección."
          });
        else backgrounds.add(block.section);
      }
      if (
        block.type === "video" &&
        !(block.provider === "vimeo"
          ? /^\d+$/.test(block.videoId)
          : /^[a-zA-Z0-9_-]{11}$/.test(block.videoId))
      )
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "videoId"],
          message: "ID de video inválido."
        });
      if (
        block.type === "chart" &&
        block.chartType === "donut" &&
        block.data.some((item) => item.value < 0)
      )
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "data"],
          message: "Los valores de una dona no pueden ser negativos."
        });
      if (
        block.type === "drawing" &&
        block.strokes.reduce((total, stroke) => total + stroke.points.length, 0) > 50_000
      )
        ctx.addIssue({
          code: "custom",
          path: ["blocks", index, "strokes"],
          message: "El dibujo tiene demasiados puntos."
        });
    });
  });

export const newsletterContentSchema = z.union([
  newsletterContentV1Schema,
  newsletterContentV2Schema
]);
export const newsletterInputSchema = z
  .object({
    title: text(120),
    excerpt: text(500),
    newsletterCategory: z.enum(["release", "bugfix", "policy", "performance", "general"]),
    audience: z.enum(["all_tenants", "selected_tenants"]),
    targetTenantIds: z.array(z.string().uuid()).max(250).default([]),
    startsAt: z.string().datetime().nullable(),
    endsAt: z.string().datetime().nullable(),
    content: newsletterContentSchema
  })
  .strict()
  .superRefine((input, ctx) => {
    if (input.audience === "selected_tenants" && !input.targetTenantIds.length)
      ctx.addIssue({
        code: "custom",
        path: ["targetTenantIds"],
        message: "Seleccioná al menos un estudio."
      });
    if (input.startsAt && input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt))
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "La finalización debe ser posterior al inicio."
      });
  });

const stringProperty: SchemaObject = { type: "string" };
function blockSchema(type: string, properties: Record<string, SchemaObject>): SchemaObject {
  return {
    type: "object",
    additionalProperties: false,
    properties: { type: { type: "string", enum: [type] }, ...properties },
    required: [
      "type",
      ...Object.keys(properties).filter((key) => key !== "section" && key !== "background")
    ]
  };
}
const metricSchema: SchemaObject = {
  type: "object",
  additionalProperties: false,
  properties: { label: stringProperty, value: stringProperty },
  required: ["label", "value"]
};
const newsletterContentV1OpenApi: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["version", "blocks"],
  properties: {
    version: { type: "integer", enum: [1] },
    blocks: {
      type: "array",
      maxItems: 60,
      items: {
        oneOf: [
          blockSchema("heading", { text: stringProperty }),
          blockSchema("paragraph", { text: stringProperty }),
          blockSchema("list", {
            items: { type: "array", minItems: 1, maxItems: 30, items: stringProperty }
          }),
          blockSchema("image", {
            assetId: { type: "string", format: "uuid" },
            alt: stringProperty,
            caption: stringProperty
          }),
          blockSchema("callout", { text: stringProperty }),
          blockSchema("metrics", {
            items: { type: "array", minItems: 1, maxItems: 4, items: metricSchema }
          }),
          blockSchema("chart", {
            title: stringProperty,
            chartType: { type: "string", enum: ["bar", "line", "donut"] },
            data: {
              type: "array",
              minItems: 1,
              maxItems: 30,
              items: {
                type: "object",
                properties: { label: stringProperty, value: { type: "number" } },
                required: ["label", "value"],
                additionalProperties: false
              }
            }
          }),
          blockSchema("video", {
            provider: { type: "string", enum: ["youtube", "vimeo"] },
            videoId: stringProperty,
            title: stringProperty
          }),
          blockSchema("cta", { label: stringProperty, url: stringProperty }),
          blockSchema("separator", {})
        ]
      }
    }
  }
};
const richDocumentProperty: SchemaObject = {
  type: "object",
  description: "Documento Tiptap JSON limitado a los nodos y marcas admitidos.",
  required: ["type", "content"],
  properties: {
    type: { type: "string", enum: ["doc"] },
    content: { type: "array", items: { type: "object" } }
  }
};
const mediaProperties: Record<string, SchemaObject> = {
  assetId: { type: "string", format: "uuid" },
  alt: stringProperty,
  caption: stringProperty,
  width: { type: "string", enum: ["small", "medium", "full"] },
  align: { type: "string", enum: ["left", "center", "right"] },
  section: { type: "string", enum: ["header", "body", "footer"] },
  background: { type: "boolean" }
};
const newsletterContentV2OpenApi: SchemaObject = {
  type: "object",
  additionalProperties: false,
  required: ["version", "theme", "blocks"],
  properties: {
    version: { type: "integer", enum: [2] },
    header: richDocumentProperty,
    description: richDocumentProperty,
    footer: richDocumentProperty,
    theme: {
      type: "object",
      additionalProperties: false,
      required: ["width", "fontFamily", "backgroundColor", "textColor", "accentColor"],
      properties: {
        width: { type: "string", enum: ["compact", "standard", "wide"] },
        fontFamily: { type: "string", enum: ["sans", "serif", "mono"] },
        backgroundColor: stringProperty,
        textColor: stringProperty,
        accentColor: stringProperty
      }
    },
    blocks: {
      type: "array",
      maxItems: 60,
      items: {
        oneOf: [
          blockSchema("richText", { document: richDocumentProperty }),
          blockSchema("image", mediaProperties),
          blockSchema("gif", mediaProperties),
          blockSchema("callout", {
            document: richDocumentProperty,
            tone: { type: "string", enum: ["info", "success", "warning"] }
          }),
          blockSchema("metrics", {
            items: { type: "array", minItems: 1, maxItems: 4, items: metricSchema }
          }),
          blockSchema("chart", {
            title: stringProperty,
            chartType: { type: "string", enum: ["bar", "line", "donut"] },
            data: { type: "array", minItems: 1, maxItems: 30, items: { type: "object" } },
            showLegend: { type: "boolean" },
            showLabels: { type: "boolean" },
            align: { type: "string", enum: ["left", "center", "right"] }
          }),
          blockSchema("video", {
            provider: { type: "string", enum: ["youtube", "vimeo"] },
            videoId: stringProperty,
            title: stringProperty,
            width: { type: "string", enum: ["small", "medium", "full"] },
            align: { type: "string", enum: ["left", "center", "right"] },
            section: { type: "string", enum: ["header", "body", "footer"] },
            background: { type: "boolean" }
          }),
          blockSchema("drawing", {
            width: { type: "integer" },
            height: { type: "integer" },
            backgroundColor: stringProperty,
            alt: stringProperty,
            strokes: { type: "array", maxItems: 200, items: { type: "object" } }
          }),
          blockSchema("cta", {
            label: stringProperty,
            url: stringProperty,
            align: { type: "string", enum: ["left", "center", "right"] }
          }),
          blockSchema("separator", {})
        ]
      }
    }
  }
};
const newsletterContentOpenApi: SchemaObject = {
  oneOf: [newsletterContentV1OpenApi, newsletterContentV2OpenApi]
};
export class UpdateNewsletterDto extends createZodDto(newsletterInputSchema) {
  @ApiProperty() declare title: string;
  @ApiProperty() declare excerpt: string;
  @ApiProperty({ enum: ["release", "bugfix", "policy", "performance", "general"] })
  declare newsletterCategory: "release" | "bugfix" | "policy" | "performance" | "general";
  @ApiProperty({ enum: ["all_tenants", "selected_tenants"] }) declare audience:
    | "all_tenants"
    | "selected_tenants";
  @ApiProperty({ type: [String] }) declare targetTenantIds: string[];
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) declare startsAt:
    | string
    | null;
  @ApiProperty({ type: String, nullable: true, format: "date-time" }) declare endsAt: string | null;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    oneOf: newsletterContentOpenApi.oneOf as never,
    description: "Documento versionado de bloques editoriales."
  })
  declare content: z.infer<typeof newsletterContentSchema>;
}
export type NewsletterInput = z.infer<typeof newsletterInputSchema>;

export class NewsletterTargetDto {
  @ApiProperty({ format: "uuid" }) tenantId!: string;
}
export class NewsletterDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) excerpt!: string | null;
  @ApiProperty({ nullable: true, enum: ["release", "bugfix", "policy", "performance", "general"] })
  newsletterCategory!: string | null;
  @ApiProperty({ enum: ["all_tenants", "selected_tenants"] }) audience!: string;
  @ApiProperty({ enum: ["draft", "published", "cancelled"] }) status!: string;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) startsAt!: Date | null;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) endsAt!: Date | null;
  @ApiProperty() revision!: number;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    oneOf: newsletterContentOpenApi.oneOf as never,
    nullable: true
  })
  content!: unknown;
  @ApiProperty({ type: [NewsletterTargetDto], required: false }) targets?: NewsletterTargetDto[];
}
export class NewsletterListItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) excerpt!: string | null;
  @ApiProperty({ nullable: true, type: String }) newsletterCategory!: string | null;
  @ApiProperty() audience!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) startsAt!: Date | null;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) endsAt!: Date | null;
  @ApiProperty() revision!: number;
  @ApiProperty({ type: String, format: "date-time" }) createdAt!: Date;
}
export class NewsletterMetricsDto {
  @ApiProperty() total!: number;
  @ApiProperty() active!: number;
  @ApiProperty() inactive!: number;
  @ApiProperty() scheduled!: number;
}
export class NewsletterPageDto {
  @ApiProperty({ type: [NewsletterListItemDto] }) items!: NewsletterListItemDto[];
  @ApiProperty({ type: NewsletterMetricsDto }) metrics!: NewsletterMetricsDto;
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
export class NewsletterSummaryDto {
  @ApiProperty() unreadCount!: number;
  @ApiProperty({ type: String, nullable: true, format: "uuid" }) oldestUnreadId!: string | null;
  @ApiProperty({ type: String, nullable: true, format: "uuid" }) latestId!: string | null;
}
export class NewsletterReaderItemDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) excerpt!: string | null;
  @ApiProperty({ nullable: true, type: String }) newsletterCategory!: string | null;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) startsAt!: Date | null;
  @ApiProperty() revision!: number;
  @ApiProperty() isRead!: boolean;
}
export class NewsletterReaderPageDto {
  @ApiProperty({ type: [NewsletterReaderItemDto] }) items!: NewsletterReaderItemDto[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}
export class NewsletterReaderDetailDto {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ nullable: true, type: String }) excerpt!: string | null;
  @ApiProperty({ nullable: true, type: String }) newsletterCategory!: string | null;
  @ApiProperty({ nullable: true, type: String, format: "date-time" }) startsAt!: Date | null;
  @ApiProperty() revision!: number;
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    oneOf: newsletterContentOpenApi.oneOf as never,
    nullable: true
  })
  content!: unknown;
}
export class NewsletterAssetDto {
  @ApiProperty({ format: "uuid" }) id!: string;
}
export class NewsletterActionDto {
  @ApiProperty() status!: string;
}
