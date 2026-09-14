import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/lib/theme/theme-provider";
import type { ConnectorDefinition } from "../../_types/connectors.types";
import { ConnectorLogo } from "./connector-logo";

export function ConnectorDetailView({ connector }: { connector: ConnectorDefinition }) {
  const { colorMode, variant } = useTheme();
  const transparentInDark = colorMode === "navy-slate" && variant === "dark";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
      <Button asChild className="w-fit gap-2 text-muted-foreground" type="button" variant="ghost">
        <Link href="/admin/account?view=connectors">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Conectores
        </Link>
      </Button>

      <Card className={`overflow-hidden rounded-2xl border-border/60 bg-card shadow-sm ${transparentInDark ? "!bg-transparent" : ""}`}>
        <CardContent className="grid gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-5">
              <ConnectorLogo connectorId={connector.id} className="size-16 shrink-0" />
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <h1 className="truncate text-3xl font-semibold tracking-tight text-foreground">
                    {connector.name}
                  </h1>
                  <Badge className="bg-muted text-muted-foreground hover:bg-muted">Proximamente</Badge>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {connector.description}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-foreground">Configuracion no disponible</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Esta vista queda preparada para conectar, mapear permisos y configurar sincronizacion
                  cuando el conector este implementado.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
