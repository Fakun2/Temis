import type { Metadata } from "next";
import { TemisFooter } from "@temis/brand-ui";
import { StatusHeader } from "@/components/status-header";
import "./globals.css";

const statusSiteUrl = process.env.NEXT_PUBLIC_STATUS_SITE_URL ?? "https://status.temis.ar";
const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_APP_URL ?? "https://temis.ar";

export const metadata: Metadata = {
  title: { default: "Estado del servicio | Temis", template: "%s | Estado de Temis" },
  applicationName: "Estado de Temis",
  metadataBase: new URL(statusSiteUrl),
  description: "Disponibilidad, incidentes y mantenimientos de los servicios de Temis.",
  alternates: { canonical: "/" },
  robots: { follow: true, index: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <div className="flex min-h-screen flex-col">
          <StatusHeader mainSiteUrl={mainSiteUrl} />
          <main className="flex-1">{children}</main>
          <TemisFooter mainSiteUrl={mainSiteUrl} />
        </div>
      </body>
    </html>
  );
}
