import type { AccountResponse } from "../_types/account.types";
import { ExpedientesSection } from "./expedientes-section";
import { MembershipSection } from "./membership-section";
import { NotificationsSection } from "./notifications-section";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { StudioSection } from "./studio-section";

export function AccountView({ account }: { account: AccountResponse }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto scrollbar-none px-2 pb-6 sm:px-6 lg:px-10 xl:px-12">
      <div className="flex min-w-0 flex-col gap-1 px-1">
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">Cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Perfil, estudio, membresia y preferencias del workspace activo.
        </p>
      </div>

      <div className="grid min-w-0 gap-4">
        <ProfileSection account={account} />
        <SecuritySection hasPassword={account.profile.hasPassword} />
        <ExpedientesSection account={account} />
        <StudioSection account={account} />
        <MembershipSection account={account} />
        <NotificationsSection account={account} />
      </div>
    </div>
  );
}
