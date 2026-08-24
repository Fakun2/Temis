import { RestrictedCases } from "../_components/access/restricted-cases";
import { getCasesServerSession } from "../_api/cases.server-api";
import { CaseDetailView } from "./_components/case-detail-view";
import { loadCaseDetail } from "./_utils/case-detail-loader";
import { getCaseDetailPermissions } from "./_utils/case-detail-permissions";
import type { CaseDetailCalendarFocus, CaseDetailCalendarTarget } from "./_types/case-detail-page.types";

type CaseDetailPageSearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CaseDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: CaseDetailPageSearchParams;
}) {
  const session = await getCasesServerSession();
  const permissions = session ? getCaseDetailPermissions(session) : null;

  if (!session || !permissions?.canReadCase) {
    return <RestrictedCases />;
  }

  const { id } = await params;
  const calendarTarget = parseCalendarTarget(await searchParams);
  const caseResult = await loadCaseDetail(id);

  if (caseResult.error || !caseResult.data) {
    return (
      <div
        data-admin-surface
        className="rounded-md border-0 bg-card p-6 text-sm font-medium text-destructive shadow-[var(--admin-card-shadow)]"
      >
        {caseResult.error?.message ?? "No se pudo cargar el expediente."}
      </div>
    );
  }

  return (
    <CaseDetailView
      calendarTarget={calendarTarget}
      caseItem={caseResult.data}
      permissions={permissions}
    />
  );
}

function parseCalendarTarget(
  searchParams: Awaited<CaseDetailPageSearchParams>
): CaseDetailCalendarTarget {
  const focus = getSingleSearchParam(searchParams.calendarFocus);
  const eventId = getSingleSearchParam(searchParams.eventId);

  if (!eventId || !isCalendarFocus(focus)) {
    return null;
  }

  return { eventId, focus };
}

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isCalendarFocus(value: string | undefined): value is CaseDetailCalendarFocus {
  return value === "expense" || value === "hearing" || value === "task";
}
