"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Plus, ShieldPlus } from "lucide-react";
import type { PermissionDto, RoleDto } from "@temis/api-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { adminPrimaryActionButtonClassName } from "../../_constants/dashboard";
import { CreateRoleForm } from "./create-role-form";

export function CreateRoleSheet({
  permissions,
  role,
  trigger
}: {
  permissions: PermissionDto[];
  role?: RoleDto;
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const title = role ? "Editar rol" : "Crear rol";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button
            className={`h-10 px-3 font-semibold sm:px-4 ${adminPrimaryActionButtonClassName}`}
            aria-label="Crear rol"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Crear rol</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="h-svh max-h-svh w-full gap-0 overflow-hidden border-border/30 p-0 sm:max-w-2xl">
        <SheetHeader className="shrink-0 border-b border-border/30 px-6 py-5">
          <SheetTitle className="flex items-center gap-3 text-lg">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <ShieldPlus className="h-5 w-5" aria-hidden="true" />
            </span>
            {title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Define el alcance operativo del rol dentro del sistema.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <CreateRoleForm permissions={permissions} role={role} onSuccess={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
