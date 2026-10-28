import type {
  NewsletterBlockV1,
  NewsletterBlockV2,
  NewsletterContent,
  NewsletterContentV1,
  NewsletterContentV2,
  RichTextDocument
} from "@/components/newsletter/newsletter-types";

import type { Draft, Newsletter } from "../_types/newsletter";
export type {
  Draft,
  Newsletter,
  BuilderPanel,
  MediaKind,
  MediaSection,
  MediaBlock
} from "../_types/newsletter";

export { endpoint, blockLabels, categories } from "../_constants/newsletter";

export function emptyDocument(text = "Escribí tu contenido…"): RichTextDocument {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: text ? [{ type: "text", text }] : [] }]
  };
}
export function hasText(document: RichTextDocument | undefined): boolean {
  const walk = (node: { text?: string; content?: RichTextDocument["content"] }): boolean =>
    Boolean(node.text?.trim() || node.content?.some(walk));
  return document ? walk(document) : false;
}
export function newBlock(type: NewsletterBlockV2["type"]): NewsletterBlockV2 {
  if (type === "richText") return { type, document: emptyDocument("") };
  if (type === "image" || type === "gif")
    return { type, assetId: "", alt: "", caption: "", width: "full", align: "center" };
  if (type === "callout")
    return { type, document: emptyDocument("Contenido destacado"), tone: "info" };
  if (type === "metrics") return { type, items: [{ value: "100%", label: "Métrica" }] };
  if (type === "chart")
    return {
      type,
      title: "Nuevo gráfico",
      chartType: "bar",
      data: [{ label: "Dato", value: 1, color: "#7c3aed" }],
      showLegend: true,
      showLabels: true,
      align: "left"
    };
  if (type === "video")
    return { type, provider: "youtube", videoId: "", title: "", width: "full", align: "center" };
  if (type === "drawing")
    return { type, width: 880, height: 440, backgroundColor: "#ffffff", alt: "", strokes: [] };
  if (type === "cta") return { type, label: "Conocer más", url: "/admin", align: "left" };
  return { type: "separator" };
}
export function migrateContent(content: NewsletterContent | null): NewsletterContentV2 {
  if (content?.version === 2) {
    const result = structuredClone(content);
    if (!result.blocks.length)
      result.blocks.push({ type: "richText", document: emptyDocument("") });
    return result;
  }
  const source: NewsletterContentV1 = content?.version === 1 ? content : { version: 1, blocks: [] };
  return {
    version: 2,
    theme: {
      width: "standard",
      fontFamily: "sans",
      backgroundColor: "#ffffff",
      textColor: "#071827",
      accentColor: "#073061"
    },
    blocks: source.blocks.length
      ? source.blocks.map(migrateBlock)
      : [{ type: "richText", document: emptyDocument("") }]
  };
}
function migrateBlock(block: NewsletterBlockV1): NewsletterBlockV2 {
  if (block.type === "heading")
    return {
      type: "richText",
      document: {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2, textAlign: "left" },
            content: [{ type: "text", text: block.text }]
          }
        ]
      }
    };
  if (block.type === "paragraph") return { type: "richText", document: emptyDocument(block.text) };
  if (block.type === "list")
    return {
      type: "richText",
      document: {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: block.items.map((item) => ({
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: item }] }]
            }))
          }
        ]
      }
    };
  if (block.type === "image") return { ...block, width: "full", align: "center" };
  if (block.type === "callout")
    return { type: "callout", document: emptyDocument(block.text), tone: "info" };
  if (block.type === "chart")
    return {
      ...block,
      data: block.data.map((point) => ({ ...point, color: "#7c3aed" })),
      showLegend: true,
      showLabels: true,
      align: "left"
    };
  if (block.type === "video") return { ...block, width: "full", align: "center" };
  if (block.type === "cta") return { ...block, align: "left" };
  if (block.type === "metrics") return { type: "metrics", items: block.items };
  return { type: "separator" };
}
export function toLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
export function toIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}
export function validateDraft(draft: Draft): string | null {
  if (!draft.title.trim() || !draft.excerpt.trim() || !draft.content.blocks.length)
    return "Completá el título, resumen y al menos un bloque.";
  if (draft.excerpt.length > 500) return "El resumen no puede superar los 500 caracteres.";
  return null;
}
export function moveNewsletterBlock(blocks: NewsletterBlockV2[], index: number, offset: number) {
  const target = index + offset;
  if (index < 0 || index >= blocks.length || target < 0 || target >= blocks.length) return blocks;
  const result = [...blocks];
  [result[index], result[target]] = [result[target]!, result[index]!];
  return result;
}
export function lifecycle(item: Pick<Newsletter, "status" | "startsAt" | "endsAt">) {
  if (item.status === "cancelled") return "Cancelada";
  if (item.status === "draft") return "Borrador";
  if (!item.startsAt) return "Inactiva";
  if (item.startsAt && new Date(item.startsAt) > new Date()) return "Programada";
  if (item.endsAt && new Date(item.endsAt) <= new Date()) return "Expirada";
  return "Publicada";
}

export function clearSectionBackgrounds(
  blocks: NewsletterBlockV2[],
  block: NewsletterBlockV2
): NewsletterBlockV2[] {
  if (!("background" in block) || !block.background) return blocks;
  return blocks.map((old) =>
    "background" in old && old.background && old.section === block.section
      ? { ...old, background: false }
      : old
  );
}

export function isNewsletterCanvasEmpty(item: Newsletter): boolean {
  const canvas = item.content;
  if (!canvas) return true;
  const noBlocks =
    !canvas ||
    canvas.blocks.every((block) => block.type === "richText" && !hasText(block.document));
  const noSections =
    !canvas ||
    canvas.version !== 2 ||
    (!hasText(canvas.header) && !hasText(canvas.description) && !hasText(canvas.footer));
  return (
    noBlocks &&
    noSections &&
    !item.excerpt?.trim() &&
    (!item.title.trim() || item.title === "Newsletter sin título")
  );
}
