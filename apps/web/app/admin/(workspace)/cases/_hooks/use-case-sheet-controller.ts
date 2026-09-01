"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { CaseFormValues } from "@/lib/validation/cases";
import { caseFormSchema } from "@/lib/validation/cases";
import { caseCatalogStrategies } from "../_constants/cases.constants";
import type {
  CaseFormErrors,
  ParticipantDraft,
  ParticipantErrors
} from "../_types/case-form.types";
import type {
  CaseDto,
  CatalogResponse,
  ForumDto,
  JudicialCenterDto,
  ProvinceDto
} from "../_types/cases.types";
import { createParticipantDraft, toCaseDraft } from "../_utils/case-draft";
import { toCaseFormErrors, toParticipantErrors } from "../_utils/case-errors";
import { casesMutations } from "../_api/cases.mutation-controller";
import { casesQueries } from "../_api/cases.query-controller";
import { useCasesMutation } from "./use-cases-mutation";
import { useCasesQuery } from "./use-cases-query";

export function useCaseSheetController({
  caseItem,
  onSuccess
}: {
  caseItem?: CaseDto;
  onSuccess?: () => void;
}) {
  const [draft, setDraft] = useState<CaseFormValues>(() => toCaseDraft(caseItem));
  const [judicialCenterId, setJudicialCenterId] = useState(
    () => caseItem?.judicialCenter?.id ?? ""
  );
  const [errors, setErrors] = useState<CaseFormErrors>({});
  const [participantErrors, setParticipantErrors] = useState<ParticipantErrors>({});

  const provincesQuery = useCasesQuery<CatalogResponse<ProvinceDto>>(
    casesQueries.catalogOptions<ProvinceDto>({ key: "provinces", path: "/provinces" })
  );
  useEffect(() => {
    const importedProvinceText = caseItem?.provinceText;

    if (caseItem?.province?.id || !importedProvinceText || draft.provinceId) {
      return;
    }

    const expectedProvince = normalizeCatalogText(importedProvinceText);
    const province = (provincesQuery.data?.items ?? []).find((item) =>
      [item.code, item.name].some((value) => normalizeCatalogText(value) === expectedProvince)
    );

    if (province) {
      setDraft((current) =>
        current.provinceId ? current : { ...current, provinceId: province.id }
      );
    }
  }, [
    caseItem?.province?.id,
    caseItem?.provinceText,
    draft.provinceId,
    provincesQuery.data?.items
  ]);

  const selectedProvince = (provincesQuery.data?.items ?? []).find(
    (province) => province.id === draft.provinceId
  );
  const catalogStrategy = selectedProvince?.caseCatalogStrategy ?? "manual";
  const strategyConfig = caseCatalogStrategies[catalogStrategy];

  const judicialCentersQuery = useCasesQuery(
    casesQueries.catalogOptions<JudicialCenterDto>({
      key: "judicial-centers",
      path: "/judicial-centers",
      params: { provinceId: draft.provinceId }
    })
  );
  const forumsQuery = useCasesQuery(
    casesQueries.catalogOptions<ForumDto>({
      key: "forums",
      path: "/forums",
      params: {
        judicialCenterId:
          strategyConfig.forumScope === "judicialCenter" ? judicialCenterId : undefined,
        provinceId: draft.provinceId
      }
    })
  );
  const mutation = useCasesMutation(casesMutations.saveCase(caseItem?.id));

  const forumDisabled =
    !draft.provinceId ||
    forumsQuery.isLoading ||
    (strategyConfig.forumScope === "judicialCenter" && !judicialCenterId);

  const prepareDraft = useCallback(() => {
    setDraft(toCaseDraft(caseItem));
    setJudicialCenterId(caseItem?.judicialCenter?.id ?? "");
    setErrors({});
    setParticipantErrors({});
  }, [caseItem]);

  function updateDraft<K extends keyof CaseFormValues>(key: K, value: CaseFormValues[K]) {
    setDraft((current) => ({
      ...current,
      [key]: value,
      ...(key === "provinceId"
        ? { forumTemplateId: "", judicialCenterForumId: "", judicialCenterText: "" }
        : {})
    }));

    if (key === "provinceId") {
      setJudicialCenterId("");
    }
  }

  function updateJudicialCenter(value: string) {
    setJudicialCenterId(value);
    setDraft((current) => ({
      ...current,
      forumTemplateId: "",
      judicialCenterForumId: "",
      judicialCenterText: ""
    }));
  }

  function updateForum(value: string) {
    const forum = forumsQuery.data?.items.find((item) => item.id === value);

    setDraft((current) => ({
      ...current,
      forumTemplateId: value,
      judicialCenterForumId: forum?.judicialCenterForumId ?? ""
    }));
  }

  function addParticipant() {
    setDraft((current) => ({
      ...current,
      participants: [...current.participants, createParticipantDraft()]
    }));
  }

  function updateParticipant<K extends keyof ParticipantDraft>(
    index: number,
    key: K,
    value: ParticipantDraft[K]
  ) {
    setDraft((current) => ({
      ...current,
      participants: current.participants.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [key]: value } : participant
      )
    }));
  }

  function removeParticipant(index: number) {
    setDraft((current) => ({
      ...current,
      participants: current.participants.filter((_, participantIndex) => participantIndex !== index)
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = caseFormSchema.safeParse(draft);

    if (!parsed.success) {
      setErrors(toCaseFormErrors(parsed.error.flatten().fieldErrors));
      setParticipantErrors(toParticipantErrors(parsed.error.issues));
      return;
    }

    setErrors({});
    setParticipantErrors({});
    await mutation.mutateAsync(parsed.data);
    onSuccess?.();
  }

  return {
    addParticipant,
    draft,
    errors,
    forumDisabled,
    forums: forumsQuery.data?.items ?? [],
    handleSubmit,
    judicialCenterId,
    judicialCenters: judicialCentersQuery.data?.items ?? [],
    judicialCentersLoading: judicialCentersQuery.isLoading,
    mutation,
    participantErrors,
    prepareDraft,
    provinces: provincesQuery.data?.items ?? [],
    removeParticipant,
    strategyConfig,
    updateDraft,
    updateForum,
    updateJudicialCenter,
    updateParticipant
  };
}

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
