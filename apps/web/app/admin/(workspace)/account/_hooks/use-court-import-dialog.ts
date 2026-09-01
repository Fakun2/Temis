"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, type FormEvent } from "react";
import { saePreviewSchema, type SaePreviewFormValues } from "@/lib/validation/account";
import { useSaeImportMutation, useSaePreviewMutation } from "./use-account-mutations";
import type { SaeImportResponse, SaePreviewResponse } from "../_types/account.types";
import {
  courtImportProgressByStage,
  type CourtImportSystem,
  type ImportStage
} from "../_constants/court-import-systems";
import { getErrorMessage } from "../_utils/account-format";

const initialForm: SaePreviewFormValues = {
  password: "",
  username: ""
};

type CourtImportDialogState = {
  form: SaePreviewFormValues;
  formError?: string;
  importStage: ImportStage;
  preview: SaePreviewResponse | null;
  result: SaeImportResponse | null;
  selectedIds: string[];
  selectedSystem: CourtImportSystem | null;
};

type CourtImportDialogAction =
  | { type: "OPEN_SYSTEM"; system: CourtImportSystem }
  | { type: "CLOSE" }
  | { type: "UPDATE_FIELD"; field: keyof SaePreviewFormValues; value: string }
  | { type: "PREVIEW_STARTED" }
  | { type: "PREVIEW_VALIDATION_ERROR"; message: string }
  | { type: "PREVIEW_SUCCESS"; data: SaePreviewResponse }
  | { type: "PREVIEW_ERROR"; message: string }
  | { type: "IMPORT_STARTED" }
  | { type: "IMPORT_SUCCESS"; data: SaeImportResponse }
  | { type: "IMPORT_ERROR"; message: string }
  | { type: "TOGGLE_ITEM"; externalId: string; checked: boolean }
  | { type: "TOGGLE_ALL"; checked: boolean };

const initialState: CourtImportDialogState = {
  form: initialForm,
  formError: undefined,
  importStage: "idle",
  preview: null,
  result: null,
  selectedIds: [],
  selectedSystem: null
};

export function useCourtImportDialog(options?: {
  onImported?: (result: SaeImportResponse) => void;
}) {
  const [state, dispatch] = useReducer(courtImportDialogReducer, initialState);
  const { isPending: previewPending, mutateAsync: previewCasesAsync } = useSaePreviewMutation();
  const { isPending: importPending, mutateAsync: importCasesAsync } = useSaeImportMutation();
  const onImported = options?.onImported;
  const onImportedRef = useRef(onImported);
  const busy = previewPending || importPending;
  const selectedSet = useMemo(() => new Set(state.selectedIds), [state.selectedIds]);
  const allSelected = useMemo(
    () => (state.preview ? state.selectedIds.length === state.preview.items.length : false),
    [state.preview, state.selectedIds.length]
  );

  useEffect(() => {
    onImportedRef.current = onImported;
  }, [onImported]);

  const updateField = useCallback((field: keyof SaePreviewFormValues, value: string) => {
    dispatch({ field, type: "UPDATE_FIELD", value });
  }, []);

  const openSystem = useCallback((system: CourtImportSystem) => {
    if (!system.enabled) {
      return;
    }

    dispatch({ system, type: "OPEN_SYSTEM" });
  }, []);

  const closeDialog = useCallback(() => {
    dispatch({ type: "CLOSE" });
  }, []);

  const previewCases = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dispatch({ type: "PREVIEW_STARTED" });

    const parsed = saePreviewSchema.safeParse(state.form);

    if (!parsed.success) {
      dispatch({
        message: parsed.error.issues[0]?.message ?? "Revisa los datos de acceso SAE.",
        type: "PREVIEW_VALIDATION_ERROR"
      });
      return;
    }

    try {
      const data = await previewCasesAsync(parsed.data);
      dispatch({ data, type: "PREVIEW_SUCCESS" });
    } catch (error) {
      dispatch({
        message: getSaeErrorMessage(error, "No pudimos consultar SAE."),
        type: "PREVIEW_ERROR"
      });
    }
  }, [previewCasesAsync, state.form]);

  const importSelectedCases = useCallback(async () => {
    if (!state.preview || state.selectedIds.length === 0) {
      return;
    }

    dispatch({ type: "IMPORT_STARTED" });

    try {
      const data = await importCasesAsync({
        importSessionId: state.preview.importSessionId,
        selectedExternalIds: state.selectedIds
      });
      dispatch({ data, type: "IMPORT_SUCCESS" });
      if (data.importedCount + data.updatedCount > 0) {
        onImportedRef.current?.(data);
      }
    } catch (error) {
      dispatch({
        message: getSaeErrorMessage(error, "No pudimos importar los expedientes SAE."),
        type: "IMPORT_ERROR"
      });
    }
  }, [importCasesAsync, state.preview, state.selectedIds]);

  const toggleItem = useCallback((externalId: string, checked: boolean) => {
    dispatch({ checked, externalId, type: "TOGGLE_ITEM" });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    dispatch({ checked, type: "TOGGLE_ALL" });
  }, []);

  return {
    allSelected,
    busy,
    closeDialog,
    form: state.form,
    formError: state.formError,
    importSelectedCases,
    importStage: state.importStage,
    openSystem,
    preview: state.preview,
    previewCases,
    progress: courtImportProgressByStage[state.importStage],
    result: state.result,
    selectedIds: state.selectedIds,
    selectedSet,
    selectedSystem: state.selectedSystem,
    toggleAll,
    toggleItem,
    updateField
  };
}

