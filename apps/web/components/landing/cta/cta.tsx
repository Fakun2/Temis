import Link from "next/link";
import { Sparkles } from "lucide-react";
import { LandingContainer, LandingSection } from "../ui/landing-section";

export function FinalCTA() {
  return (
    <LandingSection padding="cta" className="relative flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <LandingContainer size="narrow" className="relative text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Lista de prueba privada
        </div>
        <h2 className="mt-6 text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">
          Sumate a los primeros estudios que van a probar{" "}
          <span className="font-serif font-normal italic text-primary">Temis</span>.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
          Estamos abriendo cupos limitados para estudios juridicos que quieran validar expedientes,
          audiencias, tareas, gastos y permisos con datos reales antes del lanzamiento publico.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/create-account"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
          >
            Unirme a la lista de prueba
          </Link>

        </div>
      </LandingContainer>
    </LandingSection>
  );
}
