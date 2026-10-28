"use client";
import { AlertCircle, BellRing, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { AdminTableHeader } from "@/components/dashboard/admin-table-header";
import { AdminTableHeaderActionButton } from "@/components/dashboard/admin-table-header-action-button";
import { dashboardSurfaceClassName } from "@/components/dashboard/styles";
import {
  type PlatformAnnouncementsList,
  type PlatformAnnouncementsQuery,
  type PlatformAnnouncementsSummary
} from "../_api/announcements.api";
import { useAnnouncementsView } from "../_hooks/use-announcements-view";
import { hasAnnouncementFilters } from "../_utils/announcement-query";
import {
  announcementCategoryLabel,
  announcementLifecycleLabel,
  announcementSeverityLabel,
  formatAnnouncementDateTime
} from "../_utils/announcement-presenters";
import { AnnouncementCategoryPicker } from "./announcement-category-picker";
import { AnnouncementComposer } from "./announcement-composer";
import { AnnouncementDetailDialog } from "./announcement-detail-dialog";
import { AnnouncementFilters } from "./announcement-filters";
import { AnnouncementMetrics } from "./announcement-metrics";
import { AnnouncementRowActions } from "./announcement-row-actions";
import { AnnouncementsTableState } from "./announcements-table-state";

export function AnnouncementsView({
  cursorStack,
  data,
  error,
  query,
  summary
}: {
  cursorStack: string[];
  data?: PlatformAnnouncementsList;
  error: string | null;
  query: PlatformAnnouncementsQuery;
  summary?: PlatformAnnouncementsSummary;
}) {
  const items = data?.items ?? [];
  const {
    actionBusy,
    actionError,
    category,
    changeFilter,
    chooseCategory,
    clearActionError,
    clearFilters,
    composerOpen,
    confirmCancel,
    detailOpen,
    loadDetail,
    nextPage,
    pickerOpen,
    previousPage,
    refresh,
    runAction,
    selectedDetail,
    setComposerOpen,
    setConfirmCancel,
    setDetailOpen,
    setPickerOpen,
    setSelectedDetail
  } = useAnnouncementsView({ cursorStack, data });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden md:gap-4">
      <AnnouncementMetrics summary={summary} />
      <Card
        data-admin-surface
        className={`${dashboardSurfaceClassName} flex min-h-0 flex-1 flex-col gap-0 overflow-hidden border-0 py-0 shadow-[var(--admin-card-shadow)]`}
      >
        <AdminTableHeader
          title="Comunicados"
          description="Administrá mensajes globales y segmentados para los estudios de Temis."
          icon={BellRing}
          actions={
            <>
              <AnnouncementFilters
                active={hasAnnouncementFilters(query)}
                query={query}
                onChange={changeFilter}
                onClear={clearFilters}
              />
              <AdminTableHeaderActionButton icon={RefreshCw} label="Actualizar" onClick={refresh} />
              <AdminTableHeaderActionButton
                icon={Plus}
                label="Crear comunicado"
                tone="primary"
                onClick={() => setPickerOpen(true)}
              />
            </>
          }
        />
        {actionError ? (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4" />
            {actionError}
            <Button className="ml-auto h-7" variant="ghost" onClick={clearActionError}>
              Cerrar
            </Button>
          </div>
        ) : null}
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 md:px-4">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl [&_[data-slot=table-container]]:h-full [&_[data-slot=table-container]]:overflow-auto">
            <Table className="min-w-[1020px] text-xs">
              <TableHeader className="bg-[color-mix(in_oklab,var(--muted)_28%,transparent)] [&_tr]:border-0">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-9 px-3">Comunicado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Audiencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Actualización</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!error
                  ? items.map((item) => (
                      <TableRow
                        key={item.id}
                        className="h-12 border-border/40 hover:bg-secondary/30"
                      >
                        <TableCell className="max-w-[330px] px-3 py-1.5">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {item.body}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-1">
                            <span>{announcementCategoryLabel[item.category]}</span>
                            <Badge
                              className="w-fit"
                              variant={item.severity === "critical" ? "destructive" : "secondary"}
                            >
                              {announcementSeverityLabel[item.severity]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.audience === "all_tenants"
                            ? "Todos los estudios"
                            : `${item.targetCount} estudios`}
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.lifecycle === "active" ? "default" : "secondary"}>
                            {announcementLifecycleLabel[item.lifecycle]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <p>{formatAnnouncementDateTime(item.startsAt)}</p>
                          <p className="mt-1">hasta {formatAnnouncementDateTime(item.endsAt)}</p>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <p>{formatAnnouncementDateTime(item.updatedAt)}</p>
                          <p className="mt-1 truncate">por {item.createdByName}</p>
                        </TableCell>
                        <TableCell>
                          <AnnouncementRowActions
                            item={item}
                            busy={actionBusy === item.id}
                            onView={() => void loadDetail(item, "view")}
                            onEdit={() => void loadDetail(item, "edit")}
                            onAction={(action) =>
                              action === "cancel"
                                ? setConfirmCancel(item)
                                : void runAction(item, action)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
            {error ? (
              <AnnouncementsTableState
                icon={<AlertCircle className="size-5" />}
                message={error}
                action={
                  <Button size="sm" variant="outline" onClick={refresh}>
                    Reintentar
                  </Button>
                }
              />
            ) : null}
            {!error && !items.length ? (
              <AnnouncementsTableState
                icon={<BellRing className="size-5" />}
                message={
                  hasAnnouncementFilters(query)
                    ? "No hay comunicados para los filtros seleccionados."
                    : "Todavía no hay comunicados."
                }
                action={
                  hasAnnouncementFilters(query) ? (
                    <Button size="sm" variant="outline" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-between border-t border-border/40 px-1">
            <p className="text-xs text-muted-foreground">
              {items.length} resultados en esta página
            </p>
            <div className="flex items-center gap-2">
              <Button
                className="h-8 px-2.5"
                variant="outline"
                disabled={!cursorStack.length}
                onClick={previousPage}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-16 text-center text-xs text-muted-foreground">
                Página {cursorStack.length + 1}
              </span>
              <Button
                className="h-8 px-2.5"
                variant="outline"
                disabled={!data?.pageInfo.hasNextPage}
                onClick={nextPage}
                aria-label="Página siguiente"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AnnouncementCategoryPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={chooseCategory}
      />
      <AnnouncementComposer
        category={category}
        detail={selectedDetail}
        open={composerOpen}
        onOpenChange={(open) => {
          setComposerOpen(open);
          if (!open) setSelectedDetail(null);
        }}
        onSaved={refresh}
      />
      <AnnouncementDetailDialog
        detail={selectedDetail}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedDetail(null);
        }}
      />
      <Dialog
        open={Boolean(confirmCancel)}
        onOpenChange={(open) => !open && setConfirmCancel(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar comunicado</DialogTitle>
            <DialogDescription>
              El comunicado dejará de mostrarse a los estudios. La acción quedará auditada.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmCancel(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={Boolean(actionBusy)}
              onClick={() => confirmCancel && void runAction(confirmCancel, "cancel")}
            >
              Cancelar comunicado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
