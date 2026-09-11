import type { ClientStatus } from "@temis/api-client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { clientStatusLabels } from "../_constants/clients.constants";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const styles: Record<ClientStatus, string> = {
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
    archived: "border-border/40 bg-muted text-muted-foreground",
    inactive: "border-muted-foreground/20 bg-secondary text-muted-foreground"
  };

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1", styles[status])}>
      {clientStatusLabels[status]}
    </Badge>
  );
}
