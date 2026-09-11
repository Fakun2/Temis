"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  ListTodo,
  Search
} from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SearchHighlight } from "../search-highlight";
import { adminCommandSections } from "../../_constants/command-palette";
import { useDashboardSearchQuery } from "../../_hooks/use-dashboard-search-query";
import { getAuthorizedCommandSections } from "../../_utils/authorization";
import type { AdminCommandItem, AdminCommandSection } from "../../_types/admin";
import type { DashboardSearchItemDto } from "../../_types/dashboard.types";
import type { TemisSession } from "@/lib/auth/session";

type AdminCommandPaletteProps = {
  open: boolean;
  session: TemisSession | null;
  onOpenChange: (open: boolean) => void;
};

const dashboardSearchDebounceMs = 350;
const dashboardSearchPageSize = 8;

export function AdminCommandPalette({ open, session, onOpenChange }: AdminCommandPaletteProps) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [cursorStack, setCursorStack] = useState<string[]>([""]);
  const cursor = cursorStack.at(-1) || undefined;
  const pageIndex = cursorStack.length - 1;
  const commandSections = useMemo(
    () => getAuthorizedCommandSections(session, adminCommandSections),
    [session]
  );
  const visibleCommandSections = useMemo(
    () => filterCommandSections(commandSections, search),
    [commandSections, search]
  );
  const searchParams = useMemo(
    () => ({
      cursor,
      limit: dashboardSearchPageSize,
      offset: pageIndex * dashboardSearchPageSize,
      search
    }),
    [cursor, pageIndex, search]
  );
  const dashboardSearchQuery = useDashboardSearchQuery(searchParams, {
    enabled: open && search.length > 0
  });
  const dynamicResults = dashboardSearchQuery.data?.items ?? [];
  const searchErrorMessage = getErrorMessage(dashboardSearchQuery.error);
  const pageInfo = dashboardSearchQuery.data?.pageInfo;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setCursorStack([""]);
    }, dashboardSearchDebounceMs);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setSearch("");
      setCursorStack([""]);
    }
  }, [open]);

  function runCommand(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function goToNextResultsPage() {
    if (pageInfo?.nextCursor) {
      setCursorStack((currentStack) => [...currentStack, pageInfo.nextCursor!]);
    }
  }

  function goToPreviousResultsPage() {
    setCursorStack((currentStack) => currentStack.slice(0, -1));
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-foreground/25 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[80] w-[calc(100vw-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[22px] border border-border/70 bg-popover/95 p-2.5 text-popover-foreground shadow-[0_22px_64px_-34px_rgba(15,23,42,0.66),0_0_0_1px_color-mix(in_oklab,var(--foreground)_8%,transparent)] outline-none backdrop-blur-xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DialogPrimitive.Title className="sr-only">Buscador global</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Busca acciones rapidas y destinos de navegacion del panel.
          </DialogPrimitive.Description>
          <Command
            shouldFilter={false}
            className="rounded-[18px] bg-transparent [&_[data-slot=command-input-wrapper]>svg]:hidden [&_[data-slot=command-input-wrapper]]:h-10 [&_[data-slot=command-input-wrapper]]:rounded-[16px] [&_[data-slot=command-input-wrapper]]:border [&_[data-slot=command-input-wrapper]]:border-border/50 [&_[data-slot=command-input-wrapper]]:bg-secondary/35 [&_[data-slot=command-input-wrapper]]:px-0 [&_[data-slot=command-input-wrapper]]:shadow-inner"
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <CommandInput
                autoFocus
                placeholder="Buscar expedientes, archivos, caja, tareas..."
                value={searchInput}
                onValueChange={setSearchInput}
                className="h-10 pl-10 pr-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
              />
            </div>

            <CommandList className="mt-2 max-h-[min(440px,calc(100svh-128px))] overflow-y-auto scrollbar-none px-0.5 pb-0.5">
              {search ? (
                <CommandGroup
                  heading="Resultados"
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {dashboardSearchQuery.isLoading || dashboardSearchQuery.isFetching ? (
                    <CommandItem
                      disabled
                      value={`buscando ${search}`}
                      className="h-10 cursor-default rounded-[14px] px-2.5 text-sm text-muted-foreground"
                    >
                      Buscando...
                    </CommandItem>
                  ) : searchErrorMessage ? (
                    <CommandItem
                      disabled
                      value={`error resultados ${search}`}
                      className="min-h-10 cursor-default rounded-[14px] px-2.5 py-2 text-sm text-destructive"
                    >
                      {searchErrorMessage}
                    </CommandItem>
                  ) : dynamicResults.length ? (
                    dynamicResults.map((item) => (
                      <DashboardSearchResultItem
                        item={item}
                        key={`${item.type}-${item.id}`}
                        query={search}
                        onSelect={() => runCommand(item.href)}
                      />
                    ))
                  ) : (
                    <CommandItem
                      disabled
                      value={`sin resultados ${search}`}
                      className="h-10 cursor-default rounded-[14px] px-2.5 text-sm text-muted-foreground"
                    >
                      Sin resultados del estudio.
                    </CommandItem>
                  )}
                  {searchErrorMessage ? null : (
                    <DashboardSearchPagination
                      disabled={dashboardSearchQuery.isFetching}
                      hasNextPage={Boolean(pageInfo?.hasNextPage && pageInfo.nextCursor)}
                      pageIndex={pageIndex}
                      onNext={goToNextResultsPage}
                      onPrevious={goToPreviousResultsPage}
                    />
                  )}
                </CommandGroup>
              ) : null}

              {visibleCommandSections.map((section) => (
                <CommandGroup
                  key={section.title}
                  heading={section.title}
                  className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {section.items.map((item) => (
                    <CommandPaletteItem
                      key={item.label}
                      item={item}
                      onSelect={() => runCommand(item.href)}
                    />
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function filterCommandSections(sections: AdminCommandSection[], query: string) {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const value = `${item.label} ${item.href}`.toLocaleLowerCase();

        return terms.every((term) => value.includes(term));
      })
    }))
    .filter((section) => section.items.length > 0);
}

function getErrorMessage(error: unknown) {
  if (!error) {
    return null;
  }

  return error instanceof Error ? error.message : "No se pudo completar la busqueda del estudio.";
}

function DashboardSearchPagination({
  disabled,
  hasNextPage,
  onNext,
  onPrevious,
  pageIndex
}: {
  disabled: boolean;
  hasNextPage: boolean;
  onNext: () => void;
  onPrevious: () => void;
  pageIndex: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2.5 py-2">
      <span className="text-xs text-muted-foreground">Pagina {pageIndex + 1}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-xl border-border/50 px-2.5 text-xs"
          disabled={disabled || pageIndex === 0}
          onClick={onPrevious}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-xl border-border/50 px-2.5 text-xs"
          disabled={disabled || !hasNextPage}
          onClick={onNext}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function DashboardSearchResultItem({
  item,
  onSelect,
  query
}: {
  item: DashboardSearchItemDto;
  onSelect: () => void;
  query: string;
}) {
  const Icon = getDashboardSearchIcon(item);
  const title = getDashboardSearchTitle(item);
  const metadata = getDashboardSearchMetadata(item);
  const secondaryText = getDashboardSearchSecondaryText(item);
  const descriptionText = getDashboardSearchDescriptionText(item);

  return (
    <CommandItem
      value={getDashboardSearchResultValue(item)}
      onSelect={onSelect}
      className="min-h-16 cursor-pointer items-start rounded-[14px] px-2.5 py-2 text-left text-foreground transition-colors data-[selected=true]:bg-secondary/70 data-[selected=true]:text-foreground"
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-foreground" aria-hidden="true" />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-medium leading-5">
          <SearchHighlight query={query} text={title} />
        </span>
        {secondaryText ? (
          <span className="truncate text-xs leading-5 text-muted-foreground">
            <SearchHighlight query={query} text={secondaryText} />
          </span>
        ) : null}
        {descriptionText ? (
          <span className="truncate text-xs leading-5 text-muted-foreground">
            <SearchHighlight query={query} text={descriptionText} />
          </span>
        ) : null}
      </span>
      <span className="ml-auto shrink-0 rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 font-sans text-xs text-muted-foreground">
        {metadata}
      </span>
    </CommandItem>
  );
}

function getDashboardSearchResultValue(item: DashboardSearchItemDto) {
  const movementTypeSearchText = getMovementTypeSearchText(item.movementType);

  return [
    item.type,
    item.id,
    item.href,
    getDashboardSearchTitle(item),
    item.description,
    item.caseNumber,
    item.caseCaption,
    item.fileName,
    item.fileType,
    item.movementName,
    movementTypeSearchText
  ]
    .filter(Boolean)
    .join(" ");
}

function getDashboardSearchTitle(item: DashboardSearchItemDto) {
  if (item.type === "cashbox_movement" && item.movementType && item.title === item.movementType) {
    return getMovementTypeLabel(item.movementType);
  }

  return item.title;
}

function getDashboardSearchIcon(item: DashboardSearchItemDto) {
  if (item.type === "case") {
    return BriefcaseBusiness;
  }

  if (item.type === "document") {
    return FileText;
  }

  if (item.type === "task_due") {
    return ListTodo;
  }

  if (item.type === "hearing") {
    return CalendarClock;
  }

  return Banknote;
}

function getDashboardSearchSecondaryText(item: DashboardSearchItemDto) {
  if (item.type === "document") {
    return item.caseNumber && item.caseCaption
      ? `${item.caseNumber} · ${item.caseCaption}`
      : "Biblioteca";
  }

  if (item.type === "cashbox_movement") {
    return `${getMovementTypeLabel(item.movementType)} · ${item.currencyCode ?? ""} ${
      item.amount !== undefined ? formatAmount(item.amount) : ""
    }`.trim();
  }

  if (item.caseNumber && item.caseCaption) {
    return `${item.caseNumber} · ${item.caseCaption}`;
  }

  return null;
}

function getDashboardSearchDescriptionText(item: DashboardSearchItemDto) {
  if (item.type === "document") {
    return [
      item.fileType,
      item.fileSizeBytes !== undefined ? formatFileSize(item.fileSizeBytes) : null
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (item.type === "cashbox_movement") {
    return item.description ?? null;
  }

  return item.description ?? null;
}

function getDashboardSearchMetadata(item: DashboardSearchItemDto) {
  const date = formatDashboardSearchDate(item.date);

  if (item.type === "document" && item.fileSizeBytes !== undefined) {
    return formatFileSize(item.fileSizeBytes);
  }

  if (item.type === "cashbox_movement" && item.amount !== undefined) {
    return `${date} · ${item.currencyCode ?? ""} ${formatAmount(item.amount)}`.trim();
  }

  if (item.type === "payment_due" && item.amount !== undefined) {
    return `${date} · ${item.currencyCode ?? ""} ${formatAmount(item.amount)}`.trim();
  }

  if (item.type === "hearing" && item.time) {
    return `${date} · ${item.time}`;
  }

  return item.status ? `${date} · ${item.status}` : date;
}

function getMovementTypeLabel(type: DashboardSearchItemDto["movementType"]) {
  if (type === "income" || type === "conversion_in") {
    return "Ingreso";
  }

  if (type === "expense" || type === "conversion_out") {
    return "Egreso";
  }

  return "Movimiento";
}

function getMovementTypeSearchText(type: DashboardSearchItemDto["movementType"]) {
  if (type === "income") {
    return "Ingreso Ingresos";
  }

  if (type === "expense") {
    return "Egreso Egresos";
  }

  if (type === "conversion_in") {
    return "Conversion entrada Ingresos";
  }

  if (type === "conversion_out") {
    return "Conversion salida Egresos";
  }

  return null;
}

function formatDashboardSearchDate(date: string) {
  const [year, month, day] = date.split("-");

  return year && month && day ? `${day}/${month}/${year}` : date;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(amount);
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CommandPaletteItem({ item, onSelect }: { item: AdminCommandItem; onSelect: () => void }) {
  const Icon = item.icon;

  return (
    <CommandItem
      value={`${item.label} ${item.href}`}
      onSelect={onSelect}
      className={cn(
        "h-10 cursor-pointer rounded-[14px] px-2.5 text-base leading-none text-foreground transition-colors data-[selected=true]:bg-secondary/70 data-[selected=true]:text-foreground",
        item.shortcut ? "pr-3" : ""
      )}
    >
      {Icon ? <Icon className="h-[18px] w-[18px] text-foreground" aria-hidden="true" /> : null}
      <span className="truncate">{item.label}</span>
      {item.shortcut ? (
        <CommandShortcut className="ml-auto rounded-lg border border-border/60 bg-secondary/60 px-2 py-1 font-sans text-xs tracking-normal text-muted-foreground">
          Shift+{item.shortcut}
        </CommandShortcut>
      ) : null}
    </CommandItem>
  );
}
