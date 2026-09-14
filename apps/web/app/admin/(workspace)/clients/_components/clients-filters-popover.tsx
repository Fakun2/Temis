"use client";

import { useState, type FormEvent } from "react";
import { Building2, Search, UserRound, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AdminTableFilterClearItem,
  AdminTableFilterMenu
} from "../../_components/admin-table-filter-menu";
import type { ClientStatusFilter, ClientTypeFilter } from "../_hooks/use-clients-page-state";

export function ClientsFiltersPopover({
  disabled,
  hasActiveFilters,
  search,
  status,
  type,
  onClearFilters,
  onSearchChange,
  onStatusChange,
  onTypeChange
}: {
  disabled: boolean;
  hasActiveFilters: boolean;
  search: string;
  status: ClientStatusFilter;
  type: ClientTypeFilter;
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ClientStatusFilter) => void;
  onTypeChange: (value: ClientTypeFilter) => void;
}) {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(search);

  function openSearchDialog() {
    setDraftSearch(search);
    setSearchDialogOpen(true);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearchChange(draftSearch.trim());
    setSearchDialogOpen(false);
  }

  return (
    <>
      <AdminTableFilterMenu
        active={hasActiveFilters}
        disabled={disabled}
        subMenuSide="right"
        sections={[
          {
            icon: Search,
            label: "Busqueda",
            options: [
              {
                active: search.trim() === "",
                label: "Todos",
                onSelect: () => onSearchChange("")
              },
              {
                active: Boolean(search.trim()),
                label: "Nombre, apellido o documento",
                valueLabel: search.trim() || undefined,
                onSelect: openSearchDialog
              }
            ]
          },
          {
            icon: UsersRound,
            label: "Tipo",
            options: [
              {
                active: type === "all",
                label: "Todos los tipos",
                onSelect: () => onTypeChange("all")
              },
              {
                active: type === "human",
                icon: UserRound,
                label: "Persona",
                onSelect: () => onTypeChange("human")
              },
              {
                active: type === "legal_entity",
                icon: Building2,
                label: "Empresa",
                onSelect: () => onTypeChange("legal_entity")
              }
            ]
          },
          {
            icon: UserRound,
            label: "Estado",
            options: [
              {
                active: status === "operational",
                label: "Todos operativos",
                onSelect: () => onStatusChange("operational")
              },
              {
                active: status === "active",
                label: "Activos",
                onSelect: () => onStatusChange("active")
              },
              {
                active: status === "inactive",
                label: "Inactivos",
                onSelect: () => onStatusChange("inactive")
              },
              {
                active: status === "archived",
                label: "Archivados",
                onSelect: () => onStatusChange("archived")
              }
            ]
          }
        ]}
        footer={
          <AdminTableFilterClearItem
            disabled={disabled || !hasActiveFilters}
            onClear={onClearFilters}
          />
        }
      />

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar cliente</DialogTitle>
            <DialogDescription>
              Ingresa nombre, apellido, DNI, CUIL, CUIT, email o telefono.
            </DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitSearch}>
            <label className="grid gap-1.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">Busqueda</span>
              <Input
                autoFocus
                disabled={disabled}
                placeholder="Ej. Perez, 30111222, Empresa SA"
                type="text"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSearchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={disabled}>
                Aplicar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
