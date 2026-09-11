import type { Metadata } from "next";
import { cookies } from "next/headers";
import { QueryProvider } from "@/lib/query/query-provider";
import { ThemeProvider, type ThemeVariant } from "@/lib/theme/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Temis",
  applicationName: "Temis",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://temis.ar"),
  description: "Sistema de gestión integral para estudios jurídicos motorizado por IA"
};

const variantCookieName = "justinia-theme-variant";

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const initialVariant: ThemeVariant =
    cookieStore.get(variantCookieName)?.value === "dark" ? "dark" : "light";
  const htmlClassName = initialVariant === "dark" ? "theme-navy-slate dark" : "theme-navy-slate";

  return (
    <html lang="es" className={htmlClassName}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=overlays-content" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider initialVariant={initialVariant}>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
