"use client";

import { useState, type FormEvent } from "react";
import { Search, UserCheck } from "lucide-react";
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
} from "@/components/dashboard/admin-table-filter-menu";
import type { PlatformUsersQuery } from "../../_api/platform.api";

export function PlatformUsersToolbar({
  busy,
  hasActiveFilters,
  search,
  status,
  onClearFilters,
  onSearchChange,
  onStatusChange
}: {
  busy: boolean;
  hasActiveFilters: boolean;
  search: string;
  status?: PlatformUsersQuery["status"];
  onClearFilters: () => void;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: PlatformUsersQuery["status"]) => void;
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
        disabled={busy}
        subMenuSide="right"
        sections={[
          {
            icon: Search,
            label: "Búsqueda",
            options: [
              { active: search.trim() === "", label: "Todos", onSelect: () => onSearchChange("") },
              {
                active: Boolean(search.trim()),
                label: "Nombre o email",
                valueLabel: search.trim() || undefined,
                onSelect: openSearchDialog
              }
            ]
          },
          {
            icon: UserCheck,
            label: "Estado",
            options: [
              {
                active: !status,
                label: "Todos los estados",
                onSelect: () => onStatusChange(undefined)
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
              }
            ]
          }
        ]}
        footer={
          <AdminTableFilterClearItem
            disabled={busy || !hasActiveFilters}
            onClear={onClearFilters}
          />
        }
      />
      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar usuario</DialogTitle>
            <DialogDescription>Ingresa el nombre completo o email de la cuenta.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submitSearch}>
            <label className="grid gap-1.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">Búsqueda</span>
              <Input
                autoFocus
                disabled={busy}
                placeholder="Ej. Ana Pérez o ana@estudio.com"
                value={draftSearch}
                onChange={(event) => setDraftSearch(event.target.value)}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSearchDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                Aplicar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
