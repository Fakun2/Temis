import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StatusAction = {
  href: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
};

interface NotFoundProps {
  code?: string;
  title?: string;
  description?: string;
  eyebrow?: string;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction | null;
  showSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
}

export function Illustration({
  className,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 362 145"
      className={cn("text-foreground", className)}
      aria-hidden="true"
      {...props}
    >
      <path
        fill="currentColor"
        d="M62.6 142c-2.133 0-3.2-1.067-3.2-3.2V118h-56c-2 0-3-1-3-3V92.8c0-1.333.4-2.733 1.2-4.2L58.2 4c.8-1.333 2.067-2 3.8-2h28c2 0 3 1 3 3v85.4h11.2c.933 0 1.733.333 2.4 1 .667.533 1 1.267 1 2.2v21.2c0 .933-.333 1.733-1 2.4-.667.533-1.467.8-2.4.8H93v20.8c0 2.133-1.067 3.2-3.2 3.2H62.6zM33 90.4h26.4V51.2L33 90.4zM181.67 144.6c-7.333 0-14.333-1.333-21-4-6.666-2.667-12.866-6.733-18.6-12.2-5.733-5.467-10.266-13-13.6-22.6-3.333-9.6-5-20.667-5-33.2 0-12.533 1.667-23.6 5-33.2 3.334-9.6 7.867-17.133 13.6-22.6 5.734-5.467 11.934-9.533 18.6-12.2 6.667-2.8 13.667-4.2 21-4.2 7.467 0 14.534 1.4 21.2 4.2 6.667 2.667 12.8 6.733 18.4 12.2 5.734 5.467 10.267 13 13.6 22.6 3.334 9.6 5 20.667 5 33.2 0 12.533-1.666 23.6-5 33.2-3.333 9.6-7.866 17.133-13.6 22.6-5.6 5.467-11.733 9.533-18.4 12.2-6.666 2.667-13.733 4-21.2 4zm0-31c9.067 0 15.6-3.733 19.6-11.2 4.134-7.6 6.2-17.533 6.2-29.8s-2.066-22.2-6.2-29.8c-4.133-7.6-10.666-11.4-19.6-11.4-8.933 0-15.466 3.8-19.6 11.4-4 7.6-6 17.533-6 29.8s2 22.2 6 29.8c4.134 7.467 10.667 11.2 19.6 11.2zM316.116 142c-2.134 0-3.2-1.067-3.2-3.2V118h-56c-2 0-3-1-3-3V92.8c0-1.333.4-2.733 1.2-4.2l56.6-84.6c.8-1.333 2.066-2 3.8-2h28c2 0 3 1 3 3v85.4h11.2c.933 0 1.733.333 2.4 1 .666.533 1 1.267 1 2.2v21.2c0 .933-.334 1.733-1 2.4-.667.533-1.467.8-2.4.8h-11.2v20.8c0 2.133-1.067 3.2-3.2 3.2h-27.2zm-29.6-51.6h26.4V51.2l-26.4 39.2z"
      />
    </svg>
  );
}

export function NotFound({
  code = "404",
  title = "Pagina no encontrada",
  description = "La vista que intentas abrir no existe o fue movida.",
  eyebrow,
  primaryAction = { href: "/admin", label: "Ir al panel", icon: Home },
  secondaryAction = { href: "/", label: "Volver al inicio", icon: ArrowLeft },
  className
}: NotFoundProps) {
  const isPromptIllustration = code === "404";

  return (
    <div
      className={cn(
        "relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-background px-4 py-10 text-center text-foreground sm:px-6 md:px-10",
        className
      )}
    >
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center">
        {isPromptIllustration ? (
          <Illustration className="absolute inset-x-0 top-1/2 h-[34svh] min-h-44 w-full -translate-y-[62%] opacity-[0.04] dark:opacity-[0.035]" />
        ) : (
          <p
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-[62%] select-none text-[clamp(9rem,32vw,22rem)] font-black leading-none text-foreground opacity-[0.035] dark:opacity-[0.045]"
            aria-hidden="true"
          >
            {code}
          </p>
        )}

        {eyebrow ? (
          <p className="relative z-[1] text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="relative z-[1] mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-normal text-primary sm:text-6xl md:text-7xl">
          {title}
        </h1>
        <p className="relative z-[1] mt-5 max-w-2xl text-pretty text-base font-medium leading-7 text-muted-foreground sm:text-lg">
          {description}
        </p>

        <div className="relative z-[1] mt-9 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          <StatusButton action={secondaryAction} variant="secondary" />
          <StatusButton action={primaryAction} />
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedState({
  title = "Area restringida",
  description = "No tienes permisos para acceder a esta vista.",
  primaryAction = { href: "/admin", label: "Ir al panel", icon: Home },
  secondaryAction,
  className
}: Pick<
  NotFoundProps,
  "title" | "description" | "primaryAction" | "secondaryAction" | "className"
>) {
  return (
    <NotFound
      code="403"
      eyebrow="Acceso denegado"
      title={title}
      description={description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      className={cn(
        "min-h-[calc(100svh-4rem)] rounded-none bg-transparent py-0 md:min-h-[calc(100svh-5rem)]",
        className
      )}
    />
  );
}

function StatusButton({
  action,
  variant = "default"
}: {
  action?: StatusAction | null;
  variant?: "default" | "secondary" | "outline";
}) {
  if (!action) {
    return null;
  }

  const Icon = action.icon;

  return (
    <Button asChild variant={variant} className="w-full sm:w-auto">
      <Link href={action.href}>
        {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
        {action.label}
      </Link>
    </Button>
  );
}
