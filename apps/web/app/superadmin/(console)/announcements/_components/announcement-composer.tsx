"use client";

import { Building2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type AnnouncementAudience,
  type AnnouncementCategory,
  type AnnouncementDeliveryMode,
  type AnnouncementSeverity,
  type PlatformAnnouncementDetail
} from "../_api/announcements.api";
import { useAnnouncementComposer } from "../_hooks/use-announcement-composer";

export function AnnouncementComposer({
  category,
  detail,
  open,
  onOpenChange,
  onSaved
}: {
  category?: AnnouncementCategory;
  detail?: PlatformAnnouncementDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const editing = Boolean(detail);
  const {
    busy,
    draft,
    error,
    hasMoreTenants,
    loadMoreTenants,
    loadingTenants,
    options,
    patch,
    selected,
    selectedIds,
    setTenantSearch,
    submit,
    tenantSearch,
    toggleTenant
  } = useAnnouncementComposer({ category, detail, onOpenChange, onSaved, open });

  return (
    <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-border/40 px-6 py-5">
          <DialogTitle>{editing ? "Editar borrador" : "Emitir comunicado"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Actualizá el contenido antes de publicarlo."
              : "Definí el mensaje, la audiencia y su vigencia."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-5 px-6 pb-6" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo">
              <Select
                value={draft.category}
                onValueChange={(value) => patch("category", value as AnnouncementCategory)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Criticidad">
              <Select
                value={draft.severity}
                onValueChange={(value) => patch("severity", value as AnnouncementSeverity)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Informativa</SelectItem>
                  <SelectItem value="warning">Advertencia</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Título">
            <Input
              maxLength={120}
              value={draft.title}
              onChange={(event) => patch("title", event.target.value)}
              placeholder="Título visible para los estudios"
            />
          </Field>
          <Field label="Mensaje">
            <Textarea
              className="min-h-28"
              maxLength={1000}
              value={draft.body}
              onChange={(event) => patch("body", event.target.value)}
              placeholder="Describí el comunicado con claridad"
            />
            <span className="text-right text-[11px] text-muted-foreground">
              {draft.body.length}/1000
            </span>
          </Field>
          <Field label="Audiencia">
            <Select
              value={draft.audience}
              onValueChange={(value) => patch("audience", value as AnnouncementAudience)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_tenants">Todos los estudios</SelectItem>
                <SelectItem value="selected_tenants">Estudios seleccionados</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {draft.audience === "selected_tenants" ? (
            <div className="grid gap-3 rounded-2xl border border-border/50 bg-secondary/15 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={tenantSearch}
                  onChange={(event) => setTenantSearch(event.target.value)}
                  placeholder="Buscar estudio"
                />
              </div>
              {selected.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((tenant) => (
                    <Button
                      key={tenant.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => toggleTenant(tenant)}
                    >
                      {tenant.name} ×
                    </Button>
                  ))}
                </div>
              ) : null}
              <div className="max-h-36 overflow-y-auto rounded-xl border border-border/40 bg-background/50">
                {loadingTenants && !options.length ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    Buscando estudios…
                  </p>
                ) : options.length ? (
                  options.map((tenant) => (
                    <label
                      key={tenant.id}
                      className="flex cursor-pointer items-center gap-3 border-b border-border/30 px-3 py-2.5 text-sm last:border-0"
                    >
                      <Checkbox
                        checked={selectedIds.has(tenant.id)}
                        onCheckedChange={() => toggleTenant(tenant)}
                      />
                      <span className="truncate">{tenant.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    No hay estudios disponibles.
                  </p>
                )}
                {hasMoreTenants ? (
                  <div className="border-t border-border/30 p-2 text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={loadingTenants}
                      onClick={() => void loadMoreTenants()}
                    >
                      {loadingTenants ? "Cargando…" : "Cargar más estudios"}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          {!editing ? (
            <Field label="Emisión">
              <Select
                value={draft.deliveryMode}
                onValueChange={(value) => patch("deliveryMode", value as AnnouncementDeliveryMode)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Guardar borrador</SelectItem>
                  <SelectItem value="publish_now">Publicar ahora</SelectItem>
                  <SelectItem value="schedule">Programar</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {draft.deliveryMode !== "publish_now" ? (
              <Field label="Inicio">
                <Input
                  type="datetime-local"
                  value={draft.startsAt}
                  onChange={(event) => patch("startsAt", event.target.value)}
                />
              </Field>
            ) : (
              <div className="flex items-center gap-2 rounded-xl bg-secondary/30 px-3 text-sm text-muted-foreground">
                <Building2 className="size-4" />
                Comienza al publicar
              </div>
            )}
            <Field label="Finalización">
              <Input
                type="datetime-local"
                value={draft.endsAt}
                onChange={(event) => patch("endsAt", event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Etiqueta del enlace">
              <Input
                maxLength={40}
                value={draft.linkLabel}
                onChange={(event) => patch("linkLabel", event.target.value)}
                placeholder="Más información"
              />
            </Field>
            <Field label="Enlace">
              <Input
                maxLength={500}
                value={draft.linkUrl}
                onChange={(event) => patch("linkUrl", event.target.value)}
                placeholder="https://… o /admin/…"
              />
            </Field>
          </div>
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing ? "Guardar cambios" : deliveryLabel[draft.deliveryMode]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
const categoryOptions: Array<[AnnouncementCategory, string]> = [
  ["general", "General"],
  ["maintenance", "Mantenimiento"],
  ["deployment", "Despliegue"],
  ["incident", "Incidente"]
];
const deliveryLabel: Record<AnnouncementDeliveryMode, string> = {
  draft: "Guardar borrador",
  publish_now: "Publicar ahora",
  schedule: "Programar"
};
