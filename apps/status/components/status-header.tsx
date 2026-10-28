import { ArrowUpRight, Scale } from "lucide-react";

export function StatusHeader({ mainSiteUrl }: { mainSiteUrl: string }) {
  return (
    <header className="border-b border-border/80">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="inline-flex items-center gap-3" aria-label="Estado de Temis">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Scale className="size-4" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">Temis</span>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Estado del servicio</span>
        </a>
        <a
          href={mainSiteUrl}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Ir a Temis
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}
