import type { ConnectorId, ConnectorLogoProps } from "../../_types/connectors.types";
import { useTheme } from "@/lib/theme/theme-provider";

export function ConnectorLogo({
  connectorId,
  className = "size-11"
}: ConnectorLogoProps & { connectorId: ConnectorId }) {
  const { colorMode, variant } = useTheme();
  const useWhiteLogo = colorMode !== "navy-slate" || variant !== "light";

  return (
    <img
      src={useWhiteLogo ? connectorWhiteLogoSrc[connectorId] ?? connectorLogoSrc[connectorId] : connectorLogoSrc[connectorId]}
      alt=""
      className={`${className} object-contain`}
      aria-hidden="true"
      draggable={false}
    />
  );
}

const connectorLogoSrc: Record<ConnectorId, string> = {
  calendar: "/conectors/calendar-logo.svg",
  email: "/conectors/email-logo.svg",
  gmail: "/conectors/gmail-logo.svg",
  "google-calendar": "/conectors/google-calendar-logo.svg",
  "google-drive": "/conectors/google-drive-logo.svg",
  jira: "/conectors/jira-logo.svg",
  notion: "/conectors/notion-logo.svg",
  outlook: "/conectors/outlook-logo.svg",
  miro: "/conectors/miro-logo.svg",
  teams: "/conectors/teams-logo.svg",
  trello: "/conectors/trello-logo.svg"
};

const connectorWhiteLogoSrc: Partial<Record<ConnectorId, string>> = {
  calendar: "/conectors/calendar-logo-white.svg",
  email: "/conectors/email-logo-white.svg",
  notion: "/conectors/notion-white-logo.svg"
};
