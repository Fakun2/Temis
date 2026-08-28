"use client";

import { useState } from "react";
import { Plus, UserRoundPlus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { AdminTableHeaderActionButton } from "../../_components/admin-table-header-action-button";

export function ClientSheetPlaceholder({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <AdminTableHeaderActionButton
          className={compact ? "mt-4" : undefined}
          icon={Plus}
          label="Nuevo cliente"
          tone="primary"
        />
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="border-b border-border/40 px-5 py-5">
          <SheetTitle>Nuevo cliente</SheetTitle>
          <SheetDescription>Alta de una persona o empresa vinculada al estudio.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="grid max-w-xs justify-items-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-md bg-secondary text-muted-foreground">
              <UserRoundPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm font-medium text-foreground">Formulario en preparación</p>
            <p className="text-sm leading-6 text-muted-foreground">
              La carga de clientes se incorporará en la próxima etapa.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
