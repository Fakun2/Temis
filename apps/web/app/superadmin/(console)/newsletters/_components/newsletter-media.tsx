"use client";

import { useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, Plus } from "lucide-react";
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
  NewsletterContentView,
  type NewsletterBlockV2
} from "@/components/newsletter/newsletter-content-v2";
import { parseNewsletterVideoUrl } from "@/components/newsletter/newsletter-utils";
import { uploadNewsletterAssetWithProgress } from "../_api/newsletters.api";
import {
  blockLabels,
  message,
  type MediaBlock,
  type MediaKind,
  type MediaSection
} from "../_lib/newsletter-builder-model";
import { Field } from "./newsletter-fields";
import styles from "./newsletter-builder.module.css";

export function isMedia(block: NewsletterBlockV2): block is MediaBlock {
  return block.type === "image" || block.type === "gif" || block.type === "video";
}

export function MediaZone({
  section,
  placing,
  onPlace
}: {
  section: MediaSection;
  placing: MediaKind | null;
  onPlace: (type: MediaKind) => void;
}) {
  if (!placing) return null;
  const name = section === "header" ? "encabezado" : section === "footer" ? "pie" : "cuerpo";
  return (
    <button
      type="button"
      className="my-3 flex min-h-20 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 text-sm text-primary"
      onClick={() => onPlace(placing)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("text/plain");
        if (type === "image" || type === "gif" || type === "video") onPlace(type);
      }}
    >
      <Plus className="size-4" /> Insertar {blockLabels[placing].toLowerCase()} en {name}
    </button>
  );
}

export function MediaCard({ block, onSelect }: { block: MediaBlock; onSelect: () => void }) {
  const align =
    block.align === "left" ? "mr-auto" : block.align === "right" ? "ml-auto" : "mx-auto";
  const width =
    block.width === "small" ? "max-w-sm" : block.width === "medium" ? "max-w-2xl" : "w-full";
  return (
    <button
      type="button"
      className={`${align} ${width} my-3 block rounded-xl text-left focus-visible:outline-2 focus-visible:outline-primary`}
      onClick={onSelect}
      aria-label={`Configurar ${blockLabels[block.type]}`}
    >
      {block.type === "video" ? (
        <div className="grid aspect-video place-items-center rounded-xl bg-secondary text-sm text-secondary-foreground">
          ▶ {block.title || "Video"}
        </div>
      ) : (
        <>
          <img
            src={`/api/superadmin/newsletters/assets/${block.assetId}`}
            alt={block.alt}
            className="max-h-[520px] w-full rounded-xl object-contain"
          />
          {block.caption ? (
            <p className="mt-2 text-center text-xs opacity-70">{block.caption}</p>
          ) : null}
        </>
      )}
    </button>
  );
}

