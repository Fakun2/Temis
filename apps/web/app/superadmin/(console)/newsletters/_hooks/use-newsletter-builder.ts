"use client";

import { useState } from "react";
import {
  createNewsletter,
  getNewsletter,
  type NewsletterListItem,
  newsletterAction,
  saveNewsletter,
  uploadNewsletterAsset
} from "../_api/newsletters.api";
import {
  hasText,
  message,
  migrateContent,
  toLocal,
  validateDraft,
  type Draft,
  type Newsletter
} from "../_lib/newsletter-builder-model";
import { useNewsletterActions } from "./use-newsletter-actions";
import { useNewsletterList } from "./use-newsletter-list";
import { useNewsletterTenants } from "./use-newsletter-tenants";
import { useNewsletterBlocks } from "./use-newsletter-blocks";
import { useNewsletterEditorState, useNewsletterMediaState } from "./use-newsletter-editor-state";

export function useNewsletterBuilder() {
  const [editing, setEditing] = useState<Newsletter | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const editor = useNewsletterEditorState();
  const media = useNewsletterMediaState();
  const {
    setPanel,
    setActiveEditor,
    setHeaderEditing,
    setFooterEditing,
    setHeaderAutoFocus,
    setFooterAutoFocus
  } = editor;
  const { setPlacing, setSelectedMedia } = media;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useNewsletterList();
  const { load } = list;
  const { cancel, remove } = useNewsletterActions(list, setBusy, setError);
  const { tenantOptions, tenantSearch, setTenantSearch, tenantError } = useNewsletterTenants(
    draft?.audience === "selected_tenants"
  );
  const { updateBlock, addBlock, removeBlock, moveBlock } = useNewsletterBlocks(setDraft);

  async function openItem(item: NewsletterListItem) {
    setBusy(true);
    try {
      open(await getNewsletter(item.id));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  function open(item: Newsletter) {
    setEditing(item);
    setActiveEditor(null);
    setHeaderAutoFocus(false);
    setFooterAutoFocus(false);
    setSelectedMedia(null);
    setPlacing(null);
    setHeaderEditing(Boolean(item.content?.version === 2 && hasText(item.content.header)));
    setFooterEditing(Boolean(item.content?.version === 2 && hasText(item.content.footer)));
    setPanel("content");
    setError(null);
    setDraft({
      title: item.title,
      excerpt: item.excerpt ?? "",
      newsletterCategory: (item.newsletterCategory as Draft["newsletterCategory"]) ?? "general",
      audience: item.audience,
      targetTenantIds: item.targets?.map((target) => target.tenantId) ?? [],
      startsAt: toLocal(item.startsAt),
      endsAt: toLocal(item.endsAt),
      content: migrateContent(item.content)
    });
  }
  async function create() {
    setBusy(true);
    setError(null);
    try {
      const item = await createNewsletter();
      open({ ...item, title: item.title === "Newsletter sin título" ? "" : item.title });
      await load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  async function save(close = false): Promise<boolean> {
    if (!editing || !draft) return false;
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await saveNewsletter(editing.id, draft);
      if (close) {
        setEditing(null);
        setDraft(null);
        await load();
      } else
        setEditing({
          ...updated,
          targets: draft.targetTenantIds.map((tenantId) => ({ tenantId }))
        });
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function publish(action: "publish" | "schedule") {
    if (!editing) return;
    if (!(await save(false))) return;
    setBusy(true);
    try {
      await newsletterAction(editing.id, action);
      setEditing(null);
      setDraft(null);
      await load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, index: number) {
    if (!editing || !draft) return;
    setBusy(true);
    setError(null);
    try {
      const result = await uploadNewsletterAsset(editing.id, file);
      const block = draft.content.blocks[index];
      if (block?.type === "image" || block?.type === "gif")
        updateBlock(index, { ...block, assetId: result.id });
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return {
    ...list,
    remove,
    openItem,
    editing,
    setEditing,
    draft,
    setDraft,
    ...editor,
    busy,
    error: error ?? list.error ?? tenantError,
    tenantOptions,
    tenantSearch,
    setTenantSearch,
    ...media,
    load,
    open,
    create,
    save,
    publish,
    cancel,
    updateBlock,
    addBlock,
    removeBlock,
    moveBlock,
    upload
  };
}
