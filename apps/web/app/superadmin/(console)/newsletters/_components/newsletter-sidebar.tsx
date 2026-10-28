"use client";

import { ArrowLeft, ImageIcon, Palette, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useNewsletterBuilder } from "../_hooks/use-newsletter-builder";
import { blockLabels } from "../_lib/newsletter-builder-model";
import { BlockEditor, PanelButton, SettingsEditor, ThemeEditor } from "./newsletter-builder-parts";
import styles from "./newsletter-builder.module.css";

export function NewsletterSidebar({ state }: { state: ReturnType<typeof useNewsletterBuilder> }) {
  const {
    draft,
    setDraft,
    panel,
    setPanel,
    tenantOptions,
    tenantSearch,
    setTenantSearch,
    activeEditor,
    setActiveEditor,
    setControlsTarget,
    placing,
    setPlacing,
    selectedMedia,
    setSelectedMedia,
    updateBlock,
    addBlock,
    removeBlock,
    upload
  } = state;
  if (!draft) return null;
  return (
    <aside
      data-editor-sidebar
      className={`${styles.sidebar} min-h-0 overflow-y-auto border-b border-border/50 bg-secondary/25 p-4 lg:border-b-0 lg:border-r lg:px-4 lg:py-6`}
    >
      <div className={activeEditor || selectedMedia !== null ? "hidden" : "block"}>
        <nav
          aria-label="Herramientas del builder"
          className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1"
        >
          <PanelButton
            active={panel === "content"}
            icon={Plus}
            label="Contenido"
            onClick={() => {
              setActiveEditor(null);
              setPanel("content");
            }}
          />
          <PanelButton
            active={panel === "styles"}
            icon={Palette}
            label="Estilos"
            onClick={() => {
              setActiveEditor(null);
              setPanel("styles");
            }}
          />
          <PanelButton
            active={panel === "media"}
            icon={ImageIcon}
            label="Multimedia"
            onClick={() => {
              setActiveEditor(null);
              setPanel("media");
            }}
          />
          <PanelButton
            active={panel === "settings"}
            icon={Settings2}
            label="Configuración"
            onClick={() => {
              setActiveEditor(null);
              setPanel("settings");
            }}
          />
        </nav>
        <div className="mt-5 grid gap-3 border-t border-border/50 pt-5">
          <div className="px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {panel === "content"
                ? "Escritura"
                : panel === "media"
                  ? "Recursos"
                  : panel === "styles"
                    ? "Diseño de página"
                    : "Publicación"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground/80">
              {panel === "content"
                ? "Escribí directamente en el encabezado, cuerpo y pie. Usá la barra de formato para agregar listas y enlaces."
                : panel === "media"
                  ? "Sumá imágenes, video y dibujos."
                  : panel === "styles"
                    ? "Personalizá el aspecto general."
                    : "Definí la audiencia y vigencia."}
            </p>
          </div>
          {panel === "media" ? (
            <div className="grid gap-2">
              {(["image", "gif", "video"] as const).map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  className="justify-start"
                  onClick={() => setPlacing(type)}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", type);
                    setPlacing(type);
                  }}
                >
                  <Plus className="size-4" />
                  {blockLabels[type]}
                </Button>
              ))}
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => addBlock("drawing")}
              >
                <Plus className="size-4" /> Dibujo libre
              </Button>
              {placing ? (
                <p role="status" className="text-xs text-muted-foreground">
                  Elegí una zona en la hoja o arrastrá el recurso hasta ella.
                </p>
              ) : null}
            </div>
          ) : null}
          {panel === "styles" ? (
            <ThemeEditor
              theme={draft.content.theme}
              onChange={(theme) => setDraft({ ...draft, content: { ...draft.content, theme } })}
            />
          ) : null}
          {panel === "settings" ? (
            <SettingsEditor
              draft={draft}
              onChange={setDraft}
              options={tenantOptions}
              search={tenantSearch}
              setSearch={setTenantSearch}
            />
          ) : null}
        </div>
      </div>
      <div
        className={activeEditor ? "block motion-safe:animate-in motion-safe:fade-in-0" : "hidden"}
      >
        <button
          type="button"
          className="mb-5 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setActiveEditor(null)}
        >
          <ArrowLeft className="size-4" /> Herramientas
        </button>
        <p className="mb-1 text-sm font-semibold">Formato de texto</p>
        <p className="mb-4 text-xs leading-5 text-muted-foreground">
          Aplicá los cambios al texto seleccionado.
        </p>
        <div ref={setControlsTarget} />
      </div>
      {selectedMedia !== null && draft.content.blocks[selectedMedia] ? (
        <div className="grid gap-4">
          <button
            type="button"
            className="flex items-center gap-2 text-xs text-muted-foreground"
            onClick={() => setSelectedMedia(null)}
          >
            <ArrowLeft className="size-4" /> Herramientas
          </button>
          <p className="text-sm font-semibold">Configuración del recurso</p>
          <BlockEditor
            block={draft.content.blocks[selectedMedia]!}
            onChange={(block) => updateBlock(selectedMedia, block)}
            onUpload={(file) => void upload(file, selectedMedia)}
          />
          <Button
            variant="outline"
            onClick={() => {
              removeBlock(selectedMedia);
              setSelectedMedia(null);
            }}
          >
            Eliminar recurso
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
