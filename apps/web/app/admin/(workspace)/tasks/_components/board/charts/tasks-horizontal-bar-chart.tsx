"use client";

import { Dialog } from "@/components/ui/dialog";
import type { TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import { getChartTone, getValuePercent, type TasksChartDatum } from "./chart-utils";
import { TasksChartDetailsDialog } from "./tasks-chart-details-dialog";
import { TasksChartTooltip } from "./tasks-chart-tooltip";

export function TasksHorizontalBarChart({
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
  const ascendingTicks = [...ticks].reverse();

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[118px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_34px] overflow-visible">
      <div
        className="row-start-1 grid h-full gap-3 pr-3 text-right text-[11px] font-semibold text-foreground/70"
        style={{ gridTemplateRows: `repeat(${data.length}, minmax(0, 1fr))` }}
      >
        {data.map((datum) => (
          <span className="flex items-center justify-end truncate" key={datum.id}>
            {datum.title}
          </span>
        ))}
      </div>

      <div className="relative row-start-1 min-h-0 overflow-visible border-l border-dashed border-border/40">
        {showGridLines ? (
          <div className="pointer-events-none absolute inset-0 flex justify-between">
            {ascendingTicks.map((tick) => (
              <span className="border-l border-dashed border-border/45" key={tick} />
            ))}
          </div>
        ) : null}
        <div
          className="relative grid h-full min-h-[220px] gap-3 py-3 pl-0 pr-4"
          style={{ gridTemplateRows: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((datum) => (
            <HorizontalBarDatum
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

      <div className="col-start-2 row-start-2 flex justify-between pt-2 pl-0 pr-4 text-[11px] font-semibold text-foreground/70">
        {ascendingTicks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </div>
  );
}

function HorizontalBarDatum({
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
  const width = isLoading ? 34 : getValuePercent(datum.count, axisMax);
  const tone = getChartTone(datum.toneKey);

  return (
    <Dialog>
      <div
        className="group relative isolate flex min-h-0 cursor-default items-center"
        data-task-kanban-column={datum.id}
      >
        <span
          className="pointer-events-none absolute inset-y-0 left-0 z-0 w-full bg-[rgba(139,139,134,0.28)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-[rgba(139,139,134,0.18)]"
          aria-hidden="true"
        />
        <TasksChartTooltip
          className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          datum={datum}
          markerClassName={tone.markerClassName}
        />
        <div className="relative z-10 h-5 rounded-[0_3px_3px_0]" style={{ width: `${width}%` }}>
          <span className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#565650] dark:text-[#d8d8d4]">
            {isLoading ? "..." : datum.count}
          </span>
          <div
            className={`h-full w-full rounded-[0_3px_3px_0] shadow-sm transition-all duration-200 group-hover:h-6 group-hover:shadow-md ${tone.barClassName}`}
          />
        </div>
      </div>
      <TasksChartDetailsDialog assignees={assignees} canCreate={canCreate} datum={datum} />
    </Dialog>
  );
}
