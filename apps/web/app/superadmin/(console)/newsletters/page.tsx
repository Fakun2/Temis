import { UnauthorizedState } from "@/components/ui/not-found";
import { getVerifiedPlatformSession } from "@/lib/api/platform-server";
import { hasSuperAdminPermission } from "@/lib/auth/superadmin-permissions";
import { NewsletterBuilder } from "./_components/newsletter-builder";

export default async function NewslettersPage() {
  const session = await getVerifiedPlatformSession();
  if (!session || !hasSuperAdminPermission(session, "platform:announcements:manage")) {
    return (
      <UnauthorizedState
        title="Newsletter restringida"
        description="No tenés permisos para gestionar newsletters de plataforma."
      />
    );
  }

  return <NewsletterBuilder />;
}
