"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, RefreshCw, UserCheck, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { useSuperAdminSession } from "@/lib/auth/use-superadmin-session";
import {
  dashboardSurfaceClassName as adminSurfaceClassName,
  dashboardSurfacePrimaryClassName as adminSurfacePrimaryClassName
} from "@/components/dashboard/styles";
import { getPlatformDashboardSummary } from "./_api/platform.api";

const metrics = [
  { icon: Users, key: "total", label: "Founders totales" },
  { icon: UserCheck, key: "active", label: "Founders activos" },
  { icon: UserX, key: "inactive", label: "Inactivos o deshabilitados" }
] as const;

export default function PlatformPage() {
  const session = useSuperAdminSession();
  const allowed = hasSuperAdminPermission(session, "platform:users:read");
  const query = useQuery({
    enabled: allowed,
    queryFn: getPlatformDashboardSummary,
    queryKey: ["platform", "dashboard", "summary"]
  });

  return (
    <div className="grid gap-5">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inicio</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de founders y estudios creados en Temis.
          </p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`mr-2 size-4 ${query.isFetching ? "animate-spin" : ""}`} />{" "}
          Actualizar
        </Button>
      </section>

      {query.isError ? (
        <Card className={`${adminSurfaceClassName} border-0`}>
          <CardContent className="py-6 text-sm text-destructive">
            No se pudieron cargar las métricas de usuarios. Intentá actualizar nuevamente.
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        {metrics.map(({ icon: Icon, key, label }) => (
          <Card key={key} className={`${adminSurfaceClassName} border-0`}>
            <CardContent className="flex items-start justify-between gap-3 py-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums">
                  {query.isLoading ? "—" : (query.data?.users[key] ?? "Sin datos")}
                </p>
              </div>
              <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className={`${adminSurfaceClassName} border-0`}>
        <CardHeader>
          <CardTitle className={`text-base ${adminSurfacePrimaryClassName}`}>Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Consultá estado, último acceso y cantidad de personas por estudio sin modificar cuentas.
          </p>
          <Button asChild className="shrink-0">
            <Link href="/superadmin/users">
              Ver usuarios <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
