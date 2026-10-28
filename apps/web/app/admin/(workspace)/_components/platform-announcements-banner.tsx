"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  OctagonAlert,
  Rocket,
  Siren,
  Wrench,
  X,
  type LucideIcon
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardHttpClient } from "@/lib/http";
import { useDashboardMutation } from "@/lib/query/use-dashboard-mutation";
import { useDashboardQuery } from "@/lib/query/use-dashboard-query";

type PlatformAnnouncement = {
  body: string;
  category: "general" | "maintenance" | "deployment" | "incident";
  id: string;
  linkLabel: string | null;
  linkUrl: string | null;
  severity: "info" | "warning" | "critical";
  title: string;
};

type AnnouncementPresentation = {
  categoryLabel: string;
  icon: LucideIcon;
  severityLabel: string;
};

export function PlatformAnnouncementsBanner() {
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const query = useDashboardQuery({
    queryKey: ["platform-announcements"],
    queryFn: () =>
      dashboardHttpClient.request<PlatformAnnouncement[]>({ path: "/announcements/active" }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true
  });
  const queryClient = useQueryClient();
  const dismissMutation = useDashboardMutation({
    mutationFn: (id: string) =>
      dashboardHttpClient.request({ method: "POST", path: `/announcements/${id}/dismiss` }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [query.tenantId, "platform-announcements"] })
  });
  const announcements = query.data ?? [];
  const safeIndex = Math.min(index, Math.max(0, announcements.length - 1));
  const announcement = announcements[safeIndex];

  return (
    <AnimatePresence initial={false} mode="wait">
      {announcement ? (
        <AnimatedAnnouncement
          announcement={announcement}
          count={announcements.length}
          index={safeIndex}
          key={announcement.id}
          reducedMotion={Boolean(reducedMotion)}
          dismissing={dismissMutation.isPending}
          onDismiss={() => dismissMutation.mutate(announcement.id)}
          onNext={() => setIndex((safeIndex + 1) % announcements.length)}
          onPrevious={() => setIndex((safeIndex - 1 + announcements.length) % announcements.length)}
        />
      ) : null}
    </AnimatePresence>
  );
}

function AnimatedAnnouncement({
  announcement,
  count,
  dismissing,
  index,
  onDismiss,
  onNext,
  onPrevious,
  reducedMotion
}: {
  announcement: PlatformAnnouncement;
  count: number;
  dismissing: boolean;
  index: number;
  onDismiss: () => void;
  onNext: () => void;
  onPrevious: () => void;
  reducedMotion: boolean;
}) {
  const presentation = getAnnouncementPresentation(announcement);
  const Icon = presentation.icon;
  const critical = announcement.severity === "critical";
  const enterTransition = reducedMotion
    ? { duration: 0.08 }
    : {
        height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
        opacity: { duration: 0.22, ease: "easeOut" as const },
        y: { type: "spring" as const, stiffness: 330, damping: 30, mass: 0.72 },
        filter: { duration: 0.2, ease: "easeOut" as const }
      };

  return (
    <motion.div
      layout
      role={critical ? "alert" : "status"}
      aria-busy={dismissing}
      data-platform-announcement
      data-announcement-category={announcement.category}
      data-announcement-severity={announcement.severity}
      initial={reducedMotion ? false : { filter: "blur(5px)", height: 0, opacity: 0, y: -7 }}
      animate={{ filter: "blur(0px)", height: "auto", opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { filter: "blur(3px)", height: 0, opacity: 0, y: -5 }}
      transition={enterTransition}
      className="relative isolate overflow-hidden text-sm"
    >
      <div className="flex min-h-12 items-center gap-3 px-4 py-2 md:px-6">
        <motion.span
          data-announcement-icon
          initial={reducedMotion ? false : { opacity: 0, rotate: -7, scale: 0.82 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          transition={
            reducedMotion
              ? { duration: 0.08 }
              : { delay: 0.06, type: "spring", stiffness: 420, damping: 25 }
          }
          className="grid size-6 shrink-0 place-items-center"
        >
          <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
        </motion.span>
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={
            reducedMotion
              ? { duration: 0.08 }
              : { delay: 0.08, duration: 0.26, ease: [0.22, 1, 0.36, 1] }
          }
          className="min-w-0 flex-1 leading-5"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <strong className="font-semibold">{announcement.title}</strong>
            <span
              data-announcement-badge
              className="rounded-full px-1.5 py-px text-[9px] font-semibold uppercase leading-4 tracking-[0.07em]"
            >
              {presentation.categoryLabel}
              <span className="px-1 opacity-45" aria-hidden="true">
                ·
              </span>
              {presentation.severityLabel}
            </span>
          </div>
          <p data-announcement-body className="text-xs sm:text-sm">
            {announcement.body}
            {announcement.linkUrl ? (
              <a
                className="ml-2 whitespace-nowrap font-semibold underline decoration-current/45 underline-offset-2 transition hover:decoration-current"
                href={announcement.linkUrl}
              >
                {announcement.linkLabel || "Más información"}
              </a>
            ) : null}
          </p>
        </motion.div>
        {count > 1 ? (
          <motion.div
            data-announcement-controls
            initial={reducedMotion ? false : { opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              reducedMotion
                ? { duration: 0.08 }
                : { delay: 0.12, duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
            className="flex shrink-0 items-center gap-1 rounded-xl p-0.5"
          >
            <BannerButton label="Aviso anterior" onClick={onPrevious}>
              <ChevronLeft className="size-4" />
            </BannerButton>
            <span className="min-w-9 text-center text-[11px] font-semibold tabular-nums">
              {index + 1}/{count}
            </span>
            <BannerButton label="Aviso siguiente" onClick={onNext}>
              <ChevronRight className="size-4" />
            </BannerButton>
          </motion.div>
        ) : null}
        {!critical ? (
          <BannerButton label="Descartar aviso" disabled={dismissing} onClick={onDismiss}>
            <X className="size-4" />
          </BannerButton>
        ) : null}
      </div>
    </motion.div>
  );
}

function BannerButton({
  children,
  disabled,
  label,
  onClick
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-announcement-button
      className="grid size-7 shrink-0 place-items-center rounded-lg transition-[background-color,color,transform] duration-200 hover:scale-[1.04] active:scale-95 focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
    >
      {children}
    </button>
  );
}

function getAnnouncementPresentation(announcement: PlatformAnnouncement): AnnouncementPresentation {
  if (announcement.severity === "critical") {
    return {
      categoryLabel: categoryLabel[announcement.category],
      icon: OctagonAlert,
      severityLabel: "Crítico"
    };
  }
  if (announcement.severity === "warning") {
    return {
      categoryLabel: categoryLabel[announcement.category],
      icon: AlertTriangle,
      severityLabel: "Advertencia"
    };
  }
  return {
    ...categoryPresentation[announcement.category],
    severityLabel: "Informativo"
  };
}

const categoryLabel = {
  deployment: "Despliegue",
  general: "General",
  incident: "Incidente",
  maintenance: "Mantenimiento"
} as const;

const categoryPresentation: Record<PlatformAnnouncement["category"], AnnouncementPresentation> = {
  general: {
    categoryLabel: "General",
    icon: Megaphone,
    severityLabel: "Informativo"
  },
  maintenance: {
    categoryLabel: "Mantenimiento",
    icon: Wrench,
    severityLabel: "Informativo"
  },
  deployment: {
    categoryLabel: "Despliegue",
    icon: Rocket,
    severityLabel: "Informativo"
  },
  incident: {
    categoryLabel: "Incidente",
    icon: Siren,
    severityLabel: "Informativo"
  }
};
