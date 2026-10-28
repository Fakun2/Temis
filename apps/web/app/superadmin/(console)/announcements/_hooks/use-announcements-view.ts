"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getApiErrorMessage } from "@/lib/http";
import {
  announcementAction,
  getAnnouncement,
  type AnnouncementCategory,
  type PlatformAnnouncement,
  type PlatformAnnouncementDetail,
  type PlatformAnnouncementsList,
  type PlatformAnnouncementsQuery
} from "../_api/announcements.api";

export function useAnnouncementsView({
  cursorStack,
  data
}: {
  cursorStack: string[];
  data?: PlatformAnnouncementsList;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [selectedDetail, setSelectedDetail] = useState<PlatformAnnouncementDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<PlatformAnnouncement | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  function navigate(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    const value = params.toString();
    router.push(value ? `${pathname}?${value}` : pathname);
  }

  function changeFilter(key: keyof PlatformAnnouncementsQuery, value?: string) {
    navigate((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("cursorStack");
    });
  }

  function clearFilters() {
    navigate((params) => {
      for (const key of [
        "activity",
        "audience",
        "category",
        "search",
        "severity",
        "status",
        "cursorStack"
      ]) {
        params.delete(key);
      }
    });
  }

  function nextPage() {
    const nextCursor = data?.pageInfo.nextCursor;
    if (!nextCursor) return;
    navigate((params) => params.set("cursorStack", [...cursorStack, nextCursor].join(",")));
  }

  function previousPage() {
    navigate((params) => {
      const previous = cursorStack.slice(0, -1);
      if (previous.length) params.set("cursorStack", previous.join(","));
      else params.delete("cursorStack");
    });
  }

  function chooseCategory(value: AnnouncementCategory) {
    setCategory(value);
    setSelectedDetail(null);
    setPickerOpen(false);
    setComposerOpen(true);
  }

  async function loadDetail(item: PlatformAnnouncement, mode: "view" | "edit") {
    setActionBusy(item.id);
    setActionError("");
    try {
      const detail = await getAnnouncement(item.id);
      setSelectedDetail(detail);
      if (mode === "view") setDetailOpen(true);
      else setComposerOpen(true);
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setActionBusy(null);
    }
  }

  async function runAction(item: PlatformAnnouncement, action: "publish" | "schedule" | "cancel") {
    setActionBusy(item.id);
    setActionError("");
    try {
      await announcementAction(item.id, action);
      setConfirmCancel(null);
      router.refresh();
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setActionBusy(null);
    }
  }

  return {
    actionBusy,
    actionError,
    category,
    changeFilter,
    chooseCategory,
    clearActionError: () => setActionError(""),
    clearFilters,
    composerOpen,
    confirmCancel,
    detailOpen,
    loadDetail,
    nextPage,
    pickerOpen,
    previousPage,
    refresh: () => router.refresh(),
    runAction,
    selectedDetail,
    setComposerOpen,
    setConfirmCancel,
    setDetailOpen,
    setPickerOpen,
    setSelectedDetail
  };
}