export function MediaInsertDialog({
  block,
  draftId,
  onClose,
  onConfirm
}: {
  block: MediaBlock;
  draftId: string;
  onClose: () => void;
  onConfirm: (block: MediaBlock) => void;
}) {
  const [value, setValue] = useState(block);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const uploading = progress !== null && progress < 100;
  async function uploadFile(file: File) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadNewsletterAssetWithProgress(draftId, file, setProgress);
      setValue((current) =>
        current.type === "image" || current.type === "gif"
          ? { ...current, assetId: result.id }
          : current
      );
      setProgress(100);
    } catch (cause) {
      setProgress(null);
      setError(message(cause));
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !uploading) onClose();
      }}
    >
      <DialogContent
        className={`${styles.mediaDialog} max-h-[min(88dvh,740px)] w-[calc(100vw-2rem)] max-w-[440px] gap-4 overflow-y-auto rounded-2xl p-5 sm:p-6`}
      >
        <DialogHeader>
          <DialogTitle>Insertar {blockLabels[value.type].toLowerCase()}</DialogTitle>
          <DialogDescription>
            Configurá el recurso antes de agregarlo a la publicación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {value.type === "video" ? (
            <>
              <Field label="Enlace de YouTube o Vimeo">
                <Input
                  value={videoUrl}
                  placeholder="https://…"
                  onChange={(event) => {
                    const url = event.target.value;
                    setVideoUrl(url);
                    const parsed = parseNewsletterVideoUrl(url);
                    setValue({ ...value, ...(parsed ?? { videoId: "" }) });
                  }}
                />
              </Field>
              <Field label="Título accesible">
                <Input
                  value={value.title}
                  onChange={(event) => setValue({ ...value, title: event.target.value })}
                />
              </Field>
              {value.videoId ? (
                <NewsletterContentView
                  content={{
                    version: 2,
                    theme: {
                      width: "standard",
                      fontFamily: "sans",
                      backgroundColor: "#ffffff",
                      textColor: "#071827",
                      accentColor: "#073061"
                    },
                    blocks: [value]
                  }}
                  assetPrefix="/api/superadmin/newsletters/assets"
                />
              ) : null}
            </>
          ) : (
            <>
              <Field label={value.type === "gif" ? "Archivo GIF" : "Archivo de imagen"}>
                <Input
                  type="file"
                  accept={value.type === "gif" ? "image/gif" : "image/jpeg,image/png,image/webp"}
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadFile(file);
                  }}
                />
              </Field>
              {progress !== null ? (
                <div className="grid gap-1.5 text-xs text-muted-foreground">
                  <span role="status">
                    {progress === 100 ? "Carga completada" : `Cargando: ${progress}%`}
                  </span>
                  <progress
                    aria-label="Progreso de carga"
                    className={styles.uploadProgress}
                    max={100}
                    value={progress}
                  />
                </div>
              ) : null}
              {value.assetId ? (
                <img
                  src={`/api/superadmin/newsletters/assets/${value.assetId}${value.type === "gif" ? "?variant=poster" : ""}`}
                  alt={value.alt || "Vista previa"}
                  className="max-h-44 w-full rounded-xl object-contain"
                />
              ) : null}
              <Field label="Texto alternativo">
                <Input
                  value={value.alt}
                  maxLength={300}
                  onChange={(event) => setValue({ ...value, alt: event.target.value })}
                />
              </Field>
              <Field label="Epígrafe">
                <Input
                  value={value.caption}
                  maxLength={300}
                  onChange={(event) => setValue({ ...value, caption: event.target.value })}
                />
              </Field>
            </>
          )}
          <MediaLayoutControls value={value} onChange={setValue} />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={uploading} onClick={onClose}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={
                uploading ||
                (value.type === "video"
                  ? !value.videoId || !value.title.trim()
                  : !value.assetId || !value.alt.trim())
              }
              onClick={() => onConfirm(value)}
            >
              Insertar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaLayoutControls({
  value,
  onChange
}: {
  value: MediaBlock;
  onChange: (value: MediaBlock) => void;
}) {
  const alignments = [
    { value: "left", label: "Izquierda", icon: AlignLeft },
    { value: "center", label: "Centro", icon: AlignCenter },
    { value: "right", label: "Derecha", icon: AlignRight }
  ] as const;
  const widths = [
    { value: "small", label: "Pequeño", short: "S" },
    { value: "medium", label: "Mediano", short: "M" },
    { value: "full", label: "Completo", short: "L" }
  ] as const;
  const control = (active: boolean) =>
    `grid h-8 min-w-8 place-items-center rounded-md px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`;
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-3">
      {(value.section === "header" || value.section === "footer") && (
        <label className="flex w-full items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={value.background === true}
            onChange={(event) => onChange({ ...value, background: event.target.checked })}
          />
          Usar como fondo de {value.section === "header" ? "encabezado" : "pie"}
        </label>
      )}
      {!value.background && (
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Alineación</span>
          <div
            role="group"
            aria-label="Alineación"
            className="flex gap-0.5 rounded-lg border border-border/50 p-0.5"
          >
            {alignments.map(({ value: align, label, icon: Icon }) => (
              <button
                key={align}
                type="button"
                aria-label={label}
                aria-pressed={value.align === align}
                title={label}
                className={control(value.align === align)}
                onClick={() => onChange({ ...value, align })}
              >
                <Icon className="size-4 stroke-[1.5]" />
              </button>
            ))}
          </div>
        </div>
      )}
      {!value.background && (
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Tamaño</span>
          <div
            role="group"
            aria-label="Tamaño"
            className="flex gap-0.5 rounded-lg border border-border/50 p-0.5"
          >
            {widths.map(({ value: width, label, short }) => (
              <button
                key={width}
                type="button"
                aria-label={label}
                aria-pressed={value.width === width}
                title={label}
                className={control(value.width === width)}
                onClick={() => onChange({ ...value, width })}
              >
                {short}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
