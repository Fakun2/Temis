"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getApiErrorMessage } from "@/lib/http";
import {
  createAnnouncement,
  listTenantOptions,
  updateAnnouncement,
  type AnnouncementCategory,
  type PlatformAnnouncementDetail,
  type TenantOption
} from "../_api/announcements.api";
import {
  announcementFormSchema,
  createAnnouncementDraft,
  toAnnouncementInput,
  type AnnouncementDraft
} from "../_utils/announcement-form";

type Options = {
  category?: AnnouncementCategory;
  detail?: PlatformAnnouncementDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

export function useAnnouncementComposer({
  category,
  detail,
  onOpenChange,
  onSaved,
  open
}: Options) {
  const [draft, setDraft] = useState<AnnouncementDraft>(() =>
    createAnnouncementDraft(category, detail)
  );
  const [selected, setSelected] = useState<TenantOption[]>(detail?.targetTenants ?? []);
  const [tenantSearch, setTenantSearch] = useState("");
  const [options, setOptions] = useState<TenantOption[]>([]);
  const [tenantCursor, setTenantCursor] = useState<string | null>(null);
  const [hasMoreTenants, setHasMoreTenants] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(createAnnouncementDraft(category, detail));
    setSelected(detail?.targetTenants ?? []);
    setTenantSearch("");
    setError("");
  }, [category, detail, open]);

  useEffect(() => {
    if (!open || draft.audience !== "selected_tenants") return;
    const timeout = window.setTimeout(() => {
      setLoadingTenants(true);
      void listTenantOptions({ limit: 30, search: tenantSearch.trim() || undefined })
        .then((result) => {
          setOptions(result.items);
          setTenantCursor(result.pageInfo.nextCursor);
          setHasMoreTenants(result.pageInfo.hasNextPage);
        })
        .catch(() => setOptions([]))
        .finally(() => setLoadingTenants(false));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft.audience, open, tenantSearch]);

  const selectedIds = useMemo(() => new Set(selected.map((tenant) => tenant.id)), [selected]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const parsed = announcementFormSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Revisá los datos ingresados.");
      return;
    }
    if (draft.audience === "selected_tenants" && !selected.length) {
      setError("Seleccioná al menos un estudio.");
      return;
    }

    const input = toAnnouncementInput(parsed.data, selected);
    setBusy(true);
    try {
      if (detail) await updateAnnouncement(detail.id, input);
      else await createAnnouncement({ ...input, deliveryMode: draft.deliveryMode });
      onOpenChange(false);
      onSaved();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  function patch<K extends keyof AnnouncementDraft>(key: K, value: AnnouncementDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleTenant(tenant: TenantOption) {
    setSelected((current) =>
      current.some((item) => item.id === tenant.id)
        ? current.filter((item) => item.id !== tenant.id)
        : [...current, tenant]
    );
  }

  async function loadMoreTenants() {
    if (!tenantCursor || loadingTenants) return;
    setLoadingTenants(true);
    try {
      const result = await listTenantOptions({
        cursor: tenantCursor,
        limit: 30,
        search: tenantSearch.trim() || undefined
      });
      setOptions((current) => [
        ...current,
        ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))
      ]);
      setTenantCursor(result.pageInfo.nextCursor);
      setHasMoreTenants(result.pageInfo.hasNextPage);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
      setHasMoreTenants(false);
    } finally {
      setLoadingTenants(false);
    }
  }

  return {
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
  };
}
