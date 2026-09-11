"use client";

import type { ReactNode } from "react";
import { AlertCircle, Building2, RotateCcw, UserRound } from "lucide-react";
import type { ClientSummaryDto } from "@temis/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableRowsSkeleton } from "../../_components/admin-skeletons";
import { Can } from "../../_components/auth";
import { clientTypeLabels } from "../_constants/clients.constants";
import { ClientRowActions } from "./client-row-actions";
import { ClientSheetPlaceholder } from "./client-sheet-placeholder";
import { ClientStatusBadge } from "./client-status-badge";

const columnCount = 7;

export function ClientsTable({
  clients,
  error,
  hasActiveFilters,
  loading,
  onArchived,
  onClearFilters,
  onRetry
}: {
  clients: ClientSummaryDto[];
  error: Error | null;
  hasActiveFilters: boolean;
  loading: boolean;
  onArchived: () => void;
  onClearFilters: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="max-h-[56svh] min-h-[300px] overflow-auto scrollbar-none rounded-2xl lg:min-h-0 lg:max-h-none lg:flex-1">
      <Table className="min-w-[920px] text-xs" aria-busy={loading}>
        <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-10 w-[25%] px-3 text-sm font-medium text-foreground">
              Cliente
            </TableHead>
            <TableHead className="h-10 px-3 text-sm font-medium text-foreground">Tipo</TableHead>
            <TableHead className="h-10 px-3 text-sm font-medium text-foreground">
              Documento
            </TableHead>
            <TableHead className="h-10 w-[24%] px-3 text-sm font-medium text-foreground">
              Contacto
            </TableHead>
            <TableHead className="h-10 px-3 text-center text-sm font-medium text-foreground">
              Expedientes
            </TableHead>
            <TableHead className="h-10 px-3 text-sm font-medium text-foreground">Estado</TableHead>
            <TableHead className="h-10 px-3 text-right text-sm font-medium text-foreground">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child]:border-0">
          {loading && clients.length === 0 ? (
            <AdminTableRowsSkeleton columnCount={columnCount} rowCount={8} />
          ) : error ? (
            <StateRow
              icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
              message={error.message}
              tone="error"
            >
              <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reintentar
              </Button>
            </StateRow>
          ) : clients.length === 0 ? (
            <StateRow
              message={
                hasActiveFilters
                  ? "No hay clientes para los filtros seleccionados."
                  : "Todavía no hay clientes."
              }
            >
              {hasActiveFilters ? (
                <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Can permissions={["clients:create"]}>
                  <ClientSheetPlaceholder compact />
                </Can>
              )}
            </StateRow>
          ) : (
            clients.map((client) => (
              <TableRow className="h-16 border-border/40 hover:bg-secondary/30" key={client.id}>
                <TableCell className="h-16 px-3 py-2">
                  <p className="max-w-[260px] truncate text-sm font-medium text-foreground">
                    {client.displayName}
                  </p>
                </TableCell>
                <TableCell className="h-16 px-3 py-2">
                  <ClientTypeCell client={client} />
                </TableCell>
                <TableCell className="h-16 px-3 py-2">
                  <ClientDocumentCell client={client} />
                </TableCell>
                <TableCell className="h-16 px-3 py-2">
                  <ClientContactCell client={client} />
                </TableCell>
                <TableCell className="h-16 px-3 py-2 text-center">
                  <span className="text-sm tabular-nums text-foreground">{client.casesCount}</span>
                </TableCell>
                <TableCell className="h-16 px-3 py-2">
                  <ClientStatusBadge status={client.status} />
                </TableCell>
                <TableCell className="h-16 px-3 py-2 text-right">
                  <div className="flex justify-end">
                    <ClientRowActions client={client} onArchived={onArchived} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ClientTypeCell({ client }: { client: ClientSummaryDto }) {
  const Icon = client.type === "human" ? UserRound : Building2;

  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      {clientTypeLabels[client.type]}
    </span>
  );
}

function ClientDocumentCell({ client }: { client: ClientSummaryDto }) {
  if (client.type === "legal_entity") {
    return <LabeledValues values={client.cuit ? [{ label: "CUIT", value: client.cuit }] : []} />;
  }

  return (
    <LabeledValues
      values={[
        ...(client.dni ? [{ label: "DNI", value: client.dni }] : []),
        ...(client.cuil ? [{ label: "CUIL", value: client.cuil }] : [])
      ]}
    />
  );
}

function ClientContactCell({ client }: { client: ClientSummaryDto }) {
  return (
    <div className="grid max-w-[280px] gap-0.5">
      {client.email ? (
        <span className="truncate text-sm text-foreground" title={client.email}>
          {client.email}
        </span>
      ) : null}
      {client.phone ? (
        <span className="truncate text-xs text-muted-foreground" title={client.phone}>
          {client.phone}
        </span>
      ) : null}
      {!client.email && !client.phone ? (
        <span className="text-sm text-muted-foreground">—</span>
      ) : null}
    </div>
  );
}

function LabeledValues({ values }: { values: Array<{ label: string; value: string }> }) {
  if (values.length === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <span className="grid gap-0.5">
      {values.map((item, index) => (
        <span
          className={index === 0 ? "text-sm text-foreground" : "text-xs text-muted-foreground"}
          key={item.label}
        >
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </span>
          {item.value}
        </span>
      ))}
    </span>
  );
}

function StateRow({
  children,
  icon,
  message,
  tone = "muted"
}: {
  children?: ReactNode;
  icon?: ReactNode;
  message: string;
  tone?: "error" | "muted";
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="h-[300px] p-6 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3">
          {icon ? (
            <span className={tone === "error" ? "text-destructive" : "text-muted-foreground"}>
              {icon}
            </span>
          ) : null}
          <p
            className={
              tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"
            }
          >
            {message}
          </p>
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}
