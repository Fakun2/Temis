"use client";

import { Bell, BellOff, CalendarPlus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "../../../_components/admin-table-header";
import { AdminTableHeaderActionButton } from "../../../_components/admin-table-header-action-button";
import { AdminTableBodySkeleton } from "../../../_components/admin-skeletons";
import { adminSurfaceClassName } from "../../../_constants/dashboard";
import { caseHearingTypeLabels } from "../../_constants/cases.constants";
import { useCaseHearingsQuery } from "../../_hooks/use-case-hearings-query";
import type { CaseHearingDto } from "../../_types/cases.types";
import { CaseHearingRowActions } from "./case-hearing-row-actions";
import { CaseHearingSheet } from "./hearing-sheet";

export function CaseHearingsTable({
  canCreate,
  canDelete,
  canUpdate,
  caseId,
  focusedHearingId
}: {
  canCreate: boolean;
  canDelete: boolean;
  canUpdate: boolean;
  caseId: string;
  focusedHearingId?: string | null;
}) {
  const hearingsQuery = useCaseHearingsQuery(caseId);
  const hearings = hearingsQuery.data?.items ?? [];
  const hasActions = canDelete || canUpdate;

  return (
    <Card
      data-admin-surface
      className={`${adminSurfaceClassName} flex min-h-[260px] flex-col overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
    >
      <AdminTableHeader
        actions={
          canCreate ? (
            <CaseHearingSheet
              caseId={caseId}
              trigger={
                <AdminTableHeaderActionButton icon={Plus} label="Nueva audiencia" tone="primary" />
              }
            />
          ) : null
        }
        description="Fechas procesales, tipo de audiencia y avisos asociados."
        icon={CalendarPlus}
        title="Audiencias del expediente"
      />
      <CardContent className="flex min-h-0 flex-1 flex-col px-3 md:px-4">
        <section className="h-[552px] min-h-[552px] overflow-auto rounded-2xl">
          <Table className="min-w-full text-xs">
            <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Tipo
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Fecha
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Descripcion
                </TableHead>
                <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
                  Notificaciones
                </TableHead>
                {hasActions ? (
                  <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
                    Acciones
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <HearingsTableBody
              canDelete={canDelete}
              canUpdate={canUpdate}
              caseId={caseId}
              columnCount={4 + (hasActions ? 1 : 0)}
              errorMessage={hearingsQuery.error?.message}
              focusedHearingId={focusedHearingId}
              hasActions={hasActions}
              hearings={hearings}
              isLoading={hearingsQuery.isLoading}
              permissionDenied={!hearingsQuery.hasPermission}
            />
          </Table>
        </section>
        <div className="flex items-center justify-between border-t border-border/30 px-2 py-3 text-xs text-muted-foreground">
          <span>Pagina {hearingsQuery.pageIndex + 1}</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-border/50 px-3 py-1 disabled:opacity-50"
              disabled={!hearingsQuery.canGoBack}
              onClick={hearingsQuery.goBack}
            >
              Anterior
            </button>
            <button
              type="button"
              className="rounded-lg border border-border/50 px-3 py-1 disabled:opacity-50"
              disabled={!hearingsQuery.data?.pageInfo.hasNextPage}
              onClick={hearingsQuery.goForward}
            >
              Siguiente
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HearingsTableBody({
  canDelete,
  canUpdate,
  caseId,
  columnCount,
  errorMessage,
  focusedHearingId,
  hasActions,
  hearings,
  isLoading,
  permissionDenied
}: {
  canDelete: boolean;
  canUpdate: boolean;
  caseId: string;
  columnCount: number;
  errorMessage?: string;
  focusedHearingId?: string | null;
  hasActions: boolean;
  hearings: CaseHearingDto[];
  isLoading: boolean;
  permissionDenied: boolean;
}) {
  if (isLoading) {
    return <AdminTableBodySkeleton columnCount={columnCount} rowCount={8} />;
  }

  if (errorMessage) {
    return (
      <MessageBody className="text-destructive" columnCount={columnCount} message={errorMessage} />
    );
  }

  if (permissionDenied) {
    return (
      <MessageBody
        columnCount={columnCount}
        message="No tenes permisos para ver las audiencias de este expediente."
      />
    );
  }

  if (!hearings.length) {
    return <MessageBody columnCount={columnCount} message="Todavia no hay audiencias cargadas." />;
  }

  return (
    <TableBody className="[&_tr:last-child]:border-0">
      {hearings.map((hearing) => (
        <TableRow
          className={`h-16 border-border/40 hover:bg-secondary/30 ${
            focusedHearingId === hearing.id
              ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
              : ""
          }`}
          key={hearing.id}
        >
          <TableCell className="px-3 py-3 font-medium">
            {caseHearingTypeLabels[hearing.type]}
          </TableCell>
          <TableCell className="px-3 py-3">
            {formatHearingDate(hearing.date)} · {hearing.time}
          </TableCell>
          <TableCell className="max-w-[360px] truncate px-3 py-3">{hearing.description}</TableCell>
          <TableCell className="px-3 py-3">
            <Badge variant="outline" className="gap-1 rounded-lg">
              {hearing.notificationsEnabled ? (
                <Bell className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {hearing.notificationsEnabled ? "Activas" : "Inactivas"}
            </Badge>
          </TableCell>
          {hasActions ? (
            <TableCell className="px-3 py-3 text-right">
              <div className="flex justify-end">
                <CaseHearingRowActions
                  canDelete={canDelete}
                  canUpdate={canUpdate}
                  caseId={caseId}
                  hearing={hearing}
                />
              </div>
            </TableCell>
          ) : null}
        </TableRow>
      ))}
    </TableBody>
  );
}

function MessageBody({
  className = "text-muted-foreground",
  columnCount,
  message
}: {
  className?: string;
  columnCount: number;
  message: string;
}) {
  return (
    <TableBody className="[&_tr:last-child]:border-0">
      <TableRow className="h-[512px] hover:bg-transparent">
        <TableCell className={`px-3 text-center text-sm ${className}`} colSpan={columnCount}>
          {message}
        </TableCell>
      </TableRow>
    </TableBody>
  );
}

function formatHearingDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
    new Date(`${date}T00:00:00`)
  );
}
