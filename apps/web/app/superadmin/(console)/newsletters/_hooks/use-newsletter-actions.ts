"use client";
import type { Dispatch, SetStateAction } from "react";
import {
  deleteNewsletter,
  newsletterAction,
  type NewsletterListItem
} from "../_api/newsletters.api";
import { message } from "../_lib/newsletter-builder-model";
import type { useNewsletterList } from "./use-newsletter-list";

export function useNewsletterActions(
  list: ReturnType<typeof useNewsletterList>,
  setBusy: Dispatch<SetStateAction<boolean>>,
  setError: Dispatch<SetStateAction<string | null>>
) {
  async function cancel(item: NewsletterListItem) {
    setBusy(true);
    setError(null);
    try {
      await newsletterAction(item.id, "cancel");
      if (list.items.length === 1 && list.pageIndex > 0 && list.filter !== "all")
        list.previousPage();
      await list.load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: NewsletterListItem) {
    setBusy(true);
    setError(null);
    try {
      await deleteNewsletter(item.id);
      if (list.items.length === 1 && list.pageIndex > 0) list.previousPage();
      await list.load();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  return { cancel, remove };
}
