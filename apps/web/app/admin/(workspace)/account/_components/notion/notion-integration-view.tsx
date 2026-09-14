"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Database, Plug, RefreshCw, Search, ShieldAlert, Unplug } from "lucide-react";
import { useTheme } from "@/lib/theme/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import type { NotionDataSourcesResponse, NotionMapping } from "../../_api/notion-integration.api";
import { ConnectorLogo } from "../connectors/connector-logo";
import {
  defaultPropertyMapping,
  defaultStatusMapping,
  formatNotionDateTime
} from "./notion.helpers";
import { useNotionIntegrationPage } from "./use-notion-integration-page";
import {
  useCreateNotionMappingMutation,
  useNotionConflictsQuery,
  useNotionDataSourcesQuery,
  useResolveNotionConflictMutation,
  useStartNotionOAuthMutation,
  useSyncNotionMappingMutation,
  useUpdateNotionMappingMutation
} from "../../_hooks/use-notion-integration";

const notionPanelClassName = "border-0 bg-transparent shadow-none dark:!bg-transparent";
const notionPanelHeaderClassName = "px-0 pb-2 pt-0";
const notionPanelContentClassName = "px-0";
const notionTableContainerClassName = "overflow-hidden rounded-xl border border-border/45 bg-transparent";
const notionTableHeaderClassName =
  "bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0";
const notionTableRowClassName = "h-14 border-border/40 hover:bg-secondary/30";
const notionTableHeadClassName = "h-10 px-3 text-sm font-medium text-foreground";
const notionTableCellClassName = "px-3 py-3 text-sm";

export function NotionIntegrationView() {
  const { completeOAuth, connected, disconnect, error, statusQuery } = useNotionIntegrationPage();

  if (!statusQuery.hasPermission) {
    return (
      <NotionShell>
        <Card className={notionPanelClassName}>
          <CardHeader>
            <CardTitle>Notion</CardTitle>
            <CardDescription>No tenes permisos para configurar integraciones.</CardDescription>
          </CardHeader>
        </Card>
      </NotionShell>
    );
  }

  return (
    <NotionShell
      connected={connected}
      disconnectPending={disconnect.isPending}
      onDisconnect={() => disconnect.mutate(undefined)}
    >
      <ConnectionCard
        connected={connected}
        error={error}
        isLoading={statusQuery.isLoading || completeOAuth.isPending}
        lastSyncAt={statusQuery.data?.connection.lastSyncAt ?? null}
        workspaceName={statusQuery.data?.connection.workspaceName ?? null}
      />
      {connected ? (
        <>
          <DataSourceMapper />
          <MappingsTable mappings={statusQuery.data?.mappings ?? []} />
          <ConflictsPanel enabled={connected} />
        </>
      ) : null}
    </NotionShell>
  );
}

