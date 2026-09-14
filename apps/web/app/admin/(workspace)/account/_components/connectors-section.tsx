"use client";

import Link from "next/link";
import { ArrowRight, PlugZap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AccountResponse } from "../_types/account.types";

export function ConnectorsSection({ account }: { account: AccountResponse }) {
  return (
    <Card id="connectors" className="scroll-mt-20 border-border/60 bg-card shadow-sm">
      <CardContent className="grid gap-5 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-btn-secondary text-muted-foreground">
              <PlugZap className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">Conectores</h2>
              <p className="text-xs text-muted-foreground">
                Importa tareas, documentos y comunicaciones desde apps externas.
              </p>
            </div>
          </div>
          <Badge variant="outline">{account.permissions.canManageStudio ? "Admin" : "Workspace"}</Badge>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/20 px-4 py-3">
          <p className="text-sm leading-6 text-muted-foreground">
            Notion ya esta disponible. Jira, Trello, calendarios y correo quedan preparados como
            proximas integraciones.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/account?view=connectors">
              Ver conectores
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
