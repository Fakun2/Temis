import { forwardRef, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dashboardPrimaryActionButtonClassName as adminPrimaryActionButtonClassName } from "./styles";

type AdminTableHeaderActionButtonProps = Omit<ButtonProps, "children"> & {
  children?: ReactNode;
  icon: LucideIcon;
  label: string;
  tone?: "primary" | "secondary";
};

export const AdminTableHeaderActionButton = forwardRef<
  HTMLButtonElement,
  AdminTableHeaderActionButtonProps
>(
  (
    { children, className, icon: Icon, label, tone = "secondary", type = "button", variant, ...props },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        type={type}
        variant={tone === "secondary" ? variant ?? "outline" : variant}
        className={cn(
          "h-8 w-8 gap-1.5 border-border/40 p-0 text-sm font-semibold shadow-[0_10px_24px_-22px_rgba(15,23,42,0.35)] sm:h-9 sm:w-auto sm:px-2.5",
          tone === "secondary" && "bg-card text-foreground",
          tone === "primary" && adminPrimaryActionButtonClassName,
          className
        )}
        {...props}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{label}</span>
        {children}
      </Button>
    );
  }
);

AdminTableHeaderActionButton.displayName = "AdminTableHeaderActionButton";
