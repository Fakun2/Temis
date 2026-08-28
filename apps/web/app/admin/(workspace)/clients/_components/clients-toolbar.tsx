"use client";

import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import type { ClientStatusFilter, ClientTypeFilter } from "../_hooks/use-clients-page-state";

export function ClientsToolbar({
  busy,
  hasActiveFilters,
  search,
  status,
  type,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onTypeChange
}: {
  busy: boolean;
  hasActiveFilters: boolean;
  search: string;
  status: ClientStatusFilter;
  type: ClientTypeFilter;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ClientStatusFilter) => void;
  onTypeChange: (value: ClientTypeFilter) => void;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border/30 px-3 py-3 md:flex-row md:items-center md:px-4 xl:px-5">
      <div className="relative min-w-0 flex-1 md:max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label="Buscar clientes"
          className="h-9 bg-background pl-9 pr-9"
          placeholder="Buscar por nombre, DNI, CUIT, email..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        {busy ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-label="Actualizando clientes"
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={(value) => onTypeChange(value as ClientTypeFilter)}>
          <SelectTrigger className="min-w-32 bg-background" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="human">Persona</SelectItem>
            <SelectItem value="legal_entity">Empresa</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(value) => onStatusChange(value as ClientStatusFilter)}
        >
          <SelectTrigger className="min-w-40 bg-background" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="operational">Todos operativos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
            <SelectItem value="archived">Archivados</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9 px-2.5 text-muted-foreground"
            onClick={onClearFilters}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
