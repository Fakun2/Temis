"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { z } from "zod";
import { getErrorMessage } from "../_utils/account-format";

type AccountMutation<TDraft> = {
  error: Error | null;
  isPending: boolean;
  mutateAsync: (input: TDraft) => Promise<unknown>;
};

type UseEditableAccountFormOptions<TSource, TDraft> = {
  mutation: AccountMutation<TDraft>;
  schema: z.ZodType<TDraft, z.ZodTypeDef, unknown>;
  source: TSource;
  toDraft: (source: TSource) => TDraft;
  validationMessage: string;
};

export function useEditableAccountForm<TSource, TDraft>({
  mutation,
  schema,
  source,
  toDraft,
  validationMessage
}: UseEditableAccountFormOptions<TSource, TDraft>) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<TDraft>(() => toDraft(source));

  useEffect(() => {
    setDraft(toDraft(source));
  }, [source, toDraft]);

  function reset() {
    setDraft(toDraft(source));
    setEditing(false);
    setError("");
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.errors[0]?.message ?? validationMessage);
      return;
    }

    setError("");
    try {
      await mutation.mutateAsync(parsed.data);
      setEditing(false);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  return {
    draft,
    editing,
    error: error || mutation.error?.message,
    isSaving: mutation.isPending,
    reset,
    save,
    setDraft,
    setEditing
  };
}
