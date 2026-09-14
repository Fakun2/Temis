import type { CaseTaskFormValues } from "@/lib/validation/cases";
import type {
  CaseTaskStatus,
  GlobalCaseTaskDto,
  TenantCaseTasksMetricsDto
} from "../../cases/_types/cases.types";

export type KanbanColumnId = "todo" | "in_progress" | "overdue" | "done";
export type TaskMovePatch = Pick<GlobalCaseTaskDto, "endDate" | "status">;

export const kanbanColumns = [
  {
    id: "todo",
    title: "Por hacer",
    status: "pending"
  },
  {
    id: "in_progress",
    title: "En curso",
    status: "in_progress"
  },
  {
    id: "overdue",
    title: "Vencidas",
    status: null
  },
  {
    id: "done",
    title: "Finalizadas",
    status: "completed"
  }
] as const satisfies Array<{
  id: KanbanColumnId;
  status: CaseTaskStatus | null;
  title: string;
}>;

export type KanbanColumn = (typeof kanbanColumns)[number];

export function groupTasksByColumn(
  tasks: GlobalCaseTaskDto[]
): Record<KanbanColumnId, GlobalCaseTaskDto[]> {
  const groups: Record<KanbanColumnId, GlobalCaseTaskDto[]> = {
    done: [],
    in_progress: [],
    overdue: [],
    todo: []
  };

  for (const task of tasks) {
    groups[getTaskColumn(task)].push(task);
  }

  return groups;
}

export function getTaskColumn(task: Pick<GlobalCaseTaskDto, "endDate" | "status">): KanbanColumnId {
  if (task.status === "completed" || task.status === "cancelled") {
    return "done";
  }

  if (isOverdue(task.endDate)) {
    return "overdue";
  }

  if (task.status === "in_progress") {
    return "in_progress";
  }

  return "todo";
}

export function getTaskMovePatch(
  task: GlobalCaseTaskDto,
  nextStatus: CaseTaskStatus
): TaskMovePatch {
  const nextEndDate = isOverdue(task.endDate) && isActionable(nextStatus)
    ? getTodayDateKey()
    : task.endDate;

  return {
    endDate: nextEndDate,
    status: nextStatus
  };
}

export function hasTaskMoveChanges(task: GlobalCaseTaskDto, patch: TaskMovePatch) {
  return task.status !== patch.status || task.endDate !== patch.endDate;
}

export function toTaskFormValues(
  task: GlobalCaseTaskDto,
  patch: TaskMovePatch
): CaseTaskFormValues {
  return {
    assignedMembershipId: task.assignedMembershipId ?? "",
    endDate: patch.endDate ?? "",
    name: task.name,
    notes: task.notes ?? "",
    notificationDate: task.notificationDate ?? "",
    notificationEnabled: task.notificationEnabled,
    notificationMembershipIds: task.notificationMembershipIds,
    notificationPracticeAreaId: task.notificationPracticeAreaId ?? "",
    notificationRecipientMode: task.notificationRecipientMode,
    notificationTime: task.notificationTime ?? "",
    startDate: task.startDate ?? "",
    status: patch.status
  };
}

export function applyMetricsMove(
  metrics: TenantCaseTasksMetricsDto,
  task: GlobalCaseTaskDto,
  patch: TaskMovePatch
): TenantCaseTasksMetricsDto {
  const nextTask = { ...task, ...patch };

  return {
    done: clampMetric(metrics.done - getDoneWeight(task) + getDoneWeight(nextTask)),
    dueSoon: clampMetric(metrics.dueSoon - getDueSoonWeight(task) + getDueSoonWeight(nextTask)),
    overdue: clampMetric(metrics.overdue - getOverdueWeight(task) + getOverdueWeight(nextTask)),
    todo: clampMetric(metrics.todo - getTodoWeight(task) + getTodoWeight(nextTask))
  };
}

export function calculateTasksMetrics(
  tasks: Array<Pick<GlobalCaseTaskDto, "endDate" | "status">>
): TenantCaseTasksMetricsDto {
  return tasks.reduce<TenantCaseTasksMetricsDto>(
    (metrics, task) => ({
      done: metrics.done + getDoneWeight(task),
      dueSoon: metrics.dueSoon + getDueSoonWeight(task),
      overdue: metrics.overdue + getOverdueWeight(task),
      todo: metrics.todo + getTodoWeight(task)
    }),
    { done: 0, dueSoon: 0, overdue: 0, todo: 0 }
  );
}

export function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Buenos_Aires",
    year: "numeric"
  }).formatToParts(new Date());
  const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

function isOverdue(value: string | null) {
  if (!value) {
    return false;
  }

  return value.slice(0, 10) < getTodayDateKey();
}

function getTodoWeight(task: Pick<GlobalCaseTaskDto, "status">) {
  return isActionable(task.status) ? 1 : 0;
}

function getDoneWeight(task: Pick<GlobalCaseTaskDto, "status">) {
  return task.status === "completed" ? 1 : 0;
}

function getDueSoonWeight(task: Pick<GlobalCaseTaskDto, "endDate" | "status">) {
  if (!isActionable(task.status) || !task.endDate) {
    return 0;
  }

  const dueDate = task.endDate.slice(0, 10);
  const today = getTodayDateKey();
  const dueSoonEndDate = getDateKeyWithOffset(7);

  return dueDate >= today && dueDate <= dueSoonEndDate ? 1 : 0;
}

function getOverdueWeight(task: Pick<GlobalCaseTaskDto, "endDate" | "status">) {
  return isActionable(task.status) && isOverdue(task.endDate) ? 1 : 0;
}

function isActionable(status: CaseTaskStatus) {
  return status === "pending" || status === "in_progress";
}

function getDateKeyWithOffset(days: number) {
  const today = new Date(`${getTodayDateKey()}T00:00:00.000Z`);
  today.setUTCDate(today.getUTCDate() + days);

  return today.toISOString().slice(0, 10);
}

function clampMetric(value: number) {
  return Math.max(0, value);
}
