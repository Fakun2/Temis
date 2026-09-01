export type CourtImportSystem = {
  enabled: boolean;
  id: string;
  jurisdiction: string;
  logoUrl?: string;
  name: string;
};

export const courtImportSystems = [
  {
    enabled: true,
    id: "sae-tucuman",
    jurisdiction: "Tucuman",
    logoUrl: "https://login.justucuman.gov.ar/img/logo_new/logo-144.png",
    name: "SAE Tucuman"
  },
  { enabled: false, id: "pjn", jurisdiction: "Nacional", name: "PJN" },
  { enabled: false, id: "mev-buenos-aires", jurisdiction: "Buenos Aires", name: "MEV / Augusta" },
  { enabled: false, id: "eje-caba", jurisdiction: "CABA", name: "EJE" },
  { enabled: false, id: "sac-cordoba", jurisdiction: "Cordoba", name: "SAC Cordoba" },
  { enabled: false, id: "iol-mendoza", jurisdiction: "Mendoza", name: "IOL Mendoza" },
  { enabled: false, id: "puma-rio-negro", jurisdiction: "Rio Negro", name: "PUMA" },
  { enabled: false, id: "sisfe-santa-fe", jurisdiction: "Santa Fe", name: "SISFE" },
  { enabled: false, id: "sed-salta", jurisdiction: "Salta", name: "SED" },
  { enabled: false, id: "lex100-entre-rios", jurisdiction: "Entre Rios", name: "LEX100" },
  { enabled: false, id: "sigj-jujuy", jurisdiction: "Jujuy", name: "SIGJ" },
  { enabled: false, id: "siged-misiones", jurisdiction: "Misiones", name: "SIGED" },
  { enabled: false, id: "iure-chaco", jurisdiction: "Chaco", name: "Iure" },
  { enabled: false, id: "serconex-chubut", jurisdiction: "Chubut", name: "SERCONEX" },
  {
    enabled: false,
    id: "kayen-tierra-del-fuego",
    jurisdiction: "Tierra del Fuego",
    name: "Kayen / geN"
  },
  { enabled: false, id: "siped-santa-cruz", jurisdiction: "Santa Cruz", name: "SiPed" },
  { enabled: false, id: "sae-san-juan", jurisdiction: "San Juan", name: "SAE San Juan" },
  {
    enabled: false,
    id: "expediente-digital-neuquen",
    jurisdiction: "Neuquen",
    name: "Expediente Digital"
  },
  { enabled: false, id: "iurix-san-luis", jurisdiction: "San Luis", name: "IURIX" },
  {
    enabled: false,
    id: "sistemas-provinciales",
    jurisdiction: "Catamarca / Corrientes / Formosa",
    name: "IURIX / IOL / e-Justicia"
  }
] as const satisfies readonly CourtImportSystem[];

export type ImportStage = "idle" | "searching" | "preview" | "importing" | "done" | "error";

export const courtImportProgressByStage: Record<ImportStage, number> = {
  done: 100,
  error: 0,
  idle: 0,
  importing: 82,
  preview: 64,
  searching: 36
};

export const courtImportStatusLabels = {
  closed: "Cerrado",
  open: "Abierto",
  paused: "Paralizado"
} as const;

export const courtImportActionLabels = {
  create: "Crear",
  update: "Actualizar"
} as const;
