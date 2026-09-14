"use client";

import { Dialog } from "@/components/ui/dialog";
import type { TaskAssigneeOption } from "../../../../cases/_types/cases.types";
import { getChartTone, getValuePercent, type TasksChartDatum } from "./chart-utils";
import { TasksChartDetailsDialog } from "./tasks-chart-details-dialog";
import { TasksChartTooltip } from "./tasks-chart-tooltip";

export function TasksLineChart({
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
  const points = data.map((datum, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 100 - getValuePercent(isLoading ? 1 : datum.count, axisMax);
    return `${x},${Math.min(98, Math.max(2, y))}`;
  });

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
        <svg
          className="pointer-events-none absolute inset-x-4 inset-y-3 z-10 overflow-visible"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <polyline
            fill="none"
            points={points.join(" ")}
            stroke="hsl(var(--primary))"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="relative grid h-full min-h-[220px] gap-4 px-4 pt-3"
          style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}
        >
          {data.map((datum) => (
            <LineChartDatum
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

function LineChartDatum({
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
  const bottom = isLoading ? 34 : getValuePercent(datum.count, axisMax);
  const tone = getChartTone(datum.toneKey);

  return (
    <Dialog>
      <div className="group relative isolate h-full min-w-0 cursor-default" data-task-kanban-column={datum.id}>
        <span
          className="pointer-events-none absolute inset-y-0 left-1/2 z-0 w-60 -translate-x-1/2 bg-[rgba(139,139,134,0.42)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 dark:bg-[rgba(139,139,134,0.22)]"
          aria-hidden="true"
        />
        <TasksChartTooltip datum={datum} markerClassName={tone.markerClassName} />
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 translate-y-1/2"
          style={{ bottom: `${bottom}%` }}
        >
          <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-semibold text-[#565650] dark:text-[#d8d8d4]">
            {isLoading ? "..." : datum.count}
          </span>
          <span
            className={`block size-4 rounded-full ring-4 ring-background shadow-sm transition-transform duration-150 group-hover:scale-125 ${tone.barClassName}`}
          />
        </div>
      </div>
      <TasksChartDetailsDialog assignees={assignees} canCreate={canCreate} datum={datum} />
    </Dialog>
  );
}