function NotionShell({
  children,
  connected = false,
  disconnectPending = false,
  onDisconnect
}: {
  children: ReactNode;
  connected?: boolean;
  disconnectPending?: boolean;
  onDisconnect?: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild className="w-fit gap-2 text-muted-foreground" size="sm" type="button" variant="ghost">
          <Link href="/admin/account?view=connectors">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Conectores
          </Link>
        </Button>
        {connected && onDisconnect ? (
          <Button
            aria-label="Desconectar Notion"
            className="size-9 rounded-full p-0"
            disabled={disconnectPending}
            onClick={onDisconnect}
            title="Desconectar Notion"
            type="button"
            variant="outline"
          >
            <Unplug className={`h-4 w-4 ${disconnectPending ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
        ) : null}
      </div>
      {children}
    </main>
  );
}

function ConnectionCard({
  connected,
  error,
  isLoading,
  lastSyncAt,
  workspaceName
}: {
  connected: boolean;
  error: string | null;
  isLoading: boolean;
  lastSyncAt: string | null;
  workspaceName: string | null;
}) {
  const startOAuth = useStartNotionOAuthMutation();
  const { colorMode, variant } = useTheme();
  const isNavySlateDark = colorMode === "navy-slate" && variant === "dark";

  function connect() {
    startOAuth.mutate(undefined, {
      onSuccess: (data) => {
        window.location.href = data.authorizationUrl;
      }
    });
  }

  return (
    <Card className={`${notionPanelClassName} ${isNavySlateDark ? "!bg-transparent" : ""}`}>
      <CardHeader
        className={`${notionPanelHeaderClassName} flex w-full flex-col gap-4 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <ConnectorLogo connectorId="notion" className="size-10 shrink-0" />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">Notion</CardTitle>
              <Badge variant={connected ? "default" : "outline"} className="h-5 px-1.5 text-[10px] font-medium">
                {connected ? "Conectado" : "Disponible"}
              </Badge>
            </div>
            <CardDescription className="mt-1 truncate text-sm">
              Importa y sincroniza data sources con tareas.
            </CardDescription>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="grid gap-1 text-right">
            <div className="min-w-0">
              <span className="block truncate text-base font-semibold text-foreground">
                {connected ? workspaceName || "Workspace conectado" : "Sin workspace"}
              </span>
            </div>
            <div className="min-w-0">
              <span className="block truncate text-xs text-muted-foreground">{formatNotionDateTime(lastSyncAt)}</span>
            </div>
          </div>
          {!connected ? (
            <Button disabled={isLoading || startOAuth.isPending} onClick={connect} type="button">
              <Plug className="h-4 w-4" aria-hidden="true" />
              Conectar Notion
            </Button>
          ) : null}
        </div>
        {error ? <p className="basis-full text-sm font-medium text-destructive">{error}</p> : null}
      </CardHeader>
    </Card>
  );
}

function DataSourceMapper() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [interval, setInterval] = useState("15");
  const [open, setOpen] = useState(false);
  const dataSourcesQuery = useNotionDataSourcesQuery(search, true);
  const createMapping = useCreateNotionMappingMutation();
  const selected = useMemo(
    () => dataSourcesQuery.data?.items.find((item) => item.id === selectedId),
    [dataSourcesQuery.data?.items, selectedId]
  );

  function createSelectedMapping() {
    if (!selected) {
      return;
    }

    createMapping.mutate(
      {
        dataSourceId: selected.id,
        dataSourceName: selected.title,
        enabled: true,
        propertyMapping: defaultPropertyMapping,
        statusMapping: defaultStatusMapping,
        syncIntervalMinutes: Number(interval)
      },
      { onSuccess: () => setOpen(false) }
    );
  }

  return (
    <Card className={notionPanelClassName}>
      <CardHeader className={`${notionPanelHeaderClassName} flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between`}>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" aria-hidden="true" />
            Data sources
          </CardTitle>
          <CardDescription>Busca por keyword, configura frecuencia y vincula el tablero.</CardDescription>
        </div>
        <Button className="gap-2" type="button" variant="outline" onClick={() => setOpen(true)}>
          <Search className="h-4 w-4" aria-hidden="true" />
          Buscar data source
        </Button>
      </CardHeader>
      <CardContent className={notionPanelContentClassName}>
        <button
          className="flex min-h-16 w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border/55 px-4 py-3 text-left transition-colors hover:bg-secondary/20"
          type="button"
          onClick={() => setOpen(true)}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {selected?.title ?? "Buscar data source de Notion"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Keyword match por nombre de data source.
              </span>
            </span>
          </span>
          <Badge variant="outline" className="shrink-0">
            Cada {interval} min
          </Badge>
        </button>
        {createMapping.error ? (
          <p className="mt-2 text-sm font-medium text-destructive">
            {createMapping.error.message}
          </p>
        ) : null}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vincular data source</DialogTitle>
            <DialogDescription>
              Busca una base compartida con la integracion y configura la frecuencia de sincronizacion.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                autoFocus
                className="pl-9"
                placeholder="Buscar por keyword..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-border/50">
              <DataSourceResults
                data={dataSourcesQuery.data}
                isLoading={dataSourcesQuery.isLoading}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Frecuencia</label>
                <Select onValueChange={setInterval} value={interval}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Cada 5 min</SelectItem>
                    <SelectItem value="15">Cada 15 min</SelectItem>
                    <SelectItem value="30">Cada 30 min</SelectItem>
                    <SelectItem value="60">Cada 1 h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={!selected || createMapping.isPending} onClick={createSelectedMapping} type="button">
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function DataSourceResults({
  data,
  isLoading,
  selectedId,
  onSelect
}: {
  data?: NotionDataSourcesResponse;
  isLoading: boolean;
  selectedId: string;
  onSelect: (value: string) => void;
}) {
  if (isLoading) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">Buscando data sources...</div>;
  }

  if (!data?.items.length) {
    return <div className="px-4 py-8 text-center text-sm text-muted-foreground">No encontramos data sources.</div>;
  }

  return (
    <div className="divide-y divide-border/45">
      {data.items.map((item) => (
        <button
          key={item.id}
          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-secondary/30 ${
            selectedId === item.id ? "bg-secondary/40 text-foreground" : "text-muted-foreground"
          }`}
          type="button"
          onClick={() => onSelect(item.id)}
        >
          <span className="min-w-0">
            <span className="block truncate font-medium text-foreground">{item.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{item.id}</span>
          </span>
          {selectedId === item.id ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

function MappingsTable({ mappings }: { mappings: NotionMapping[] }) {
  const syncMapping = useSyncNotionMappingMutation();
  const updateMapping = useUpdateNotionMappingMutation();

  return (
    <Card className={notionPanelClassName}>
      <CardHeader className={notionPanelHeaderClassName}>
        <CardTitle>Mappings activos</CardTitle>
        <CardDescription>Controla la frecuencia, estado y sincronizacion manual.</CardDescription>
      </CardHeader>
      <CardContent className={notionPanelContentClassName}>
        <div className={notionTableContainerClassName}>
          <Table>
            <TableHeader className={notionTableHeaderClassName}>
              <TableRow>
                <TableHead className={notionTableHeadClassName}>Data source</TableHead>
                <TableHead className={notionTableHeadClassName}>Frecuencia</TableHead>
                <TableHead className={notionTableHeadClassName}>Estado</TableHead>
                <TableHead className={notionTableHeadClassName}>Ultimo pull</TableHead>
                <TableHead className={`${notionTableHeadClassName} text-right`}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {mappings.length ? (
                mappings.map((mapping) => (
                  <TableRow className={notionTableRowClassName} key={mapping.id}>
                    <TableCell className={`${notionTableCellClassName} font-medium`}>
                      {mapping.dataSourceName}
                    </TableCell>
                    <TableCell className={notionTableCellClassName}>{mapping.syncIntervalMinutes} min</TableCell>
                    <TableCell className={notionTableCellClassName}>
                      <Badge variant={mapping.enabled ? "default" : "secondary"}>
                        {mapping.enabled ? "Activo" : "Pausado"}
                      </Badge>
                    </TableCell>
                    <TableCell className={notionTableCellClassName}>{formatNotionDateTime(mapping.lastPullAt)}</TableCell>
                    <TableCell className={`${notionTableCellClassName} text-right`}>
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={updateMapping.isPending}
                          onClick={() =>
                            updateMapping.mutate({
                              mappingId: mapping.id,
                              input: { enabled: !mapping.enabled }
                            })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {mapping.enabled ? "Pausar" : "Activar"}
                        </Button>
                        <Button
                          disabled={syncMapping.isPending}
                          onClick={() => {
                            syncMapping.reset();
                            syncMapping.mutate(mapping.id);
                          }}
                          size="sm"
                          type="button"
                        >
                          <RefreshCw
                            className={syncMapping.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                            aria-hidden="true"
                          />
                          Sincronizar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={5}>
                    Todavia no hay data sources vinculados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {syncMapping.data?.status === "completed" ? (
          <p className="mt-3 text-sm font-medium text-emerald-600" role="status">
            Sincronización completada: {syncMapping.data.imported} importadas, {syncMapping.data.updated}{" "}
            actualizadas, {syncMapping.data.pushed} enviadas y {syncMapping.data.conflicts} conflictos.
          </p>
        ) : null}
        {syncMapping.data?.status === "failed" ? (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            La sincronización terminó con errores. Revisá la conexión con Notion e intentá nuevamente.
          </p>
        ) : null}
        {syncMapping.error ? (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            No se pudo sincronizar: {syncMapping.error.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ConflictsPanel({ enabled }: { enabled: boolean }) {
  const conflictsQuery = useNotionConflictsQuery(enabled);
  const resolveConflict = useResolveNotionConflictMutation();
  const conflicts = conflictsQuery.data?.items ?? [];

  return (
    <Card className={notionPanelClassName}>
      <CardHeader className={notionPanelHeaderClassName}>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          Conflictos pendientes
        </CardTitle>
        <CardDescription>Cuando Notion y BogApp cambian a la vez, la decision queda aca.</CardDescription>
      </CardHeader>
      <CardContent className={notionPanelContentClassName}>
        <div className={notionTableContainerClassName}>
          <Table>
            <TableHeader className={notionTableHeaderClassName}>
              <TableRow>
                <TableHead className={notionTableHeadClassName}>Data source</TableHead>
                <TableHead className={notionTableHeadClassName}>Detectado</TableHead>
                <TableHead className={notionTableHeadClassName}>Referencia</TableHead>
                <TableHead className={`${notionTableHeadClassName} text-right`}>Resolver</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child]:border-0">
              {conflicts.length ? (
                conflicts.map((conflict) => (
                  <TableRow className={notionTableRowClassName} key={conflict.id}>
                    <TableCell className={`${notionTableCellClassName} font-medium`}>
                      {conflict.dataSourceName}
                    </TableCell>
                    <TableCell className={notionTableCellClassName}>
                      {formatNotionDateTime(conflict.detectedAt)}
                    </TableCell>
                    <TableCell className={`${notionTableCellClassName} max-w-[240px] truncate`}>
                      {conflict.taskId ?? conflict.notionPageId ?? "Sin referencia"}
                    </TableCell>
                    <TableCell className={`${notionTableCellClassName} text-right`}>
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={resolveConflict.isPending}
                          onClick={() =>
                            resolveConflict.mutate({ conflictId: conflict.id, resolution: "bogapp" })
                          }
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Usar BogApp
                        </Button>
                        <Button
                          disabled={resolveConflict.isPending}
                          onClick={() =>
                            resolveConflict.mutate({ conflictId: conflict.id, resolution: "notion" })
                          }
                          size="sm"
                          type="button"
                        >
                          Usar Notion
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="h-24 text-center text-muted-foreground" colSpan={4}>
                    Sin conflictos pendientes.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
