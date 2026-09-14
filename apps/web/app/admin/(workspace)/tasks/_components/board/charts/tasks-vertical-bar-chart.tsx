"use client";

import { Dialog } from "@/components/ui/dialog";
import type { TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import {
  getChartTone,
  getValuePercent,
  type TasksChartDatum
} from "./chart-utils";
import { TasksChartDetailsDialog } from "./tasks-chart-details-dialog";
import { TasksChartTooltip } from "./tasks-chart-tooltip";

export function TasksVerticalBarChart({
  assignees,
  axisMax,
  canCreate,
  data,
  isLoading,
  showGridLines,
  ticks
}: {
  assignees: TaskAssigneeOption[];
  axisMax: number;
  canCreate: boolean;
  data: TasksChartDatum[];
  isLoading: boolean;
  showGridLines: boolean;
  ticks: number[];
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-[44px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_34px] overflow-visible">
      <div className="relative row-start-1 flex h-full flex-col justify-between pr-3 text-right text-[11px] font-semibold text-foreground/70">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>

      <div className="relative row-start-1 min-h-0 overflow-visible border-b border-dashed border-border/40">
        {showGridLines ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {ticks.map((tick) => (
              <span className="border-t border-dashed border-border/45" key={tick} />
            ))}
          </div>
        ) : null}
          <div
            className="relative grid h-full min-h-[220px] items-end gap-4 px-4 pt-3"
            style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
          >
          {data.map((datum) => (
            <VerticalBarDatum
              assignees={assignees}
              axisMax={axisMax}
              canCreate={canCreate}
              datum={datum}
              isLoading={isLoading}
              key={datum.id}
            />
          ))}
        </div>
      </div>

      <div
        className="col-start-2 row-start-2 grid gap-4 px-4 pt-2 text-center text-[11px] font-semibold text-foreground/70"
        style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((datum) => (
          <span className="truncate" key={datum.id}>
            {datum.title}
          </span>
        ))}
      </div>
    </div>
  );
}

function VerticalBarDatum({
  assignees,
  axisMax,
  canCreate,
  datum,
  isLoading
}: {
  assignees: TaskAssigneeOption[];
  axisMax: number;
  canCreate: boolean;
  datum: TasksChartDatum;
  isLoading: boolean;
}) {
  const height = isLoading ? 34 : getValuePercent(datum.count, axisMax);
  const tone = getChartTone(datum.toneKey);

  return (
    <Dialog>
      <div
        className="group relative isolate flex h-full min-w-0 cursor-default flex-col items-center justify-end gap-2"
        data-task-kanban-column={datum.id}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-60 -translate-x-1/2 bg-[rgba(139,139,134,0.42)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-[rgba(139,139,134,0.22)]"
          aria-hidden="true"
        />
        <TasksChartTooltip datum={datum} markerClassName={tone.markerClassName} />
        <div className="relative z-10 flex h-full min-h-0 w-full items-end justify-center">
          <div className="relative flex items-end justify-center" style={{ height: `${height}%` }}>
            <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 text-xs font-semibold text-[#565650] dark:text-[#d8d8d4]">
              {isLoading ? "..." : datum.count}
            </span>
            <div
              className={`relative z-10 h-full w-5 rounded-[3px_3px_0_0] shadow-sm transition-all duration-200 group-hover:w-6 group-hover:shadow-md ${tone.barClassName}`}
            />
          </div>
        </div>
      </div>
      <TasksChartDetailsDialog assignees={assignees} canCreate={canCreate} datum={datum} />
    </Dialog>
  );
}
