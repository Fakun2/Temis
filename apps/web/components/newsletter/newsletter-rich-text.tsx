"use client";

import { Fragment, type ReactNode } from "react";
import type {
  NewsletterAlign,
  NewsletterFont,
  RichTextDocument,
  RichTextMark,
  RichTextNode
} from "./newsletter-types";
import { isSafeNewsletterHref } from "./newsletter-utils";

const fontMap: Record<NewsletterFont, string> = {
  sans: "var(--font-sans)",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  mono: "var(--font-mono)"
};

export function RichTextView({ document }: { document: RichTextDocument }) {
  return (
    <div className="newsletter-rich-text grid gap-3">
      {document.content?.map((node, index) => (
        <RichNodeView key={index} node={node} />
      ))}
    </div>
  );
}
function RichNodeView({ node }: { node: RichTextNode }): ReactNode {
  const children = node.content?.map((child, index) => <RichNodeView key={index} node={child} />);
  const align = safeAlign(node.attrs?.textAlign);
  if (node.type === "text") return applyMarks(node.text ?? "", node.marks ?? []);
  if (node.type === "hardBreak") return <br />;
  if (node.type === "paragraph")
    return (
      <p style={{ textAlign: align }} className="whitespace-pre-wrap leading-7">
        {children}
      </p>
    );
  if (node.type === "heading") {
    const level =
      node.attrs?.level === 1 || node.attrs?.level === 2 || node.attrs?.level === 3
        ? node.attrs.level
        : 2;
    const Tag = `h${level}` as "h1" | "h2" | "h3";
    return (
      <Tag
        style={{ textAlign: align }}
        className={
          level === 1
            ? "text-4xl font-bold"
            : level === 2
              ? "text-3xl font-semibold"
              : "text-2xl font-semibold"
        }
      >
        {children}
      </Tag>
    );
  }
  if (node.type === "blockquote")
    return (
      <blockquote className="border-l-4 border-[var(--newsletter-accent)] pl-4 italic opacity-85">
        {children}
      </blockquote>
    );
  if (node.type === "bulletList") return <ul className="list-disc space-y-1 pl-6">{children}</ul>;
  if (node.type === "orderedList")
    return (
      <ol
        start={typeof node.attrs?.start === "number" ? node.attrs.start : 1}
        className="list-decimal space-y-1 pl-6"
      >
        {children}
      </ol>
    );
  if (node.type === "listItem") return <li>{children}</li>;
  return null;
}
function applyMarks(text: string, marks: RichTextMark[]) {
  return marks.reduce<ReactNode>((child, mark, index) => {
    if (mark.type === "bold") return <strong key={index}>{child}</strong>;
    if (mark.type === "italic") return <em key={index}>{child}</em>;
    if (mark.type === "underline") return <u key={index}>{child}</u>;
    if (mark.type === "strike") return <s key={index}>{child}</s>;
    if (mark.type === "highlight")
      return (
        <mark key={index} style={{ backgroundColor: safeColor(mark.attrs?.color) }}>
          {child}
        </mark>
      );
    if (
      mark.type === "link" &&
      typeof mark.attrs?.href === "string" &&
      isSafeNewsletterHref(mark.attrs.href)
    )
      return (
        <a
          key={index}
          href={mark.attrs.href}
          className="underline"
          {...(mark.attrs.href.startsWith("/")
            ? {}
            : { target: "_blank", rel: "noopener noreferrer" })}
        >
          {child}
        </a>
      );
    if (mark.type === "textStyle")
      return (
        <span
          key={index}
          style={{
            color: safeColor(mark.attrs?.color),
            backgroundColor: safeColor(mark.attrs?.backgroundColor),
            fontFamily: safeFont(mark.attrs?.fontFamily),
            fontSize: safeFontSize(mark.attrs?.fontSize)
          }}
        >
          {child}
        </span>
      );
    return <Fragment key={index}>{child}</Fragment>;
  }, text);
}

function safeColor(value: unknown) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value) ? value : undefined;
}
function safeFont(value: unknown) {
  return value === "sans" || value === "serif" || value === "mono" ? fontMap[value] : undefined;
}
function safeFontSize(value: unknown) {
  return typeof value === "string" &&
    ["12px", "14px", "16px", "18px", "20px", "24px", "32px", "40px", "48px"].includes(value)
    ? value
    : undefined;
}
function safeAlign(value: unknown): NewsletterAlign | undefined {
  return value === "left" || value === "center" || value === "right" || value === "justify"
    ? value
    : undefined;
}
