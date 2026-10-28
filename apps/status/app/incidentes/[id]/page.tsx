import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { IncidentTimeline, formatDate } from "@/components/incident-card";
import { statusPresentation } from "@/components/status-presentation";
import { getStatusSnapshot } from "@/lib/status-feed";

export const revalidate = 60;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const incident = (await getStatusSnapshot()).incidents.find(
    (item) => item.id === decodeURIComponent(id)
  );
  return incident
    ? { title: incident.title, description: incident.updates.at(-1)?.message }
    : { title: "Incidente" };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const incident = (await getStatusSnapshot()).incidents.find(
    (item) => item.id === decodeURIComponent(id)
  );
  if (!incident) notFound();
  const presentation = statusPresentation[incident.impact];
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Estado actual
      </Link>
      <article className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-[0_14px_40px_-34px_rgba(7,48,97,0.5)] sm:p-8">
        <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${presentation.text}`}>
          {presentation.label}
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{incident.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Iniciado el {formatDate(incident.startedAt)}
        </p>
        {incident.componentNames.length > 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            Servicios afectados:{" "}
            <span className="font-medium text-foreground">
              {incident.componentNames.join(", ")}
            </span>
          </p>
        ) : null}
        <IncidentTimeline incident={incident} />
      </article>
    </div>
  );
}
