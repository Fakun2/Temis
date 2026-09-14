import { OAuth2Client } from "google-auth-library";

export type GoogleCalendarEventInput = {
  description: string;
  end: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties: { private: Record<string, string> };
  start: { date?: string; dateTime?: string; timeZone?: string };
  summary: string;
};

export class GoogleCalendarClient {
  private readonly clientId = required("GOOGLE_CALENDAR_CLIENT_ID");
  private readonly clientSecret = required("GOOGLE_CALENDAR_CLIENT_SECRET");

  async createCalendar(accessToken: string, summary: string, timeZone: string) {
    return this.request<{ id: string; summary?: string }>("https://www.googleapis.com/calendar/v3/calendars", accessToken, { body: { summary, timeZone }, method: "POST" });
  }
  async renameCalendar(accessToken: string, calendarId: string, summary: string) {
    return this.request<{ id: string; summary?: string }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, accessToken, { body: { summary }, method: "PATCH" });
  }
  async insertEvent(accessToken: string, calendarId: string, event: GoogleCalendarEventInput) {
    return this.request<{ id: string; etag?: string }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, accessToken, { body: event, method: "POST" });
  }
  async patchEvent(accessToken: string, calendarId: string, eventId: string, event: GoogleCalendarEventInput) {
    return this.request<{ id: string; etag?: string; status?: string }>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, accessToken, { body: event, method: "PATCH" });
  }
  async deleteEvent(accessToken: string, calendarId: string, eventId: string) {
    await this.request<null>(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, accessToken, { allowGone: true, allowNotFound: true, method: "DELETE" });
  }
  async refreshAccessToken(refreshToken: string) {
    const client = new OAuth2Client(this.clientId, this.clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    const response = await client.getAccessToken();
    if (!response.token) throw new GoogleCalendarAuthorizationError();
    return { accessToken: response.token, expiresAt: new Date(Date.now() + 55 * 60_000) };
  }
  private async request<T>(url: string, accessToken: string, options: { allowGone?: boolean; allowNotFound?: boolean; body?: unknown; method?: string } = {}) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, ...(options.body ? { "content-type": "application/json" } : {}) }, method: options.method ?? "GET", signal: AbortSignal.timeout(30_000), ...(options.body ? { body: JSON.stringify(options.body) } : {}) });
    if ((response.status === 404 && options.allowNotFound) || (response.status === 410 && options.allowGone)) return null as T;
    if (!response.ok) {
      await response.text();
      throw new GoogleCalendarProviderError(response.status);
    }
    if (response.status === 204) return null as T;
    return (await response.json()) as T;
  }
}

export class GoogleCalendarProviderError extends Error {
  constructor(readonly providerStatus: number) { super(`Google Calendar respondio ${providerStatus}.`); this.name = "GoogleCalendarProviderError"; }
}
export class GoogleCalendarAuthorizationError extends Error {
  constructor() { super("La conexion de Google Calendar requiere autorizacion."); this.name = "GoogleCalendarAuthorizationError"; }
}
function required(name: string) { const value = process.env[name]?.trim(); if (!value) throw new Error(`Falta configurar ${name}.`); return value; }
