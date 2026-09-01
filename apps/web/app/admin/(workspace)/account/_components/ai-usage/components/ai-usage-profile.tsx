import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "../../../_utils/account-format";
import { getReadablePlanName } from "../utils";
import type { AccountAiUsageResponse } from "../types";

export function AiUsageProfile({ usage }: { usage: AccountAiUsageResponse }) {
  return (
    <section className="flex flex-col items-center gap-4 pt-5 text-center md:pt-8">
      <Avatar className="size-[100px] md:size-[114px]" size="xl">
        {usage.profile.avatarUrl ? (
          <AvatarImage src={usage.profile.avatarUrl} alt={usage.profile.fullName} />
        ) : null}
        <AvatarFallback className="bg-[#8f54be] text-lg font-normal text-white">
          {getInitials(usage.profile.fullName)}
        </AvatarFallback>
      </Avatar>

      <div className="grid gap-2">
        <p className="text-[18px] font-normal leading-none tracking-normal text-foreground md:text-[24px]">
          {usage.profile.fullName}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 text-base leading-none text-muted-foreground md:text-md">
          <span>{usage.profile.email}</span>
          <span aria-hidden="true">·</span>
          <Badge
            variant="outline"
            className="h-5 rounded-full bg-background px-1.5 text-xs font-normal"
          >
            {getReadablePlanName(usage.membership.accountPlan)}
          </Badge>
        </div>
      </div>
    </section>
  );
}
