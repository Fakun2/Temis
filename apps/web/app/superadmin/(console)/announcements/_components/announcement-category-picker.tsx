"use client";

import { Megaphone, ShieldAlert, Tags, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import type { AnnouncementCategory } from "../_api/announcements.api";

const choices = [
  {
    category: "general" as const,
    description: "Novedades y mensajes institucionales.",
    icon: Megaphone,
    label: "General"
  },
  {
    category: "maintenance" as const,
    description: "Ventanas de mantenimiento y disponibilidad.",
    icon: Wrench,
    label: "Mantenimiento"
  },
  {
    category: "deployment" as const,
    description: "Versiones, mejoras y cambios de producto.",
    icon: Tags,
    label: "Despliegue"
  },
  {
    category: "incident" as const,
    description: "Alertas operativas que requieren atención.",
    icon: ShieldAlert,
    label: "Incidente"
  }
];

export function AnnouncementCategoryPicker({
  onOpenChange,
  onSelect,
  open
}: {
  onOpenChange: (open: boolean) => void;
  onSelect: (category: AnnouncementCategory) => void;
  open: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elegí el tipo de comunicado</DialogTitle>
          <DialogDescription>
            Esta clasificación define cómo se presentará el mensaje en Temis.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map(({ category, description, icon: Icon, label }) => (
            <button
              key={category}
              type="button"
              onClick={() => onSelect(category)}
              className="group flex gap-3 rounded-2xl border border-border/50 bg-card/60 p-4 text-left transition hover:border-primary/35 hover:bg-primary/5"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span>
                <strong className="text-sm">{label}</strong>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
