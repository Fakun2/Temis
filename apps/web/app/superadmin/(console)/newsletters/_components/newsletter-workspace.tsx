"use client";

import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ReactNode } from "react";
import { BackgroundSection } from "@/components/newsletter/newsletter-media-view";
import type { NewsletterBlockV2 } from "@/components/newsletter/newsletter-types";
import type { useNewsletterBuilder } from "../_hooks/use-newsletter-builder";
import {
  blockLabels,
  emptyDocument,
  newBlock,
  type MediaBlock
} from "../_lib/newsletter-builder-model";
import { isMedia, MediaCard, MediaZone } from "./newsletter-media";
import { RichEditor } from "./newsletter-rich-editor";
import { BlockEditor, IconButton } from "./newsletter-builder-parts";
import styles from "./newsletter-builder.module.css";
import { NewsletterSidebar } from "./newsletter-sidebar";

export function NewsletterWorkspace({
  state,
  isDark
}: {
  state: ReturnType<typeof useNewsletterBuilder>;
  isDark: boolean;
}) {
  const {
    draft,
    setDraft,
    setActiveEditor,
    headerEditing,
    setHeaderEditing,
    footerEditing,
    setFooterEditing,
    headerAutoFocus,
    setHeaderAutoFocus,
    footerAutoFocus,
    setFooterAutoFocus,
    placing,
    setPlacing,
    setSelectedMedia,
    setMediaDraft,
    updateBlock,
    removeBlock,
    moveBlock,
    upload
  } = state;
  if (!draft) return null;
  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[248px_minmax(0,1fr)]">
      <NewsletterSidebar state={state} />
      <main
        className={`${styles.workspace} min-h-0 overflow-auto bg-[var(--admin-page-bg)] p-3 sm:p-6 lg:p-10`}
      >
        <div
          className={`${styles.sheet} mx-auto flex min-h-full flex-col overflow-hidden rounded-[20px] border border-border/45 bg-card px-5 py-8 shadow-[0_12px_35px_-30px_rgba(15,23,42,0.35)] sm:px-10 sm:py-12 lg:px-14`}
          style={{
            maxWidth:
              draft.content.theme.width === "compact"
                ? 640
                : draft.content.theme.width === "wide"
                  ? 880
                  : 720,
            backgroundColor: isDark ? "#292929" : "#ffffff",
            color: isDark ? "#f1f1f1" : "#071827",
            fontFamily:
              draft.content.theme.fontFamily === "serif"
                ? "ui-serif, Georgia, serif"
                : draft.content.theme.fontFamily === "mono"
                  ? "var(--font-mono)"
                  : "var(--font-sans)"
          }}
        >
          <SectionSurface
            blocks={draft.content.blocks}
            section="header"
            onSelect={(index) => {
              setActiveEditor(null);
              setSelectedMedia(index);
            }}
          >
            <div className="pb-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Encabezado
              </p>
              {!headerEditing ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-current/25 py-7 text-sm font-medium opacity-70 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => {
                    setHeaderAutoFocus(true);
                    setHeaderEditing(true);
                  }}
                >
                  <Plus className="size-4" /> Personalizar encabezado
                </button>
              ) : (
                <RichEditor
                  autoFocus={headerAutoFocus}
                  document={draft.content.header ?? emptyDocument("")}
                  onChange={(header) =>
                    setDraft((current) =>
                      current ? { ...current, content: { ...current.content, header } } : current
                    )
                  }
                />
              )}
              <MediaZone
                section="header"
                placing={placing}
                onPlace={(type) => {
                  setMediaDraft({ ...newBlock(type), section: "header" } as MediaBlock);
                  setPlacing(null);
                }}
              />
              {draft.content.blocks.map((block, index) =>
                isMedia(block) && block.section === "header" && !block.background ? (
                  <MediaCard
                    key={index}
                    block={block}
                    onSelect={() => {
                      setActiveEditor(null);
                      setSelectedMedia(index);
                    }}
                  />
                ) : null
              )}
            </div>
          </SectionSurface>
          <div className="border-b border-border/50 pb-5">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Título y resumen
            </p>
            <Input
              value={draft.title}
              maxLength={120}
              aria-label="Título de la newsletter"
              className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight shadow-none placeholder:text-muted-foreground/45 focus-visible:ring-0 sm:text-3xl"
              placeholder="Lorem ipsum dolor sit amet"
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <RichEditor
              document={draft.content.description ?? emptyDocument(draft.excerpt)}
              label="Descripción de la newsletter"
              onChange={(description, plainText) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        excerpt: plainText,
                        content: { ...current.content, description }
                      }
                    : current
                )
              }
            />
          </div>
          <div className="grid gap-3 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Cuerpo
            </p>
            <MediaZone
              section="body"
              placing={placing}
              onPlace={(type) => {
                setMediaDraft({ ...newBlock(type), section: "body" } as MediaBlock);
                setPlacing(null);
              }}
            />
            {draft.content.blocks.map((block, index) =>
              isMedia(block) && block.section && block.section !== "body" ? null : (
                <div key={index} className="group py-2">
                  {isMedia(block) ? (
                    <MediaCard
                      block={block}
                      onSelect={() => {
                        setActiveEditor(null);
                        setSelectedMedia(index);
                      }}
                    />
                  ) : (
                    <>
                      {block.type !== "richText" ? (
                        <div className="mb-2 flex items-center gap-1">
                          <span className="mr-auto rounded-md bg-secondary/70 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {index + 1}. {blockLabels[block.type]}
                          </span>
                          <IconButton
                            label="Subir"
                            disabled={index === 0}
                            onClick={() => moveBlock(index, -1)}
                          >
                            <ArrowUp />
                          </IconButton>
                          <IconButton
                            label="Bajar"
                            disabled={index === draft.content.blocks.length - 1}
                            onClick={() => moveBlock(index, 1)}
                          >
                            <ArrowDown />
                          </IconButton>
                          <IconButton
                            label="Duplicar"
                            onClick={() => {
                              const copy = structuredClone(block);
                              setDraft({
                                ...draft,
                                content: {
                                  ...draft.content,
                                  blocks: [
                                    ...draft.content.blocks.slice(0, index + 1),
                                    copy,
                                    ...draft.content.blocks.slice(index + 1)
                                  ]
                                }
                              });
                            }}
                          >
                            <Sparkles />
                          </IconButton>
                          <IconButton label="Eliminar" onClick={() => removeBlock(index)}>
                            <Trash2 />
                          </IconButton>
                        </div>
                      ) : null}
                      <BlockEditor
                        block={block}
                        onChange={(next) => updateBlock(index, next)}
                        onUpload={(file) => void upload(file, index)}
                      />
                    </>
                  )}
                </div>
              )
            )}
          </div>
          <SectionSurface
            blocks={draft.content.blocks}
            section="footer"
            onSelect={(index) => {
              setActiveEditor(null);
              setSelectedMedia(index);
            }}
          >
            <div className="mt-4 border-t border-border/50 pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pie de la publicación
              </p>
              {!footerEditing ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-current/25 py-7 text-sm font-medium opacity-70 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-primary"
                  onClick={() => {
                    setFooterAutoFocus(true);
                    setFooterEditing(true);
                  }}
                >
                  <Plus className="size-4" /> Personalizar pie
                </button>
              ) : (
                <RichEditor
                  autoFocus={footerAutoFocus}
                  document={draft.content.footer ?? emptyDocument("")}
                  onChange={(footer) =>
                    setDraft((current) =>
                      current ? { ...current, content: { ...current.content, footer } } : current
                    )
                  }
                />
              )}
              <MediaZone
                section="footer"
                placing={placing}
                onPlace={(type) => {
                  setMediaDraft({ ...newBlock(type), section: "footer" } as MediaBlock);
                  setPlacing(null);
                }}
              />
              {draft.content.blocks.map((block, index) =>
                isMedia(block) && block.section === "footer" && !block.background ? (
                  <MediaCard
                    key={index}
                    block={block}
                    onSelect={() => {
                      setActiveEditor(null);
                      setSelectedMedia(index);
                    }}
                  />
                ) : null
              )}
            </div>
          </SectionSurface>
        </div>
      </main>
    </div>
  );
}

function SectionSurface({
  blocks,
  section,
  onSelect,
  children
}: {
  blocks: NewsletterBlockV2[];
  section: "header" | "footer";
  onSelect: (index: number) => void;
  children: ReactNode;
}) {
  const index = blocks.findIndex(
    (block) => isMedia(block) && block.section === section && block.background
  );
  const block = blocks[index];
  if (!block || !isMedia(block)) return children;
  return (
    <div
      className={`-mx-5 sm:-mx-10 lg:-mx-14 ${section === "header" ? "-mt-8 sm:-mt-12" : "mt-auto -mb-8 sm:-mb-12"}`}
    >
      <BackgroundSection block={block} assetPrefix="/api/superadmin/newsletters/assets" editor>
        <button
          type="button"
          className="relative z-10 mb-2 rounded-md bg-background/90 px-2 py-1 text-xs text-foreground"
          onClick={() => onSelect(index)}
        >
          Configurar fondo
        </button>
        {children}
      </BackgroundSection>
    </div>
  );
}
