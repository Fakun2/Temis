export const publicComponentOrder = [
  "Aplicación web",
  "API",
  "Inicio de sesión",
  "Documentos",
  "Notificaciones e integraciones"
] as const;

export type PublicStatus =
  | "operational"
  | "degraded"
  | "partial_outage"
  | "major_outage"
  | "maintenance"
  | "unknown";

export type IncidentStage = "investigating" | "identified" | "monitoring" | "resolved";

export type StatusDay = {
  date: string;
  status: PublicStatus;
  uptimePercent: number | null;
};

export type StatusComponent = {
  id: string;
  name: string;
  status: PublicStatus;
  uptimePercent: number | null;
  days: StatusDay[];
};

export type IncidentUpdate = {
  id: string;
  message: string;
  publishedAt: string;
  status: IncidentStage;
};

export type StatusIncident = {
  componentIds: string[];
  componentNames: string[];
  id: string;
  impact: PublicStatus;
  resolvedAt: string | null;
  startedAt: string;
  status: IncidentStage;
  title: string;
  updatedAt: string;
  updates: IncidentUpdate[];
};

export type StatusMaintenance = {
  componentNames: string[];
  endsAt: string;
  id: string;
  message: string;
  startsAt: string;
  title: string;
};

export type StatusSnapshot = {
  components: StatusComponent[];
  generatedAt: string;
  incidents: StatusIncident[];
  maintenances: StatusMaintenance[];
  overallStatus: PublicStatus;
};
