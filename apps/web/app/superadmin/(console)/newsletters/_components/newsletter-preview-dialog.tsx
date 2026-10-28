"use client";
import { Laptop, Moon, Smartphone, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { NewsletterContentView } from "@/components/newsletter/newsletter-content-v2";
import type { Draft } from "../_lib/newsletter-builder-model";

export function PreviewDialog({
  open,
  onOpenChange,
  draft,
  device,
  setDevice,
  dark,
  setDark
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: Draft;
  device: "desktop" | "mobile";
  setDevice: (device: "desktop" | "mobile") => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[95vh] max-w-[min(1100px,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="border-b border-border/35 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <DialogTitle>Preview de Newsletter</DialogTitle>
              <DialogDescription>Usa el mismo renderer que verá Admin.</DialogDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                size="icon-sm"
                variant={device === "desktop" ? "default" : "outline"}
                aria-label="Vista desktop"
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Laptop className="size-4 stroke-[1.5]" />
              </Button>
              <Button
                size="icon-sm"
                variant={device === "mobile" ? "default" : "outline"}
                aria-label="Vista móvil"
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="size-4 stroke-[1.5]" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={dark ? "Tema claro" : "Tema oscuro"}
                onClick={() => setDark(!dark)}
              >
                {dark ? (
                  <Sun className="size-4 stroke-[1.5]" />
                ) : (
                  <Moon className="size-4 stroke-[1.5]" />
                )}
              </Button>
              <DialogClose asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Cerrar vista previa"
                  className="ml-1 text-muted-foreground"
                >
                  <X className="size-4 stroke-[1.5]" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogHeader>
        <div
          className={`${dark ? "dark bg-[#151618]" : "bg-[#f7f9fb]"} max-h-[calc(95vh-76px)] overflow-auto p-4 sm:p-8`}
        >
          <div
            className={`mx-auto rounded-2xl bg-background p-4 shadow-xl transition-all ${device === "mobile" ? "max-w-[390px]" : "max-w-[960px]"}`}
            style={{ backgroundColor: dark ? "#1d1f22" : "#ffffff" }}
          >
            <NewsletterPreview
              draft={draft}
              assetPrefix="/api/superadmin/newsletters/assets"
              appearance={dark ? "dark" : "light"}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function NewsletterPreview({
  draft,
  assetPrefix,
  appearance
}: {
  draft: Draft;
  assetPrefix: string;
  appearance?: "light" | "dark";
}) {
  return (
    <article>
      <NewsletterContentView
        content={draft.content}
        assetPrefix={assetPrefix}
        title={draft.title || "Título de la newsletter"}
        excerpt={draft.excerpt}
        appearance={appearance}
      />
    </article>
  );
}