function courtImportDialogReducer(
  state: CourtImportDialogState,
  action: CourtImportDialogAction
): CourtImportDialogState {
  switch (action.type) {
    case "OPEN_SYSTEM":
      return {
        ...initialState,
        selectedSystem: action.system
      };
    case "CLOSE":
      return initialState;
    case "UPDATE_FIELD":
      return {
        ...state,
        form: {
          ...state.form,
          [action.field]: action.value
        }
      };
    case "PREVIEW_STARTED":
      return {
        ...state,
        formError: undefined,
        importStage: "searching",
        result: null
      };
    case "PREVIEW_VALIDATION_ERROR":
      return {
        ...state,
        formError: action.message,
        importStage: "idle"
      };
    case "PREVIEW_SUCCESS":
      return {
        ...state,
        form: {
          ...state.form,
          password: ""
        },
        formError: undefined,
        importStage: "preview",
        preview: action.data,
        selectedIds: action.data.items.map((item) => item.externalId)
      };
    case "PREVIEW_ERROR":
      return {
        ...state,
        formError: action.message,
        importStage: "error"
      };
    case "IMPORT_STARTED":
      return {
        ...state,
        formError: undefined,
        importStage: "importing"
      };
    case "IMPORT_SUCCESS":
      return {
        ...state,
        formError: undefined,
        importStage: "done",
        preview: null,
        result: action.data,
        selectedIds: []
      };
    case "IMPORT_ERROR":
      return {
        ...state,
        formError: action.message,
        importStage: "error"
      };
    case "TOGGLE_ITEM": {
      const selectedIds = action.checked
        ? Array.from(new Set([...state.selectedIds, action.externalId]))
        : state.selectedIds.filter((id) => id !== action.externalId);

      return {
        ...state,
        selectedIds
      };
    }
    case "TOGGLE_ALL":
      return {
        ...state,
        selectedIds:
          action.checked && state.preview
            ? state.preview.items.map((item) => item.externalId)
            : []
      };
    default:
      return state;
  }
}

function getSaeErrorMessage(error: unknown, fallback: string) {
  const message = getErrorMessage(error);

  return message === "No se pudieron guardar los cambios." ? fallback : message;
}
