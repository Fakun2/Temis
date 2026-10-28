import type { PublicStatus } from "@/lib/status.types";
import { statusPresentation } from "./status-presentation";

export function OverallStatusBanner({ status }: { status: PublicStatus }) {
  const presentation = statusPresentation[status];
  const Icon = presentation.icon;
  return (
    <section
      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-sm ${presentation.banner}`}
      aria-live="polite"
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <p className="font-medium">{presentation.label}</p>
    </section>
  );
}
