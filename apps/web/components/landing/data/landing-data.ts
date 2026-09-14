import type { BentoStat, FAQItem, LandingLogo, PricingPlan, Testimonial } from "../types/landing-types";

export const logos = [
  "Moreira",
  "Norte",
  "Vera",
  "Salvatierra",
  "Ibarra",
  "Figueroa",
  "Ledesma",
  "RyG Legal",
  "Casares",
  "Paz Romero"
] as const satisfies readonly LandingLogo[];

export const bentoStats = [
  { stat: "75k+", label: "expedientes testeados", sub: "Paginacion y filtros" },
  { stat: "RBAC", label: "permisos por rol", sub: "Tenant y membresias" },
  { stat: "24h", label: "control de vencidos", sub: "Scheduler diario" }
] as const satisfies readonly BentoStat[];

export const pricing = [
  {
    name: "Piloto",
    price: "MVP",
    period: "privado",
    blurb: "Para validar un estudio real con clientes, expedientes y calendario.",
    cta: "Crear cuenta",
    href: "/create-account",
    features: ["Tenant Moreira", "Catalogos legales", "Roles base", "Deploy en VPS"],
    popular: false
  },
  {
    name: "Estudio",
    price: "SaaS",
    period: "operativo",
    blurb: "Para equipos que necesitan ordenar casos, responsables y vencimientos.",
    cta: "Iniciar sesion",
    href: "/login",
    features: [
      "Expedientes ilimitados",
      "Calendario juridico",
      "Gastos y pagos",
      "Staff con permisos",
      "Backups y monitoreo"
    ],
    popular: true
  },
  {
    name: "Privado",
    price: "Custom",
    period: "",
    blurb: "Para despliegues dedicados con infraestructura propia o storage externo.",
    cta: "Ver plataforma",
    href: "/login",
    features: ["VPS propia", "PostgreSQL", "MinIO/S3", "Nginx + TLS", "Aislamiento tenant"],
    popular: false
  }
] as const satisfies readonly PricingPlan[];

export const faqs = [
  {
    q: "¿Temis esta pensado para un estudio juridico chico?",
    a: "Si. El flujo inicial prioriza clientes, expedientes, tareas, audiencias, gastos y responsables, sin exigir una configuracion pesada."
  },
  {
    q: "¿Como se evita mezclar informacion entre estudios?",
    a: "La arquitectura es multi-Estudio: cada operacion se resuelve con estudio activo, usuarios y permisos del usuario."
  },
  {
    q: "¿Que pasa con audiencias y vencimientos?",
    a: "El calendario muestra tareas, gastos y audiencias por expediente; el scheduler diario mantiene vencimientos financieros bajo control."
  },
  {
    q: "¿Se puede sumar documentacion y auditoria?",
    a: "Si. Documentos, auditoria y storage S3/MinIO quedan dentro de la ruta natural de crecimiento del producto."
  }
] as const satisfies readonly FAQItem[];

export const testimonials = [
  {
    quote:
      "Temis nos dio una forma clara de ver expedientes, audiencias y gastos sin perseguir planillas.",
    name: "Estudio Moreira",
    title: "Piloto juridico",
    initials: "EM",
    avatarBg: "bg-secondary"
  },
  {
    quote:
      "La separacion por roles hace que el staff vea lo que necesita, sin abrir informacion sensible de mas.",
    name: "RyG Legal",
    title: "Piloto juridico",
    initials: "RG",
    avatarBg: "bg-muted"
  },
  {
    quote:
      "La paginacion y filtros grandes dejaron de sentirse pesados incluso con volumen alto de expedientes.",
    name: "Operacion legal",
    title: "Pruebas de carga",
    initials: "OL",
    avatarBg: "bg-accent"
  }
] as const satisfies readonly Testimonial[];
