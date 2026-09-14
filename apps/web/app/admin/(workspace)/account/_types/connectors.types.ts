export type ConnectorId =
  | "notion"
  | "jira"
  | "trello"
  | "calendar"
  | "email"
  | "teams"
  | "google-calendar"
  | "google-drive"
  | "gmail"
  | "outlook"
  | "miro";

export type ConnectorCategory = "productivity" | "calendar" | "email" | "documents";

export type ConnectorStatus = "available" | "connected" | "coming_soon";

export type ConnectorDefinition = {
  id: ConnectorId;
  name: string;
  description: string;
  category: ConnectorCategory;
  implemented: boolean;
  view: string;
};

export type ConnectorLogoProps = {
  className?: string;
};
