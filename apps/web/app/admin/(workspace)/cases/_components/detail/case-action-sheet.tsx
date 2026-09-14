"use client";

import type { ComponentProps, FormEventHandler, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import { adminPrimaryActionButtonClassName } from "../../../_constants/dashboard";

type CaseActionSheetProps = {
  children: ReactNode;
  description: string;
  errorMessage?: string;
  icon: LucideIcon;
  isSubmitting: boolean;
  modal?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  open: boolean;
  presentation?: "sheet" | "dialog";
  submitDisabled?: boolean;
  title: string;
  trigger?: ReactNode;
  widthClassName?: string;
  contentProps?: Omit<ComponentProps<typeof SheetContent>, "children" | "className">;
};

export function CaseActionSheet({
  children,
  contentProps,
  description,
  errorMessage,
  icon: Icon,
  isSubmitting,
  modal,
  onOpenChange,
  onSubmit,
  open,
  presentation = "sheet",
  submitDisabled = false,
  title,
  trigger,
  widthClassName = "w-[560px] max-w-[94vw] sm:max-w-[560px]"
}: CaseActionSheetProps) {
  const header = (
    <SheetHeader>
      <SheetTitle className="flex items-center gap-3 text-lg">
        <span className="flex size-9 items-center justify-center rounded-xl bg-btn-primary text-btn-primary-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        {title}
      </SheetTitle>
      <SheetDescription className="sr-only">{description}</SheetDescription>
    </SheetHeader>
  );
  const form = (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 pb-1">
        {children}
        {errorMessage ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-border/30 p-4">
        <Button
          type="button"
          variant="outline"
          className="px-3 sm:px-4"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Cancelar</span>
        </Button>
        <Button
          type="submit"
          className={`px-3 sm:px-4 ${adminPrimaryActionButtonClassName}`}
          disabled={isSubmitting || submitDisabled}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Guardar</span>
        </Button>
      </div>
    </form>
  );

  if (presentation === "dialog") {
    return (
      <Dialog modal={modal} open={open} onOpenChange={onOpenChange}>
        {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
        <DialogContent
          className="flex max-h-[88svh] max-w-[min(620px,calc(100vw-2rem))] flex-col overflow-hidden border-border bg-card p-0"
          showCloseButton={false}
        >
          <DialogHeader className="px-4 pt-4">
            <DialogTitle className="flex items-center gap-3 text-lg">
              <span className="flex size-9 items-center justify-center rounded-xl bg-btn-primary text-btn-primary-foreground">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              {title}
            </DialogTitle>
            <DialogDescription className="sr-only">{description}</DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet modal={modal} open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        className={`${widthClassName} overflow-hidden border-border bg-card`}
        {...contentProps}
      >
        {header}
        {form}
      </SheetContent>
    </Sheet>
  );
}
