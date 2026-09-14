"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { casesQueries } from "../../_api/cases.query-controller";
import { caseInputClassName, caseSelectTriggerClassName } from "../../_constants/cases.constants";
import { useCasesQuery } from "../../_hooks/use-cases-query";
import type { ParticipantOption } from "../../_types/cases.types";

const pageSize = 20;
const allFilterValue = "all";

export function ParticipantSelectorDialog({
  disabled = false,
  emptyLabel = "Seleccionar personas",
  onApply,
  selectedMembershipIds,
  title
}: {
  disabled?: boolean;
  emptyLabel?: string;
  onApply: (membershipIds: string[]) => void;
  selectedMembershipIds: string[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [practiceAreaId, setPracticeAreaId] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [loadedItems, setLoadedItems] = useState<ParticipantOption[]>([]);
  const [pageInfo, setPageInfo] = useState({ hasNextPage: false, nextCursor: null as string | null });
  const [filterOptions, setFilterOptions] = useState<{
    practiceAreas: Array<{ id: string; name: string }>;
    roles: Array<{ code: string; name: string }>;
  }>({ practiceAreas: [], roles: [] });

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    setDraftSelectedIds([...new Set(selectedMembershipIds)]);
    setSearch("");
    setDebouncedSearch("");
    setRole("");
    setPracticeAreaId("");
    setCursor(undefined);
    setLoadedItems([]);
    setPageInfo({ hasNextPage: false, nextCursor: null });
    setFilterOptions({ practiceAreas: [], roles: [] });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCursor(undefined);
    setLoadedItems([]);
    setPageInfo({ hasNextPage: false, nextCursor: null });
  }, [debouncedSearch, open, practiceAreaId, role]);

  const params = useMemo(
    () => ({
      cursor,
      limit: pageSize,
      practiceAreaId: practiceAreaId || undefined,
      role: role || undefined,
      search: debouncedSearch || undefined
    }),
    [cursor, debouncedSearch, practiceAreaId, role]
  );
  const participantsQuery = useCasesQuery(casesQueries.participantOptions(params, open));

  useEffect(() => {
    const page = participantsQuery.data?.items;
    if (!open || !page) return;

    setLoadedItems((current) =>
      cursor ? mergeParticipantPages(current, page) : page
    );
    setFilterOptions(participantsQuery.data.filterOptions);
    setPageInfo({
      hasNextPage: participantsQuery.data.pageInfo.hasNextPage,
      nextCursor: participantsQuery.data.pageInfo.nextCursor
    });
  }, [cursor, open, participantsQuery.data?.items]);

  const selectedIds = new Set(draftSelectedIds);
  const selectedNames = loadedItems
    .filter((item) => selectedIds.has(item.id))
    .map((item) => item.fullName);
  const selectedSummary = selectedMembershipIds.length
    ? `${selectedMembershipIds.length} ${selectedMembershipIds.length === 1 ? "persona seleccionada" : "personas seleccionadas"}`
    : emptyLabel;

  function toggleMember(memberId: string, checked: boolean) {
    setDraftSelectedIds((current) => {
      const selected = new Set(current);
      if (checked) selected.add(memberId);
      else selected.delete(memberId);
      return [...selected];
    });
  }

  function updateSearch(value: string) {
    setSearch(value);
  }

  function updateRole(value: string) {
    setRole(value === allFilterValue ? "" : value);
  }

  function updatePracticeArea(value: string) {
    setPracticeAreaId(value === allFilterValue ? "" : value);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        className="h-12 w-full justify-start rounded-2xl border-border/40 bg-card px-4 shadow-none hover:bg-secondary/40"
        disabled={disabled}
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
      >
        <Users className="size-4" aria-hidden="true" />
        <span className="truncate">{selectedSummary}</span>
      </Button>
      {selectedMembershipIds.length > 0 && selectedNames.length > 0 ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {selectedNames.slice(0, 2).join(", ")}
          {selectedMembershipIds.length > 2 ? ` y ${selectedMembershipIds.length - 2} más` : ""}
        </p>
      ) : null}
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Buscá y filtrá integrantes activos del estudio. Los cambios se aplican al confirmar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-2xl border border-border/40 bg-secondary/15 p-3 sm:p-4">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              className={`${caseInputClassName} w-full pl-10`}
              onChange={(event) => updateSearch(event.target.value)}
              placeholder="Buscar por nombre o email"
              value={search}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={role || allFilterValue} onValueChange={updateRole}>
              <SelectTrigger className={caseSelectTriggerClassName}><SelectValue placeholder="Todos los roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allFilterValue}>Todos los roles</SelectItem>
                {filterOptions.roles.map((option) => (
                  <SelectItem key={option.code} value={option.code}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={practiceAreaId || allFilterValue} onValueChange={updatePracticeArea}>
              <SelectTrigger className={caseSelectTriggerClassName}><SelectValue placeholder="Todas las áreas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allFilterValue}>Todas las áreas</SelectItem>
                {filterOptions.practiceAreas.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="min-h-[12rem] max-h-[18rem] overflow-y-auto rounded-2xl border border-border/40 bg-card shadow-inner sm:max-h-[22rem]">
          {participantsQuery.isLoading && loadedItems.length === 0 ? (
            <div className="flex min-h-36 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Cargando integrantes…</div>
          ) : participantsQuery.error ? (
            <p className="p-4 text-sm text-destructive">No pudimos cargar los integrantes. Intentá nuevamente.</p>
          ) : loadedItems.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No hay integrantes activos que coincidan con los filtros.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {loadedItems.map((member) => {
                const checked = selectedIds.has(member.id);
                return (
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/35" key={member.id}>
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleMember(member.id, value === true)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{member.fullName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[member.role?.name, member.practiceAreas.map((area) => area.name).join(", ") || member.email].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {pageInfo.hasNextPage ? (
          <Button
            className="w-full rounded-xl"
            disabled={participantsQuery.isFetching || !pageInfo.nextCursor}
            onClick={() => setCursor(pageInfo.nextCursor ?? undefined)}
            type="button"
            variant="outline"
          >
            {participantsQuery.isFetching ? <Loader2 className="size-4 animate-spin" /> : null}
            {participantsQuery.isFetching ? "Cargando integrantes…" : "Cargar más integrantes"}
          </Button>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
          <span className="text-sm text-muted-foreground">{draftSelectedIds.length} seleccionados</span>
          <div className="flex gap-2">
            <Button onClick={() => setOpen(false)} type="button" variant="outline">Cancelar</Button>
            <Button onClick={() => { onApply(draftSelectedIds); setOpen(false); }} type="button">Aplicar selección</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function mergeParticipantPages(current: ParticipantOption[], next: ParticipantOption[]) {
  const items = new Map(current.map((item) => [item.id, item]));
  next.forEach((item) => items.set(item.id, item));
  return [...items.values()];
}
