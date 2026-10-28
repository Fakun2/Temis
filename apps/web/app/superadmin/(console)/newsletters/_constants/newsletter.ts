import type { NewsletterBlockV2 } from "@/components/newsletter/newsletter-types";
import type { Draft } from "../_types/newsletter";

export const endpoint = "/superadmin/newsletters";
export const blockLabels: Record<NewsletterBlockV2["type"], string> = {
  richText: "Texto enriquecido",
  image: "Imagen",
  gif: "GIF",
  callout: "Destacado",
  metrics: "Métricas",
  chart: "Gráfico",
  video: "Video",
  drawing: "Dibujo libre",
  cta: "Botón",
  separator: "Separador"
};
export const categories: Record<Draft["newsletterCategory"], string> = {
  release: "Nueva versión",
  bugfix: "Correcciones",
  policy: "Políticas",
  performance: "Rendimiento",
  general: "General"
};
