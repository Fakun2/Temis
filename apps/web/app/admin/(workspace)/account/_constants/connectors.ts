import type { ConnectorDefinition } from "../_types/connectors.types";

export const connectors: ConnectorDefinition[] = [
  {
    id: "notion",
    name: "Notion",
    description: "Importa y sincroniza tableros de tareas.",
    category: "productivity",
    implemented: true,
    view: "notion"
  },
  {
    id: "jira",
    name: "Jira",
    description: "Sincronizacion futura de issues y proyectos.",
    category: "productivity",
    implemented: false,
    view: "jira"
  },
  {
    id: "trello",
    name: "Trello",
    description: "Importacion futura de tableros kanban.",
    category: "productivity",
    implemented: false,
    view: "trello"
  },
  {
    id: "miro",
    name: "Miro",
    description: "Colaboracion visual y tableros compartidos.",
    category: "productivity",
    implemented: false,
    view: "miro"
  },
  {
    id: "calendar",
    name: "Calendario",
    description: "Eventos y vencimientos del estudio.",
    category: "calendar",
    implemented: false,
    view: "calendar"
  },
  {
    id: "email",
    name: "Email",
    description: "Bandejas y comunicaciones del estudio.",
    category: "email",
    implemented: false,
    view: "email"
  },
  {
    id: "teams",
    name: "Teams",
    description: "Mensajes y reuniones de Microsoft Teams.",
    category: "productivity",
    implemented: false,
    view: "teams"
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Audiencias y tareas asignadas.",
    category: "calendar",
    implemented: true,
    view: "google-calendar"
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Documentos y carpetas compartidas.",
    category: "documents",
    implemented: false,
    view: "google-drive"
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Correos vinculados a clientes y expedientes.",
    category: "email",
    implemented: false,
    view: "gmail"
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Correo y calendario de Microsoft 365.",
    category: "email",
    implemented: false,
    view: "outlook"
  }
];

export const connectorViews = new Set(connectors.map((connector) => connector.view));
