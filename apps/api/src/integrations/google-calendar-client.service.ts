import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

@Injectable()
export class GoogleCalendarClientService {
  constructor(private readonly config: ConfigService) {}

  getAuthorizationUrl(input: { challenge: string; state: string }) {
    const client = this.createOAuthClient();
    const url = new URL(
      client.generateAuthUrl({
        access_type: "offline",
        client_id: this.required("GOOGLE_CALENDAR_CLIENT_ID"),
        include_granted_scopes: true,
        prompt: "consent",
        redirect_uri: this.redirectUri(),
        response_type: "code",
        scope: [
          "openid",
          "email",
          "profile",
          "https://www.googleapis.com/auth/calendar.app.created"
        ],
        state: input.state
      })
    );
    url.searchParams.set("code_challenge", input.challenge);
    url.searchParams.set("code_challenge_method", "S256");
    return url.toString();
  }

  async exchangeCode(code: string, codeVerifier: string) {
    const { tokens } = await this.createOAuthClient().getToken({
      code,
      codeVerifier,
      redirect_uri: this.redirectUri()
    });
    if (!tokens.access_token || !tokens.refresh_token)
      throw new BadRequestException("Google no devolvio los tokens necesarios para Calendar.");
    const userInfo = await this.request<{ email?: string; sub?: string }>(
      "https://openidconnect.googleapis.com/v1/userinfo",
      tokens.access_token
    );
    if (!userInfo.sub || !userInfo.email)
      throw new BadRequestException("No se pudo identificar la cuenta de Google.");
    return {
      accessToken: tokens.access_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      googleEmail: userInfo.email.toLowerCase(),
      googleSubject: userInfo.sub,
      refreshToken: tokens.refresh_token
    };
  }

  private createOAuthClient() {
    return new OAuth2Client(
      this.required("GOOGLE_CALENDAR_CLIENT_ID"),
      this.required("GOOGLE_CALENDAR_CLIENT_SECRET"),
      this.redirectUri()
    );
  }
  private redirectUri() {
    return (
      this.config.get<string>("GOOGLE_CALENDAR_REDIRECT_URI")?.trim() ||
      `${this.config.get<string>("API_PUBLIC_URL")?.trim() || "http://localhost:3001"}/api/integrations/google-calendar/callback`
    );
  }
  private required(name: string) {
    const value = this.config.get<string>(name)?.trim();
    if (!value) throw new BadRequestException(`Falta configurar ${name}.`);
    return value;
  }
  private async request<T>(url: string, accessToken: string) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new BadRequestException("No se pudo identificar la cuenta de Google.");
    return (await response.json()) as T;
  }
}
