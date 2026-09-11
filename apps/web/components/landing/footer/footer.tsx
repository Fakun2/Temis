import Link from "next/link";
import { Scale } from "lucide-react";
import { LandingContainer } from "../ui/landing-section";

const footerColumns = [
  { title: "Producto", links: ["Plataforma", "Expedientes", "Calendario", "Finanzas"] },
  { title: "Empresa", links: ["Sobre Nosotros", "Equipo", "Contacto"] },
  { title: "Legal", links: ["Privacidad", "Terminos y Condiciones"] },
] as const;

export function Footer() {
  return (
    <footer className="bg-card py-4">
      <LandingContainer className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Scale className="h-4 w-4" />
            </span>
            Temis
          </Link>
          <p className="mt-4 max-w-sm text-sm font-light leading-6 text-muted-foreground">
            Plataforma juridica para estudios que necesitan expedientes, equipo y vencimientos bajo
            control.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-thin">{col.title}</h4>
              <div className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <a key={link} href="#" className="block text-sm text-muted-foreground">
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </LandingContainer>

      <LandingContainer className="mt-12 pb-2 flex flex-col gap-3 pt-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <p className="font-thin">(c) {new Date().getFullYear()} Temis. Todos los derechos reservados.</p>
        <p className="font-thin">Construido en Argentina - Tucuman</p>
      </LandingContainer>
    </footer>
  );
}
