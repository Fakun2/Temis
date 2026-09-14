"use client";

import { Dialog } from "@/components/ui/dialog";
import type { TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import { getChartTone, getPercent, type TasksChartDatum } from "./chart-utils";
import { TasksChartDetailsDialog } from "./tasks-chart-details-dialog";
import { TasksChartTooltip } from "./tasks-chart-tooltip";

export function TasksPieChart({
  assignees,
  canCreate,
  data,
  isLoading
}: {
  assignees: TaskAssigneeOption[];
  canCreate: boolean;
  data: TasksChartDatum[];
  isLoading: boolean;
}) {
  const total = data.reduce((sum, datum) => sum + datum.count, 0);
  const gradient = getPieGradient(data, total);

  return (
    <div className="grid min-h-[360px] flex-1 grid-cols-[minmax(220px,360px)_minmax(0,1fr)] items-center gap-8 overflow-visible px-6">
      <div className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center rounded-full shadow-inner">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: gradient }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex size-36 flex-col items-center justify-center rounded-full bg-background/95 text-center shadow-sm">
          <span className="text-3xl font-semibold text-foreground">{isLoading ? "..." : total}</span>
          <span className="text-xs font-medium text-muted-foreground">tareas</span>
        </div>
      </div>

      <div className="grid gap-2">
        {data.map((datum) => (
          <PieDatum
            assignees={assignees}
            canCreate={canCreate}
            datum={datum}
            isLoading={isLoading}
            key={datum.id}
            total={total}
          />
        ))}
      </div>
    </div>
  );
}

function PieDatum({
  assignees,
  canCreate,
  datum,
  isLoading,
  total
}: {
  assignees: TaskAssigneeOption[];
  canCreate: boolean;
  datum: TasksChartDatum;
  isLoading: boolean;
  total: number;
}) {
  const tone = getChartTone(datum.toneKey);
  const percent = getPercent(datum.count, total);

  return (
    <Dialog>
      <div className="group relative isolate min-h-12 cursor-default rounded-lg px-3 py-2 transition-colors hover:bg-[rgba(139,139,134,0.22)] dark:hover:bg-[rgba(139,139,134,0.16)]">
        <TasksChartTooltip
          className="right-0 top-1/2 -translate-y-1/2"
          datum={datum}
          markerClassName={tone.markerClassName}
        />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-3 rounded-sm ${tone.markerClassName}`} aria-hidden="true" />
            <span className="truncate text-sm font-semibold text-foreground">{datum.title}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span>{isLoading ? "..." : `${percent}%`}</span>
            <span>{isLoading ? "..." : datum.count}</span>
          </div>
        </div>
      </div>
      <TasksChartDetailsDialog assignees={assignees} canCreate={canCreate} datum={datum} />
    </Dialog>
  );
}

function getPieGradient(data: TasksChartDatum[], total: number) {
  if (total <= 0) {
    return "conic-gradient(rgba(139,139,134,0.35) 0deg 360deg)";
  }

  let start = 0;
  const segments = data.map((datum) => {
    const degrees = (datum.count / total) * 360;
    const color = getChartTone(datum.toneKey).solidColor;
    const segment = `${color} ${start}deg ${start + degrees}deg`;
    start += degrees;
    return segment;
  });

  return `conic-gradient(${segments.join(", ")})`;
}
