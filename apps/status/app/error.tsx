"use client";

import { useEffect } from "react";
import { CircleHelp } from "lucide-react";

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Status feed unavailable", { digest: error.digest });
  }, [error.digest]);
  return (
    <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
      <CircleHelp className="mx-auto size-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        Estado temporalmente desconocido
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
        No pudimos obtener la información más reciente. Esto no significa que los servicios estén
        operativos ni interrumpidos.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Volver a intentar
      </button>
    </div>
  );
}
