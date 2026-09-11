import Link from "next/link";
import { Scale } from "lucide-react";
import { ThemeModeSelect } from "@/components/theme/theme-mode-select";

export function Navbar() {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-6">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Scale className="h-4 w-4" />
        </span>
        Temis
      </Link>

      <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
        <a className="transition-colors hover:text-foreground" href="#platform">
          Plataforma
        </a>
        <a className="transition-colors hover:text-foreground" href="#pricing">
          Planes
        </a>
        <a className="transition-colors hover:text-foreground" href="#faq">
          FAQ
        </a>
      </div>

      <div className="flex items-center gap-2">
        <ThemeModeSelect />
        <Link
          href="/login"
          className="hidden rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:inline-flex"
        >
          Ingresar
        </Link>
      </div>
    </nav>
  );
}
