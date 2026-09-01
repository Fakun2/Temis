import type { CaseFormValues } from "@/lib/validation/cases";
import { emptyCaseDraft } from "../_constants/cases.constants";
import type { ParticipantDraft } from "../_types/case-form.types";
import type { CaseDto } from "../_types/cases.types";

export function toCaseDraft(caseItem?: CaseDto): CaseFormValues {
  if (!caseItem) {
    return { ...emptyCaseDraft, participants: [] };
  }

  return {
    caseNumber: caseItem.caseNumber,
    caption: caseItem.caption,
    subject: caseItem.subject ?? "",
    description: caseItem.description ?? "",
    provinceId: caseItem.province?.id ?? "",
    forumTemplateId: caseItem.forum?.id ?? "",
    judicialCenterForumId: caseItem.judicialCenterForumId ?? "",
    judicialCenterText: caseItem.judicialCenterText ?? "",
    court: caseItem.court ?? "",
    instance: caseItem.instance,
    status: caseItem.status,
    filingDate: caseItem.filingDate ?? "",
    primaryClientId: caseItem.primaryClientId ?? "",
    practiceAreaId: caseItem.practiceAreaId ?? "",
    responsibleMembershipId: caseItem.responsibleMembershipId ?? "",
    participants: caseItem.participants.map((participant) => ({
      address: participant.address ?? "",
      clientId: participant.clientId ?? "",
      displayName: participant.displayName,
      document: participant.document ?? "",
      email: participant.email ?? "",
      notes: participant.notes ?? "",
      participantKind: participant.participantKind,
      phone: participant.phone ?? "",
      role: participant.role
    }))
  };
}

export function createParticipantDraft(): ParticipantDraft {
  return {
    address: "",
    clientId: "",
    displayName: "",
    document: "",
    email: "",
    notes: "",
    participantKind: "other",
    phone: "",
    role: "other"
  };
}
