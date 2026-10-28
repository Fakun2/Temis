import { Suspense } from "react";
import { UnauthorizedState } from "@/components/ui/not-found";
import { Skeleton } from "@/components/ui/skeleton";
import { getVerifiedPlatformSession } from "@/lib/api/platform-server";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { AnnouncementsView } from "./_components/announcements-view";
import {
  getAnnouncementsSummaryServer,
  listAnnouncementsServer
} from "./_api/announcements.server-api";
import { parseAnnouncementQuery, type AnnouncementSearchParams } from "./_utils/announcement-query";

export default async function AnnouncementsPage({
  searchParams
}: {
  searchParams?: Promise<AnnouncementSearchParams>;
}) {
  const session = await getVerifiedPlatformSession();
  if (!session || !hasSuperAdminPermission(session, "platform:announcements:manage")) {
    return (
      <UnauthorizedState
        title="Comunicados restringidos"
        description="No tenés permisos para gestionar comunicados de plataforma."
      />
    );
  }
  const params = (await searchParams) ?? {};
  return (
    <Suspense fallback={<AnnouncementsSkeleton />} key={JSON.stringify(params)}>
      <AnnouncementsContent params={params} />
    </Suspense>
  );
}

async function AnnouncementsContent({ params }: { params: AnnouncementSearchParams }) {
  const { cursorStack, query } = parseAnnouncementQuery(params);
  const [listResult, summaryResult] = await Promise.allSettled([
    listAnnouncementsServer(query),
    getAnnouncementsSummaryServer()
  ]);
  return (
    <AnnouncementsView
      cursorStack={cursorStack}
      data={listResult.status === "fulfilled" ? listResult.value : undefined}
      error={listResult.status === "rejected" ? errorMessage(listResult.reason) : null}
      query={query}
      summary={summaryResult.status === "fulfilled" ? summaryResult.value : undefined}
    />
  );
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "No se pudieron cargar los comunicados.";
}

function AnnouncementsSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-8">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-28 rounded-2xl" key={index} />
        ))}
      </div>
      <Skeleton className="min-h-[480px] flex-1 rounded-2xl" />
    </div>
  );
}
