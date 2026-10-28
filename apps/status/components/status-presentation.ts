import {
  Activity,
  CircleHelp,
  Clock3,
  Gauge,
  ShieldCheck,
  TriangleAlert,
  XCircle,
  type LucideIcon
} from "lucide-react";
import type { IncidentStage, PublicStatus } from "@/lib/status.types";

export const statusPresentation: Record<
  PublicStatus,
  { banner: string; cell: string; icon: LucideIcon; label: string; text: string }
> = {
  operational: {
    banner: "border-emerald-200 bg-emerald-50 text-emerald-950",
    cell: "bg-emerald-500",
    icon: ShieldCheck,
    label: "Todos los sistemas operativos",
    text: "text-emerald-700"
  },
  degraded: {
    banner: "border-amber-200 bg-amber-50 text-amber-950",
    cell: "bg-amber-400",
    icon: Gauge,
    label: "Rendimiento degradado",
    text: "text-amber-700"
  },
  partial_outage: {
    banner: "border-orange-200 bg-orange-50 text-orange-950",
    cell: "bg-orange-500",
    icon: TriangleAlert,
    label: "Interrupción parcial",
    text: "text-orange-700"
  },
  major_outage: {
    banner: "border-rose-200 bg-rose-50 text-rose-950",
    cell: "bg-rose-500",
    icon: XCircle,
    label: "Interrupción del servicio",
    text: "text-rose-700"
  },
  maintenance: {
    banner: "border-sky-200 bg-sky-50 text-sky-950",
    cell: "bg-sky-500",
    icon: Clock3,
    label: "Mantenimiento en curso",
    text: "text-sky-700"
  },
  unknown: {
    banner: "border-slate-200 bg-slate-50 text-slate-900",
    cell: "bg-slate-300",
    icon: CircleHelp,
    label: "Estado temporalmente desconocido",
    text: "text-slate-600"
  }
};

export const incidentStageLabels: Record<IncidentStage, string> = {
  investigating: "Investigando",
  identified: "Identificado",
  monitoring: "Monitoreando",
  resolved: "Resuelto"
};

export const serviceFallbackIcon = Activity;
