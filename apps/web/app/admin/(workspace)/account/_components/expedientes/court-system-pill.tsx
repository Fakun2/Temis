import { memo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import type { CourtImportSystem } from "../../_constants/court-import-systems";

export const CourtSystemPill = memo(function CourtSystemPill({
  disabled,
  onSelect,
  system
}: {
  disabled: boolean;
  onSelect: (system: CourtImportSystem) => void;
  system: CourtImportSystem;
}) {
  const isDisabled = disabled || !system.enabled;
  const handleClick = useCallback(() => {
    onSelect(system);
  }, [onSelect, system]);

  return (
    <button
      type="button"
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-left text-sm transition-[background-color,border-color,color,transform] ${
        isDisabled
          ? "cursor-not-allowed border-border/50 bg-muted/35 text-muted-foreground opacity-70"
          : "border-primary/30 bg-primary/10 text-foreground hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/15"
      }`}
      disabled={isDisabled}
      onClick={handleClick}
      aria-label={
        system.enabled
          ? `Importar expedientes desde ${system.name}`
          : `${system.name} proximamente`
      }
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        {system.logoUrl ? (
          <img
            src={system.logoUrl}
            alt=""
            className="size-5 shrink-0 rounded-[5px] object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <span className="truncate font-medium">{system.name}</span>
      </span>
      <span className="text-xs opacity-75">{system.jurisdiction}</span>
      {!system.enabled ? (
        <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px]">
          Proximamente
        </Badge>
      ) : null}
    </button>
  );
});
