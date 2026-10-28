import type { ComponentPropsWithoutRef } from "react";
import { Scale } from "lucide-react";

const footerColumns = [
  {
    title: "Producto",
    links: [
      { href: "/#plataforma", label: "Plataforma" },
      { href: "/#expedientes", label: "Expedientes" },
      { href: "/#calendario", label: "Calendario" },
      { href: "/#finanzas", label: "Finanzas" }
    ]
  },
  {
    title: "Empresa",
    links: [
      { href: "/#nosotros", label: "Sobre nosotros" },
      { href: "/#equipo", label: "Equipo" },
      { href: "/#contacto", label: "Contacto" }
    ]
  },
  {
    title: "Recursos",
    links: [{ href: "https://status.temis.ar", label: "Estado del servicio" }]
  },
  {
    title: "Legal",
    links: [
      { href: "/privacidad", label: "Privacidad" },
      { href: "/terminos", label: "Términos y condiciones" }
    ]
  }
] as const;

export function BrandContainer({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={joinClassNames(
        "container mx-auto max-w-7xl px-5 sm:px-12 md:px-16 lg:px-20",
        className
      )}
      {...props}
    />
  );
}

export function TemisFooter({ mainSiteUrl = "https://temis.ar" }: { mainSiteUrl?: string }) {
  return (
    <footer className="border-t border-border/70 bg-card py-8 text-card-foreground">
      <BrandContainer className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <a href={mainSiteUrl} className="inline-flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" aria-hidden="true" />
            </span>
            Temis
          </a>
          <p className="mt-4 max-w-sm text-sm font-light leading-6 text-muted-foreground">
            Plataforma jurídica para estudios que necesitan expedientes, equipo y vencimientos bajo
            control.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-medium">{column.title}</h2>
              <div className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <a
                    key={link.label}
                    href={toAbsoluteUrl(mainSiteUrl, link.href)}
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </BrandContainer>

      <BrandContainer className="mt-12 flex flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="font-light">
          © {new Date().getFullYear()} Temis. Todos los derechos reservados.
        </p>
        <p className="font-light">Construido en Argentina · Tucumán</p>
      </BrandContainer>
    </footer>
  );
}

function toAbsoluteUrl(mainSiteUrl: string, href: string) {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return new URL(href, mainSiteUrl).toString();
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}
