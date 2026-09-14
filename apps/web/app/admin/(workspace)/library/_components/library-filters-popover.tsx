"use client";

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
import {
  documentTypeFilterOptions,
  libraryFilterSectionIcons
} from "../_constants/library-filter-options";
import { useLibraryFiltersPopover } from "../_hooks/use-library-filters-popover";
import type { LibraryFilters } from "../_types/library-filters.types";

export function LibraryFiltersPopover({
  disabled,
  filters,
  hasActiveFilters,
  onChange,
  onClear
}: {
  disabled: boolean;
  filters: LibraryFilters;
  hasActiveFilters: boolean;
  onChange: (filters: LibraryFilters) => void;
  onClear: () => void;
}) {
  const filterState = useLibraryFiltersPopover({ filters, onChange });

  return (
    <>
      <AdminTableFilterMenu
        active={hasActiveFilters}
        disabled={disabled}
        sections={[
          {
            icon: libraryFilterSectionIcons.type,
            label: "Tipo",
            options: [
              {
                active: filters.mimeGroups.length === 0,
                label: "Todos los tipos",
                onSelect: () => onChange({ ...filters, mimeGroups: [] })
              },
              ...documentTypeFilterOptions.map((option) => ({
                checked: filters.mimeGroups.includes(option.value),
                icon: option.icon,
                label: option.label,
                multiple: true,
                onCheckedChange: (checked: boolean) =>
                  filterState.toggleMimeGroup(option.value, checked)
              }))
            ]
          },
          {
            icon: libraryFilterSectionIcons.category,
            label: "Categoria",
            options: [
              { active: filters.categoryId === "", label: "Todas", onSelect: () => onChange({ ...filters, categoryId: "" }) },
              {
                active: Boolean(filters.categoryId),
                label: "Usar ID...",
                valueLabel: filters.categoryId || undefined,
                onSelect: () => filterState.openIdDialog("categoryId")
              }
            ]
          }
        ]}
        footer={
          <AdminTableFilterClearItem disabled={disabled || !hasActiveFilters} onClear={onClear} />
        }
      />

      <Dialog
        open={filterState.idDialog.open}
        onOpenChange={(open) => filterState.setIdDialog((current) => ({ ...current, open }))}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{filterState.idDialog.title}</DialogTitle>
            <DialogDescription>Ingresa el identificador exacto para refinar la biblioteca.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={filterState.submitIdDialog}>
            <label className="grid gap-1.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">{filterState.idDialog.label}</span>
              <Input
                autoFocus
                type="text"
                value={filterState.idDialog.value}
                onChange={(event) => filterState.updateIdDialogValue(event.target.value)}
                placeholder="Pega el ID"
                disabled={disabled}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={filterState.closeIdDialog}
              >
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
