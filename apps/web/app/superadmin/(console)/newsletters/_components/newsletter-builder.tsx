"use client";

import { useState } from "react";
import type { NewsletterListItem } from "../_api/newsletters.api";
import { clearSectionBackgrounds } from "../_lib/newsletter-builder-model";
import { useTheme } from "@/lib/theme/theme-provider";
import styles from "./newsletter-builder.module.css";
import { MediaInsertDialog } from "./newsletter-media";
import { EditorControlsContext } from "./newsletter-rich-editor";
import { NewsletterList } from "./newsletter-views";
import { NewsletterPreview, PreviewDialog } from "./newsletter-preview-dialog";
import { useNewsletterBuilder } from "../_hooks/use-newsletter-builder";
import { NewsletterWorkspace } from "./newsletter-workspace";
import { BuilderTopbar } from "./newsletter-builder-parts";
import { NewsletterConfirmDialog } from "./newsletter-confirm-dialog";

export function NewsletterBuilder() {
  const { isDark } = useTheme();
  const state = useNewsletterBuilder();
  const [pendingAction, setPendingAction] = useState<{
    type: "cancel" | "delete";
    item: NewsletterListItem;
  } | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const {
    items,
    cursor,
    metrics,
    filter,
    changeFilter,
    pageIndex,
    previousPage,
    remove,
    openItem,
    editing,
    setEditing,
    draft,
    setDraft,
    preview,
    setPreview,
    previewDevice,
    setPreviewDevice,
    previewDark,
    setPreviewDark,
    busy,
    loading,
    error,
    activeEditor,
    setActiveEditor,
    controlsTarget,
    mediaDraft,
    setMediaDraft,
    load,
    create,
    save,
    publish,
    cancel,
    loadMore
  } = state;

  if (!draft || !editing)
    return (
      <>
        <NewsletterList
          items={items}
          loading={loading}
          busy={busy}
          error={error}
          cursor={cursor}
          onCreate={create}
          onOpen={openItem}
          onCancel={(item) => setPendingAction({ type: "cancel", item })}
          onDelete={(item) => setPendingAction({ type: "delete", item })}
          metrics={metrics}
          filter={filter}
          onFilter={changeFilter}
          pageIndex={pageIndex}
          onPrevious={previousPage}
          onRetry={load}
          onMore={loadMore}
        />
        <NewsletterConfirmDialog
          open={pendingAction !== null}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={pendingAction?.type === "delete" ? "Eliminar newsletter" : "Desactivar newsletter"}
          description={
            pendingAction?.type === "delete"
              ? `¿Eliminar “${pendingAction.item.title}”? Se ocultará para todos los usuarios.`
              : `¿Desactivar “${pendingAction?.item.title ?? ""}”? Dejará de mostrarse a los estudios.`
          }
          confirmLabel={pendingAction?.type === "delete" ? "Eliminar" : "Desactivar"}
          busy={busy}
          onConfirm={() => {
            if (!pendingAction || busy) return;
            const action = pendingAction;
            setPendingAction(null);
            void (action.type === "delete" ? remove(action.item) : cancel(action.item));
          }}
        />
      </>
    );
  if (editing.status !== "draft")
    return (
      <section className="grid gap-4">
        <BuilderTopbar
          title={draft.title}
          busy={busy}
          onBack={() => {
            setDraft(null);
            setEditing(null);
          }}
          onSave={() => {}}
          onPreview={() => setPreview(true)}
          onSchedule={() => {}}
          onPublish={() => {}}
          readOnly
        />
        <NewsletterPreview draft={draft} assetPrefix="/api/superadmin/newsletters/assets" />
        <PreviewDialog
          open={preview}
          onOpenChange={setPreview}
          draft={draft}
          device={previewDevice}
          setDevice={setPreviewDevice}
          dark={previewDark}
          setDark={setPreviewDark}
        />
      </section>
    );

  return (
    <EditorControlsContext.Provider
      value={{ active: activeEditor, activate: setActiveEditor, target: controlsTarget }}
    >
      <section
        className={`${styles.builder} flex min-h-[640px] flex-1 flex-col overflow-hidden rounded-[24px] border border-border/60 bg-card shadow-[var(--admin-card-shadow)] lg:min-h-0`}
        onPointerDownCapture={(event) => {
          if (
            event.target instanceof Element &&
            !event.target.closest("[data-editor-surface], [data-editor-sidebar]")
          )
            setActiveEditor(null);
        }}
      >
        <BuilderTopbar
          title={draft.title}
          busy={busy}
          onBack={() => setConfirmClose(true)}
          onSave={() => void save(false)}
          onPreview={() => setPreview(true)}
          onSchedule={() => void publish("schedule")}
          onPublish={() => void publish("publish")}
        />
        {error ? (
          <p role="alert" className="border-b bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <NewsletterWorkspace state={state} isDark={isDark} />
        <NewsletterConfirmDialog
          open={confirmClose}
          onOpenChange={setConfirmClose}
          title="Cerrar editor"
          description="Los cambios sin guardar se perderán."
          confirmLabel="Cerrar editor"
          onConfirm={() => {
            setConfirmClose(false);
            setDraft(null);
            setEditing(null);
            void load();
          }}
        />
        <PreviewDialog
          open={preview}
          onOpenChange={setPreview}
          draft={draft}
          device={previewDevice}
          setDevice={setPreviewDevice}
          dark={previewDark}
          setDark={setPreviewDark}
        />
        {mediaDraft ? (
          <MediaInsertDialog
            block={mediaDraft}
            draftId={editing.id}
            onClose={() => setMediaDraft(null)}
            onConfirm={(block) => {
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      content: {
                        ...current.content,
                        blocks: [...clearSectionBackgrounds(current.content.blocks, block), block]
                      }
                    }
                  : current
              );
              setMediaDraft(null);
            }}
          />
        ) : null}
      </section>
    </EditorControlsContext.Provider>
  );
}
