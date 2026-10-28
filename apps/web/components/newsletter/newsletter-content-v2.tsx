"use client";

import { type CSSProperties } from "react";
import { z } from "zod";
import { useTheme } from "@/lib/theme/theme-provider";
import { isSafeNewsletterHref } from "./newsletter-utils";

import type { NewsletterBlock, NewsletterContent, NewsletterFont } from "./newsletter-types";
import { RichTextView } from "./newsletter-rich-text";
import {
  BackgroundSection,
  Chart,
  DrawingCanvas,
  MediaImage,
  Video,
  mediaClass
} from "./newsletter-media-view";
import type { NewsletterBlockV2 } from "./newsletter-types";
export type * from "./newsletter-types";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const contentSchema = z.union([
  z.object({
    version: z.literal(1),
    blocks: z.array(z.object({ type: z.string() }).passthrough()).min(1)
  }),
  z.object({
    version: z.literal(2),
    theme: z.object({
      width: z.enum(["compact", "standard", "wide"]),
      fontFamily: z.enum(["sans", "serif", "mono"]),
      backgroundColor: hex,
      textColor: hex,
      accentColor: hex
    }),
    blocks: z
      .array(
        z
          .object({
            type: z.enum([
              "richText",
              "image",
              "gif",
              "callout",
              "metrics",
              "chart",
              "video",
              "drawing",
              "cta",
              "separator"
            ])
          })
          .passthrough()
      )
      .min(1)
  })
]);
export function isNewsletterContentValid(content: unknown): content is NewsletterContent {
  return contentSchema.safeParse(content).success;
}

const fontMap: Record<NewsletterFont, string> = {
  sans: "var(--font-sans)",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  mono: "var(--font-mono)"
};
const widthMap = { compact: "640px", standard: "720px", wide: "880px" } as const;

export function NewsletterContentView({
  content,
  assetPrefix,
  title,
  excerpt,
  appearance,
  compactPadding = false
}: {
  content: NewsletterContent | null;
  assetPrefix: string;
  title?: string;
  excerpt?: string;
  appearance?: "light" | "dark";
  compactPadding?: boolean;
}) {
  const { isDark } = useTheme();
  const dark = appearance ? appearance === "dark" : isDark;
  if (!content || !Array.isArray(content.blocks))
    return <p role="alert">No se pudo mostrar el contenido de esta publicación.</p>;
  const style: CSSProperties | undefined =
    content.version === 2
      ? {
          backgroundColor: dark ? "#292929" : "#ffffff",
          color: dark ? "#f1f1f1" : "#071827",
          fontFamily: fontMap[content.theme.fontFamily],
          maxWidth: widthMap[content.theme.width],
          ["--newsletter-accent" as string]: dark ? "#8998df" : "#073061"
        }
      : undefined;
  const sectionBlocks = (section: "header" | "footer") =>
    content.version === 2
      ? content.blocks.filter(
          (block): block is Extract<NewsletterBlockV2, { type: "image" | "gif" | "video" }> =>
            (block.type === "image" || block.type === "gif" || block.type === "video") &&
            block.section === section
        )
      : [];
  const headerHasBackground = sectionBlocks("header").some((block) => block.background);
  const footerHasBackground = sectionBlocks("footer").some((block) => block.background);
  const renderSection = (section: "header" | "footer") => {
    if (content.version !== 2) return null;
    const blocks = sectionBlocks(section);
    const background = blocks.find((block) => block.background);
    const document = content[section];
    const children = (
      <>
        {document ? <RichTextView document={document} /> : null}
        {blocks
          .filter((block) => !block.background)
          .map((block, index) => (
            <Block key={index} block={block} assetPrefix={assetPrefix} />
          ))}
      </>
    );
    return background ? (
      <div className={compactPadding ? "-mx-2 sm:-mx-3" : "-mx-5 sm:-mx-8"}>
        <BackgroundSection block={background} assetPrefix={assetPrefix}>
          {children}
        </BackgroundSection>
      </div>
    ) : (
      children
    );
  };
  return (
    <div
      className={
        content.version === 2
          ? `mx-auto grid w-full gap-4 overflow-hidden rounded-2xl ${compactPadding ? "px-2 sm:px-3" : "px-5 sm:px-8"} ${headerHasBackground ? "pt-0" : "pt-5 sm:pt-8"} ${footerHasBackground ? "pb-0" : "pb-5 sm:pb-8"}`
          : "grid gap-6"
      }
      style={style}
    >
      {renderSection("header")}
      {title || excerpt ? (
        <header>
          {title ? (
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          ) : null}
          {content.version === 2 && content.description ? (
            <div className="mt-2">
              <RichTextView document={content.description} />
            </div>
          ) : excerpt ? (
            <p className="mt-2 text-base opacity-70">{excerpt}</p>
          ) : null}
        </header>
      ) : null}
      {content.blocks
        .filter((block) => !("section" in block) || !block.section || block.section === "body")
        .map((block, index) => (
          <Block key={index} block={block} assetPrefix={assetPrefix} />
        ))}
      {renderSection("footer")}
    </div>
  );
}

function Block({ block, assetPrefix }: { block: NewsletterBlock; assetPrefix: string }) {
  switch (block.type) {
    case "richText":
      return <RichTextView document={block.document} />;
    case "heading":
      return <h2 className="text-2xl font-semibold tracking-tight">{block.text}</h2>;
    case "paragraph":
      return <p className="whitespace-pre-wrap leading-7 opacity-80">{block.text}</p>;
    case "list":
      return (
        <ul className="list-disc space-y-2 pl-6 leading-7">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "image":
    case "gif":
      return <MediaImage block={block} assetPrefix={assetPrefix} />;
    case "callout":
      return "document" in block ? (
        <aside
          className={`rounded-2xl border p-5 leading-7 ${block.tone === "warning" ? "border-amber-500/30 bg-amber-500/10" : block.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "border-current/20 bg-current/[0.05]"}`}
        >
          <RichTextView document={block.document} />
        </aside>
      ) : (
        <aside className="rounded-2xl border border-primary/20 bg-primary/10 p-5 leading-7">
          {block.text}
        </aside>
      );
    case "metrics":
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-current/15 bg-current/[0.03] p-4">
              <p className="text-2xl font-semibold">{item.value}</p>
              <p className="mt-1 text-sm opacity-70">{item.label}</p>
            </div>
          ))}
        </div>
      );
    case "chart":
      return <Chart block={block} />;
    case "video":
      return (
        <div className={"width" in block ? mediaClass(block) : "w-full"}>
          <Video block={block} />
        </div>
      );
    case "drawing":
      return <DrawingCanvas drawing={block} />;
    case "cta":
      return isSafeNewsletterHref(block.url) ? (
        <div className={"align" in block ? alignFlex(block.align) : "flex"}>
          <a
            href={block.url}
            {...(block.url.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="w-fit rounded-xl bg-[var(--newsletter-accent,var(--primary))] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            {block.label}
          </a>
        </div>
      ) : (
        <span className="text-sm opacity-70">Enlace no disponible</span>
      );
    case "separator":
      return <hr className="border-current/20" />;
  }
}

function alignFlex(align: "left" | "center" | "right") {
  return align === "center"
    ? "flex justify-center"
    : align === "right"
      ? "flex justify-end"
      : "flex justify-start";
}
