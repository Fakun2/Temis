"use client";

import { useState, type FormEvent } from "react";
import { Activity, AlertTriangle, Building2, Search, Tags } from "lucide-react";
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
import type { PlatformAnnouncementsQuery } from "../_api/announcements.api";

export function AnnouncementFilters({
  active,
  query,
  onChange,
  onClear
}: {
  active: boolean;
  query: PlatformAnnouncementsQuery;
  onChange: (key: keyof PlatformAnnouncementsQuery, value?: string) => void;
  onClear: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [draft, setDraft] = useState(query.search ?? "");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onChange("search", draft.trim() || undefined);
    setSearchOpen(false);
  };
  return (
    <>
      <AdminTableFilterMenu
        active={active}
        subMenuSide="right"
        sections={[
          {
            icon: Search,
            label: "Búsqueda",
            options: [
              { active: !query.search, label: "Sin búsqueda", onSelect: () => onChange("search") },
              {
                active: Boolean(query.search),
                label: "Título o mensaje",
                valueLabel: query.search,
                onSelect: () => {
                  setDraft(query.search ?? "");
                  setSearchOpen(true);
                }
              }
            ]
          },
          {
            icon: Activity,
            label: "Vigencia",
            options: options(query.activity, onChange, "activity", [
              ["", "Todas"],
              ["active", "Activos"],
              ["inactive", "Inactivos"]
            ])
          },
          {
            icon: Activity,
            label: "Estado editorial",
            options: options(query.status, onChange, "status", [
              ["", "Todos"],
              ["draft", "Borradores"],
              ["published", "Publicados"],
              ["cancelled", "Cancelados"]
            ])
          },
          {
            icon: Tags,
            label: "Tipo",
            options: options(query.category, onChange, "category", [
              ["", "Todos"],
              ["general", "General"],
              ["maintenance", "Mantenimiento"],
              ["deployment", "Despliegue"],
              ["incident", "Incidente"]
            ])
          },
          {
            icon: AlertTriangle,
            label: "Criticidad",
            options: options(query.severity, onChange, "severity", [
              ["", "Todas"],
              ["info", "Informativa"],
              ["warning", "Advertencia"],
              ["critical", "Crítica"]
            ])
          },
          {
            icon: Building2,
            label: "Audiencia",
            options: options(query.audience, onChange, "audience", [
              ["", "Todas"],
              ["all_tenants", "Todos los estudios"],
              ["selected_tenants", "Estudios seleccionados"]
            ])
          }
        ]}
        footer={<AdminTableFilterClearItem disabled={!active} onClear={onClear} />}
      />
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buscar comunicado</DialogTitle>
            <DialogDescription>Buscá por título o contenido del mensaje.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={submit}>
            <Input
              autoFocus
              maxLength={120}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ej. mantenimiento programado"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSearchOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Aplicar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function options(
  current: string | undefined,
  onChange: (key: keyof PlatformAnnouncementsQuery, value?: string) => void,
  key: keyof PlatformAnnouncementsQuery,
  values: Array<[string, string]>
) {
  return values.map(([value, label]) => ({
    active: current === (value || undefined),
    label,
    onSelect: () => onChange(key, value || undefined)
  }));
}
