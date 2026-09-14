"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConnectorSearch({
  inputRef,
  open,
  search,
  onOpenChange,
  onSearchChange
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  open: boolean;
  search: string;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-10 shrink-0 rounded-full text-muted-foreground transition-colors duration-200 hover:bg-secondary/60 hover:text-foreground"
        aria-label="Buscar conexiones"
        onClick={() => onOpenChange(true)}
      >
        <Search className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
      </Button>
      <div
        className={open
          ? "relative w-40 translate-x-0 overflow-hidden rounded-xl opacity-100 transition-[width,opacity,transform] duration-300 ease-out"
          : "pointer-events-none relative w-0 -translate-x-1 overflow-hidden rounded-xl opacity-0 transition-[width,opacity,transform] duration-300 ease-out"}
      >
        <Input
          ref={inputRef}
          className="h-10 w-40 rounded-xl border-none !bg-[transparent] px-3 text-base text-foreground"
          placeholder="Buscar conexiones"
          tabIndex={open ? 0 : -1}
          value={search}
          onBlur={() => {
            if (!search) {
              onOpenChange(false);
            }
          }}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
    </div>
  );
}
