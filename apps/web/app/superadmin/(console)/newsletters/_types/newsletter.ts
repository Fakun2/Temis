import type {
  NewsletterBlockV2,
  NewsletterContent,
  NewsletterContentV2
} from "@/components/newsletter/newsletter-types";

export type Newsletter = {
  id: string;
  title: string;
  excerpt: string | null;
  newsletterCategory: string | null;
  audience: "all_tenants" | "selected_tenants";
  status: "draft" | "published" | "cancelled";
  startsAt: string | null;
  endsAt: string | null;
  revision: number;
  content: NewsletterContent | null;
  targets?: { tenantId: string }[];
};
export type Draft = {
  title: string;
  excerpt: string;
  newsletterCategory: "release" | "bugfix" | "policy" | "performance" | "general";
  audience: "all_tenants" | "selected_tenants";
  targetTenantIds: string[];
  startsAt: string;
  endsAt: string;
  content: NewsletterContentV2;
};
export type BuilderPanel = "content" | "styles" | "media" | "settings";
export type MediaKind = "image" | "gif" | "video";
export type MediaSection = "header" | "body" | "footer";
export type MediaBlock = Extract<NewsletterBlockV2, { type: MediaKind }>;
