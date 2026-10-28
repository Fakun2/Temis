"use client";

import { ArrowLeft, Eye, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  NewsletterBlockV2,
  NewsletterContentV2
} from "@/components/newsletter/newsletter-types";
import { parseNewsletterVideoUrl } from "@/components/newsletter/newsletter-utils";
import type { TenantOption } from "../../announcements/_api/announcements.api";
import { categories, type Draft } from "../_lib/newsletter-builder-model";
import { Field } from "./newsletter-fields";
import { MediaLayoutControls } from "./newsletter-media";
import { RichEditor } from "./newsletter-rich-editor";
import { DrawingEditor } from "./newsletter-drawing-editor";
import styles from "./newsletter-builder.module.css";

export function BuilderTopbar({
  title,
  busy,
  readOnly,
  onBack,
  onSave,
  onPreview,
  onSchedule,
  onPublish
}: {
  title: string;
  busy: boolean;
  readOnly?: boolean;
  onBack: () => void;
  onSave: () => void;
  onPreview: () => void;
  onSchedule: () => void;
  onPublish: () => void;
}) {
  return (
    <header
      className={`${styles.topbar} flex flex-wrap items-center gap-2 border-b border-border/50 bg-card px-4 py-3 sm:px-5 [&_button_svg]:size-4 [&_button_svg]:stroke-[1.5]`}
    >
      <Button
        size="icon"
        variant="ghost"
        className="size-9 rounded-xl"
        aria-label="Volver a newsletters"
        onClick={onBack}
      >
        <ArrowLeft />
      </Button>
      <div className="mr-auto min-w-[140px] flex-1 border-l border-border/60 pl-3">
        <p className="truncate text-sm font-semibold">{title || "Newsletter sin título"}</p>
        <p className="text-[11px] text-muted-foreground">
          {readOnly ? "Solo lectura" : busy ? "Guardando…" : "Borrador"}
        </p>
      </div>
      <Button size="sm" variant="outline" className="rounded-xl" onClick={onPreview}>
        <Eye /> Vista previa
      </Button>
      {!readOnly ? (
        <>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={onSave}
          >
            <Save /> Guardar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={onSchedule}
          >
            Programar
          </Button>
          <Button size="sm" className="rounded-xl" disabled={busy} onClick={onPublish}>
            Publicar
          </Button>
        </>
      ) : null}
    </header>
  );
}
export function PanelButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Plus;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-colors sm:text-sm ${active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/70 hover:text-foreground"}`}
      onClick={onClick}
    >
      <Icon className="size-3.5 shrink-0 stroke-[1.5]" />
      <span>{label}</span>
    </button>
  );
}
export function IconButton({
  label,
  disabled,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-7"
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}
export function ThemeEditor({
  theme,
  onChange
}: {
  theme: NewsletterContentV2["theme"];
  onChange: (theme: NewsletterContentV2["theme"]) => void;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      <Field label="Ancho">
        <select
          className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
          value={theme.width}
          onChange={(event) =>
            onChange({ ...theme, width: event.target.value as typeof theme.width })
          }
        >
          <option value="compact">Compacto · 640 px</option>
          <option value="standard">Estándar · 720 px</option>
          <option value="wide">Amplio · 880 px</option>
        </select>
      </Field>
      <Field label="Fuente">
        <select
          className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-sm"
          value={theme.fontFamily}
          onChange={(event) =>
            onChange({ ...theme, fontFamily: event.target.value as typeof theme.fontFamily })
          }
        >
          <option value="sans">Temis Sans</option>
          <option value="serif">Temis Serif</option>
          <option value="mono">Temis Mono</option>
        </select>
      </Field>
    </div>
  );
}
export function SettingsEditor({
  draft,
  onChange,
  options,
  search,
  setSearch
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  options: TenantOption[];
  search: string;
  setSearch: (value: string) => void;
}) {
  return (
    <div className={`${styles.publication} grid gap-4`}>
      <Field label="Categoría">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={draft.newsletterCategory}
          onChange={(event) =>
            onChange({
              ...draft,
              newsletterCategory: event.target.value as Draft["newsletterCategory"]
            })
          }
        >
          {Object.entries(categories).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Audiencia">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={draft.audience}
          onChange={(event) =>
            onChange({ ...draft, audience: event.target.value as Draft["audience"] })
          }
        >
          <option value="all_tenants">Todos los estudios</option>
          <option value="selected_tenants">Estudios seleccionados</option>
        </select>
      </Field>
      {draft.audience === "selected_tenants" ? (
        <>
          <Input
            placeholder="Buscar estudio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-48 space-y-2 overflow-auto">
            {options.map((tenant) => (
              <label key={tenant.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.targetTenantIds.includes(tenant.id)}
                  onChange={(event) =>
                    onChange({
                      ...draft,
                      targetTenantIds: event.target.checked
                        ? [...draft.targetTenantIds, tenant.id]
                        : draft.targetTenantIds.filter((id) => id !== tenant.id)
                    })
                  }
                />
                {tenant.name}
              </label>
            ))}
          </div>
        </>
      ) : null}
      <Field label="Inicio">
        <Input
          type="datetime-local"
          value={draft.startsAt}
          onChange={(event) => onChange({ ...draft, startsAt: event.target.value })}
        />
      </Field>
      <Field label="Finalización opcional">
        <Input
          type="datetime-local"
          value={draft.endsAt}
          onChange={(event) => onChange({ ...draft, endsAt: event.target.value })}
        />
      </Field>
    </div>
  );
}

export function BlockEditor({
  block,
  onChange,
  onUpload
}: {
  block: NewsletterBlockV2;
  onChange: (block: NewsletterBlockV2) => void;
  onUpload: (file: File) => void;
}) {
  if (block.type === "richText")
    return (
      <RichEditor
        document={block.document}
        onChange={(document) => onChange({ ...block, document })}
      />
    );
  if (block.type === "callout")
    return (
      <div className="grid gap-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={block.tone}
          onChange={(event) =>
            onChange({ ...block, tone: event.target.value as typeof block.tone })
          }
        >
          <option value="info">Información</option>
          <option value="success">Éxito</option>
          <option value="warning">Advertencia</option>
        </select>
        <RichEditor
          document={block.document}
          onChange={(document) => onChange({ ...block, document })}
        />
      </div>
    );
  if (block.type === "image" || block.type === "gif")
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={block.type === "gif" ? "GIF" : "Imagen"}>
          <Input
            type="file"
            accept={block.type === "gif" ? "image/gif" : "image/jpeg,image/png,image/webp"}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
            }}
          />
        </Field>
        <Field label="Texto alternativo">
          <Input
            value={block.alt}
            maxLength={300}
            onChange={(event) => onChange({ ...block, alt: event.target.value })}
          />
        </Field>
        <Field label="Epígrafe">
          <Input
            value={block.caption}
            onChange={(event) => onChange({ ...block, caption: event.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <MediaLayoutControls value={block} onChange={onChange} />
        </div>
        {block.assetId ? (
          <img
            src={`/api/superadmin/newsletters/assets/${block.assetId}${block.type === "gif" ? "?variant=poster" : ""}`}
            alt="Vista previa"
            className="max-h-52 rounded-xl object-contain sm:col-span-2"
          />
        ) : null}
      </div>
    );
  if (block.type === "metrics")
    return (
      <Field label="Una métrica por línea: valor | etiqueta">
        <Textarea
          value={block.items.map((item) => `${item.value} | ${item.label}`).join("\n")}
          onChange={(event) =>
            onChange({
              ...block,
              items: event.target.value
                .split("\n")
                .filter(Boolean)
                .slice(0, 4)
                .map((line) => {
                  const [value, ...label] = line.split("|");
                  return {
                    value: value?.trim() || "—",
                    label: label.join("|").trim() || "Métrica"
                  };
                })
            })
          }
        />
      </Field>
    );
  if (block.type === "chart")
    return (
      <div className="grid gap-3">
        <Input
          placeholder="Título del gráfico"
          value={block.title}
          onChange={(event) => onChange({ ...block, title: event.target.value })}
        />
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={block.chartType}
            onChange={(event) =>
              onChange({ ...block, chartType: event.target.value as typeof block.chartType })
            }
          >
            <option value="bar">Barras</option>
            <option value="line">Líneas</option>
            <option value="donut">Dona</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showLabels}
              onChange={(event) => onChange({ ...block, showLabels: event.target.checked })}
            />
            Etiquetas
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showLegend}
              onChange={(event) => onChange({ ...block, showLegend: event.target.checked })}
            />
            Leyenda
          </label>
        </div>
        <Field label="Una fila por línea: etiqueta | valor | #color">
          <Textarea
            value={block.data
              .map((point) => `${point.label} | ${point.value} | ${point.color ?? "#7c3aed"}`)
              .join("\n")}
            onChange={(event) =>
              onChange({
                ...block,
                data: event.target.value
                  .split("\n")
                  .filter(Boolean)
                  .slice(0, 30)
                  .map((line) => {
                    const [label, value, color] = line.split("|");
                    return {
                      label: label?.trim() || "Dato",
                      value: Number(value?.trim()) || 0,
                      color: /^#[0-9a-fA-F]{6}$/.test(color?.trim() ?? "")
                        ? color!.trim()
                        : "#7c3aed"
                    };
                  })
              })
            }
          />
        </Field>
      </div>
    );
  if (block.type === "video")
    return (
      <div className="grid gap-3">
        <Field label="URL HTTPS de YouTube o Vimeo">
          <Input
            defaultValue={
              block.videoId
                ? block.provider === "youtube"
                  ? `https://youtube.com/watch?v=${block.videoId}`
                  : `https://vimeo.com/${block.videoId}`
                : ""
            }
            onBlur={(event) => {
              const parsed = parseNewsletterVideoUrl(event.target.value);
              onChange({ ...block, ...(parsed ?? { videoId: "" }) });
            }}
          />
        </Field>
        <Field label="Título accesible">
          <Input
            value={block.title}
            onChange={(event) => onChange({ ...block, title: event.target.value })}
          />
        </Field>
        <MediaLayoutControls value={block} onChange={onChange} />
      </div>
    );
  if (block.type === "drawing") return <DrawingEditor drawing={block} onChange={onChange} />;
  if (block.type === "cta")
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Etiqueta">
          <Input
            value={block.label}
            onChange={(event) => onChange({ ...block, label: event.target.value })}
          />
        </Field>
        <Field label="Ruta interna o URL HTTPS">
          <Input
            value={block.url}
            onChange={(event) => onChange({ ...block, url: event.target.value })}
          />
        </Field>
      </div>
    );
  return <div className="h-px bg-border" />;
}
