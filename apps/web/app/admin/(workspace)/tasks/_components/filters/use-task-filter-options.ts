"use client";

import { useMemo } from "react";
import { useSession } from "@/lib/auth/use-session";
import { listClients } from "../../../clients/_api/clients.api";
import { useCasesQuery } from "../../../cases/_hooks/use-cases-query";
import type { TaskAssigneeOption } from "../../../cases/_types/cases.types";

export function useTaskFilterOptions(assignees: TaskAssigneeOption[]) {
  const session = useSession();
  const clientsQuery = useCasesQuery({
    enabled: true,
    permission: "clients:read",
    queryKey: ["clients", "task-filter-options"],
    queryFn: () => listClients({ limit: 50, order: "asc", sort: "name", status: "active" })
  });
  const currentAssignee = assignees.find((assignee) => assignee.userId === session?.user.id);
  const practiceAreas = useMemo(() => getAssigneePracticeAreas(assignees), [assignees]);

  return {
    clients: clientsQuery.data?.items ?? [],
    clientsQuery,
    currentAssignee,
    practiceAreas
  };
}

function getAssigneePracticeAreas(assignees: TaskAssigneeOption[]) {
  const areas = new Map<string, { id: string; name: string }>();

  for (const assignee of assignees) {
    for (const area of assignee.practiceAreas) {
      areas.set(area.id, area);
    }
  }

  return [...areas.values()].sort((a, b) => a.name.localeCompare(b.name));
}
