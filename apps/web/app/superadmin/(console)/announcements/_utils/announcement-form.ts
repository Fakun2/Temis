import { z } from "zod";
import type {
  AnnouncementAudience,
  AnnouncementCategory,
  AnnouncementDeliveryMode,
  AnnouncementInput,
  AnnouncementSeverity,
  PlatformAnnouncementDetail,
  TenantOption
} from "../_api/announcements.api";

export type AnnouncementDraft = {
  audience: AnnouncementAudience;
  body: string;
  category: AnnouncementCategory;
  deliveryMode: AnnouncementDeliveryMode;
  endsAt: string;
  linkLabel: string;
  linkUrl: string;
  severity: AnnouncementSeverity;
  startsAt: string;
  title: string;
};

export const announcementFormSchema = z
  .object({
    audience: z.enum(["all_tenants", "selected_tenants"]),
    body: z.string().trim().min(1, "Ingresá un mensaje.").max(1000),
    category: z.enum(["general", "maintenance", "deployment", "incident"]),
    deliveryMode: z.enum(["draft", "publish_now", "schedule"]),
    endsAt: z.string(),
    linkLabel: z.string().trim().max(40),
    linkUrl: z.string().trim().max(500),
    severity: z.enum(["info", "warning", "critical"]),
    startsAt: z.string(),
    title: z.string().trim().min(1, "Ingresá un título.").max(120)
  })
  .superRefine((value, context) => {
    if (Boolean(value.linkLabel) !== Boolean(value.linkUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completá la etiqueta y el enlace juntos.",
        path: ["linkUrl"]
      });
    }
    if (value.linkUrl && !value.linkUrl.startsWith("/") && !value.linkUrl.startsWith("https://")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Usá HTTPS o una ruta interna.",
        path: ["linkUrl"]
      });
    }
    if (value.deliveryMode === "schedule" && (!value.startsAt || !value.endsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La programación requiere inicio y finalización.",
        path: [value.startsAt ? "endsAt" : "startsAt"]
      });
    }
    if (value.deliveryMode === "publish_now" && !value.endsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Indicá hasta cuándo estará vigente.",
        path: ["endsAt"]
      });
    }
    if (value.deliveryMode === "draft" && Boolean(value.startsAt) !== Boolean(value.endsAt)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completá inicio y finalización juntos.",
        path: [value.startsAt ? "endsAt" : "startsAt"]
      });
    }

    const now = Date.now();
    const startsAt = value.startsAt ? new Date(value.startsAt).getTime() : null;
    const endsAt = value.endsAt ? new Date(value.endsAt).getTime() : null;
    if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La finalización debe ser posterior al inicio.",
        path: ["endsAt"]
      });
    }
    if (value.deliveryMode === "publish_now" && endsAt !== null && endsAt <= now) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La finalización debe ser futura.",
        path: ["endsAt"]
      });
    }
    if (value.deliveryMode === "schedule" && startsAt !== null && startsAt <= now) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha programada debe ser futura.",
        path: ["startsAt"]
      });
    }
  });

export function createAnnouncementDraft(
  category?: AnnouncementCategory,
  detail?: PlatformAnnouncementDetail | null
): AnnouncementDraft {
  return {
    audience: detail?.audience ?? "all_tenants",
    body: detail?.body ?? "",
    category: detail?.category ?? category ?? "general",
    deliveryMode: "draft",
    endsAt: toLocalInput(detail?.endsAt),
    linkLabel: detail?.linkLabel ?? "",
    linkUrl: detail?.linkUrl ?? "",
    severity: detail?.severity ?? "info",
    startsAt: toLocalInput(detail?.startsAt),
    title: detail?.title ?? ""
  };
}

export function toAnnouncementInput(
  draft: AnnouncementDraft,
  selected: TenantOption[]
): AnnouncementInput {
  return {
    audience: draft.audience,
    body: draft.body.trim(),
    category: draft.category,
    endsAt: toIso(draft.endsAt),
    linkLabel: draft.linkLabel.trim() || undefined,
    linkUrl: draft.linkUrl.trim() || undefined,
    severity: draft.severity,
    startsAt: draft.deliveryMode === "publish_now" ? undefined : toIso(draft.startsAt),
    targetTenantIds:
      draft.audience === "selected_tenants" ? selected.map((tenant) => tenant.id) : undefined,
    title: draft.title.trim()
  };
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}
