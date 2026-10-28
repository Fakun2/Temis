import { CalendarClock } from "lucide-react";
import type { StatusMaintenance } from "@/lib/status.types";
import { formatDate } from "./incident-card";

export function MaintenanceCard({ maintenance }: { maintenance: StatusMaintenance }) {
  return (
    <article className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden="true" />
        <div>
          <h3 className="font-semibold text-sky-950">{maintenance.title}</h3>
          <p className="mt-2 text-sm leading-6 text-sky-900/75">{maintenance.message}</p>
          <p className="mt-3 text-xs text-sky-800">
            {formatDate(maintenance.startsAt)} — {formatDate(maintenance.endsAt)}
          </p>
          {maintenance.componentNames.length > 0 ? (
            <p className="mt-1 text-xs text-sky-800">
              Servicios: {maintenance.componentNames.join(", ")}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
