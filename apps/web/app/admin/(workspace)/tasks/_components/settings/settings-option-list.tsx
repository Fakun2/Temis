"use client";

import type { ComponentType, SVGProps } from "react";
import { Check, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SettingsIcon = ComponentType<SVGProps<SVGSVGElement>>;

export function SettingsOptionList<
  TValue extends string,
  TOption extends { icon?: SettingsIcon; label?: string; value: TValue }
>({
  activeValue,
  fallbackIcon: FallbackIcon = Table2,
  getLabel,
  onSelect,
  options
}: {
  activeValue: TValue;
  fallbackIcon?: SettingsIcon;
  getLabel?: (option: TOption) => string;
  onSelect: (value: TValue) => void;
  options: TOption[];
}) {
  return (
    <div className="grid gap-0.5">
      {options.map((option) => {
        const Icon = option.icon ?? FallbackIcon;
        const active = activeValue === option.value;

        return (
          <button
            className={cn(
              "flex h-7 items-center gap-2 rounded-md px-2 text-left text-[11px] hover:bg-secondary/50",
              active && "bg-secondary/70"
            )}
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
          >
            <Icon className="size-3.5 text-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{getLabel?.(option) ?? option.label}</span>
            {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsDirectionPicker({
  direction,
  onDirectionChange
}: {
  direction: "asc" | "desc";
  onDirectionChange: (direction: "asc" | "desc") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 border-t border-border/40 pt-2">
      <Button
        type="button"
        variant={direction === "asc" ? "secondary" : "outline"}
        className="h-7 rounded-md text-[11px]"
        onClick={() => onDirectionChange("asc")}
      >
        Ascendente
      </Button>
      <Button
        type="button"
        variant={direction === "desc" ? "secondary" : "outline"}
        className="h-7 rounded-md text-[11px]"
        onClick={() => onDirectionChange("desc")}
      >
        Descendente
      </Button>
    </div>
  );
}
