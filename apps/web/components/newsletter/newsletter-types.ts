export type NewsletterFont = "sans" | "serif" | "mono";
export type NewsletterAlign = "left" | "center" | "right" | "justify";
export type RichTextMark = {
  type: "bold" | "italic" | "underline" | "strike" | "link" | "highlight" | "textStyle";
  attrs?: Record<string, unknown>;
};
export type RichTextNode = {
  type:
    | "doc"
    | "paragraph"
    | "heading"
    | "blockquote"
    | "bulletList"
    | "orderedList"
    | "listItem"
    | "text"
    | "hardBreak";
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
  marks?: RichTextMark[];
  text?: string;
};
export type RichTextDocument = RichTextNode & { type: "doc"; content: RichTextNode[] };
export type DrawingStroke = {
  tool: "pencil" | "highlighter" | "eraser";
  color: string;
  width: number;
  points: { x: number; y: number }[];
};
export type MediaLayout = {
  width: "small" | "medium" | "full";
  align: "left" | "center" | "right";
  section?: "header" | "body" | "footer";
  background?: boolean;
};
export type ChartPoint = { label: string; value: number; color?: string };
export type NewsletterBlockV1 =
  | { type: "heading" | "paragraph" | "callout"; text: string }
  | { type: "list"; items: string[] }
  | { type: "image"; assetId: string; alt: string; caption: string }
  | { type: "metrics"; items: { label: string; value: string }[] }
  | { type: "chart"; title: string; chartType: "bar" | "line" | "donut"; data: ChartPoint[] }
  | { type: "video"; provider: "youtube" | "vimeo"; videoId: string; title: string }
  | { type: "cta"; label: string; url: string }
  | { type: "separator" };
export type NewsletterBlockV2 =
  | { type: "richText"; document: RichTextDocument }
  | ({ type: "image" | "gif"; assetId: string; alt: string; caption: string } & MediaLayout)
  | { type: "callout"; document: RichTextDocument; tone: "info" | "success" | "warning" }
  | { type: "metrics"; items: { label: string; value: string }[] }
  | {
      type: "chart";
      title: string;
      chartType: "bar" | "line" | "donut";
      data: ChartPoint[];
      showLegend: boolean;
      showLabels: boolean;
      align: "left" | "center" | "right";
    }
  | ({ type: "video"; provider: "youtube" | "vimeo"; videoId: string; title: string } & MediaLayout)
  | {
      type: "drawing";
      width: number;
      height: number;
      backgroundColor: string;
      alt: string;
      strokes: DrawingStroke[];
    }
  | { type: "cta"; label: string; url: string; align: "left" | "center" | "right" }
  | { type: "separator" };
export type NewsletterBlock = NewsletterBlockV1 | NewsletterBlockV2;
export type NewsletterContentV1 = { version: 1; blocks: NewsletterBlockV1[] };
export type NewsletterContentV2 = {
  version: 2;
  header?: RichTextDocument;
  description?: RichTextDocument;
  footer?: RichTextDocument;
  theme: {
    width: "compact" | "standard" | "wide";
    fontFamily: NewsletterFont;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
  };
  blocks: NewsletterBlockV2[];
};
export type NewsletterContent = NewsletterContentV1 | NewsletterContentV2;
export type NewsletterDetail = {
  id: string;
  title: string;
  excerpt: string;
  newsletterCategory: string;
  startsAt: string | null;
  revision: number;
  content: NewsletterContent;
};
