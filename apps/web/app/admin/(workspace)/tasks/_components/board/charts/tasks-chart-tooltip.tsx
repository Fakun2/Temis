"use client";

import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import type { TasksChartDatum } from "./chart-utils";

export function TasksChartTooltip({
  className = "bottom-16 left-1/2 -translate-x-1/2",
  datum,
  markerClassName
}: {
  className?: string;
  datum: TasksChartDatum;
  markerClassName: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-30 w-56 translate-y-2 rounded-xl border border-[#d8d6d0] bg-[#f4f3ef]/95 p-0 opacity-0 shadow-xl backdrop-blur-xl transition-all duration-150 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 dark:border-border/50 dark:bg-[#202020]/95 ${className}`}
      role="tooltip"
    >
      <div className="overflow-hidden rounded-xl bg-[#f4f3ef] dark:bg-white/[0.025]">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`size-2 rounded-sm ${markerClassName}`} aria-hidden="true" />
            <span className="truncate text-xs font-semibold text-[#2c2c2b] dark:text-[#f2f4f7]">
              {datum.title}
            </span>
          </div>
          <span className="text-xs font-semibold text-[#565650] dark:text-[#d8d8d4]">
            {datum.count}
          </span>
        </div>
        <div className="border-t border-[#dedbd4] dark:border-white/10">
          <DialogTrigger asChild>
            <Button
              className="pointer-events-auto h-9 w-full justify-start gap-2 rounded-none px-3 text-xs font-medium text-[#686862] hover:bg-[#e9e7e1] hover:text-[#2c2c2b] dark:text-[#b6b6b0] dark:hover:bg-white/[0.04] dark:hover:text-[#f2f4f7]"
              size="sm"
              variant="ghost"
            >
              <ListTodo className="h-3.5 w-3.5" aria-hidden="true" />
              Haz clic para ver los datos
            </Button>
          </DialogTrigger>
        </div>
      </div>
    </div>
  );
}
