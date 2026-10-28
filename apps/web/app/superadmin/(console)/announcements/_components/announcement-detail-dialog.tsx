"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { PlatformAnnouncementDetail } from "../_api/announcements.api";
import {
  announcementCategoryLabel,
  announcementLifecycleLabel,
  announcementSeverityLabel,
  formatAnnouncementDateTime
} from "../_utils/announcement-presenters";

export function AnnouncementDetailDialog({
  detail,
  onOpenChange,
  open
}: {
  detail: PlatformAnnouncementDetail | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{detail?.title ?? "Comunicado"}</DialogTitle>
          <DialogDescription>
            {detail
              ? `${announcementCategoryLabel[detail.category]} · ${announcementSeverityLabel[detail.severity]} · revisión ${detail.revision}`
              : "Detalle del comunicado"}
          </DialogDescription>
        </DialogHeader>
        {detail ? (
          <div className="grid gap-4 text-sm">
            <p className="whitespace-pre-wrap rounded-2xl bg-secondary/25 p-4 leading-6">
              {detail.body}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Info label="Estado" value={announcementLifecycleLabel[detail.lifecycle]} />
              <Info
                label="Audiencia"
                value={
                  detail.audience === "all_tenants"
                    ? "Todos los estudios"
                    : detail.targetTenants.map((tenant) => tenant.name).join(", ")
                }
              />
              <Info label="Inicio" value={formatAnnouncementDateTime(detail.startsAt)} />
              <Info label="Finalización" value={formatAnnouncementDateTime(detail.endsAt)} />
            </div>
            {detail.linkUrl ? (
              <a className="text-primary underline-offset-4 hover:underline" href={detail.linkUrl}>
                {detail.linkLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
