"use client";

import { Eye, EyeOff, GripVertical } from "lucide-react";
import type { TaskBoardVisibleProperty } from "../../../../cases/_types/cases.types";
import { getPropertyLabel } from "../settings-labels";
import { SettingsHeader, SettingsSearch } from "../settings-primitives";
import type { visiblePropertyOptions } from "../settings-options";

type PropertyVisibilityScreenProps = {
  onBack: () => void;
  onClose: () => void;
  onHideAll: () => void;
  onSearchChange: (value: string) => void;
  onToggleProperty: (property: TaskBoardVisibleProperty) => void;
  properties: typeof visiblePropertyOptions;
  search: string;
  visibleProperties: Set<TaskBoardVisibleProperty>;
};

export function PropertyVisibilityScreen({
  onBack,
  onClose,
  onHideAll,
  onSearchChange,
  onToggleProperty,
  properties,
  search,
  visibleProperties
}: PropertyVisibilityScreenProps) {
  return (
    <div className="grid gap-2">
      <SettingsHeader title="Visibilidad de la propiedad" onBack={onBack} onClose={onClose} />
      <SettingsSearch
        placeholder="Buscar una propiedad..."
        value={search}
        onChange={onSearchChange}
      />
      <div className="flex items-center justify-between px-1 text-[11px]">
        <span className="font-medium text-muted-foreground">Visibles en la tabla</span>
        <button className="text-primary" type="button" onClick={onHideAll}>
          Ocultar todo
        </button>
      </div>
      <div className="grid gap-0.5">
        {properties.map((property) => {
          const Icon = property.icon;
          const isName = property.value === "name";
          const visible =
            isName || visibleProperties.has(property.value as TaskBoardVisibleProperty);

          return (
            <button
              className="flex h-7 items-center gap-2 rounded-md px-1 text-left text-[11px] hover:bg-secondary/50"
              disabled={isName}
              key={property.value}
              type="button"
              onClick={() => {
                if (!isName) {
                  onToggleProperty(property.value as TaskBoardVisibleProperty);
                }
              }}
            >
              <GripVertical className="size-3 text-muted-foreground/70" aria-hidden="true" />
              <Icon className="size-3.5 text-foreground" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{getPropertyLabel(property.value)}</span>
              {visible ? (
                <Eye className="size-3.5 text-foreground" aria-hidden="true" />
              ) : (
                <EyeOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
