"use client";

import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import { getPlatformObservability, getPlatformObservabilityHistory } from "../_api/platform.api";
import {
  ObservabilityOverview,
  ObservabilityStatusBadge
} from "./_components/observability-overview";

export default function PlatformObservabilityPage() {
  const session = useSuperAdminSession();
  const allowed = hasSuperAdminPermission(session, "platform:observability:read");
  const query = useQuery({
    enabled: allowed,
    queryFn: getPlatformObservability,
    queryKey: ["platform", "observability"],
    refetchInterval: 30_000
  });
  const historyQuery = useQuery({
    enabled: allowed,
    queryFn: getPlatformObservabilityHistory,
    queryKey: ["platform", "observability", "history"],
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000
  });

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl">
              Observabilidad
            </h1>
            {query.data ? <ObservabilityStatusBadge status={query.data.status} /> : null}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Estado actual de los servicios que sostienen Temis Platform.
          </p>
          {query.data ? (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Última actualización: {new Date(query.data.generatedAt).toLocaleString("es-AR")}.
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={!allowed || query.isFetching}
        >
          <RefreshCw className={`mr-2 size-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </section>

      {query.isError ? (
        <p className="text-sm text-destructive" role="alert">
          No se pudo cargar la observabilidad. Intentá actualizar nuevamente.
        </p>
      ) : null}
      {!allowed ? (
        <p className="text-sm text-muted-foreground">
          No tenés permisos para consultar la observabilidad.
        </p>
      ) : query.data ? (
        <ObservabilityOverview
          history={historyQuery.data}
          historyError={historyQuery.isError}
          historyLoading={historyQuery.isLoading}
          onRetryHistory={() => void historyQuery.refetch()}
          summary={query.data}
        />
      ) : !query.isError ? (
        <p className="text-sm text-muted-foreground" role="status">
          Cargando observabilidad...
        </p>
      ) : null}
    </main>
  );
}
