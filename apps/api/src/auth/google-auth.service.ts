import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";

export type GoogleAuthProfile = {
  avatarUrl: string | null;
  email: string;
  fullName: string;
  providerUserId: string;
};

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();

  constructor(private readonly config: ConfigService) {}

  async verifyIdToken(idToken: string): Promise<GoogleAuthProfile> {
    if (this.config.get<string>("GOOGLE_AUTH_ENABLED") !== "true") {
      throw new UnauthorizedException("Google Auth no esta habilitado.");
    }

    const clientId = this.config.get<string>("GOOGLE_AUTH_CLIENT_ID")?.trim();
    if (!clientId) {
      throw new UnauthorizedException("Google Auth no esta configurado.");
    }

    try {
      const ticket = await this.client.verifyIdToken({
        audience: clientId,
        idToken
      });
      const payload = ticket.getPayload();

      if (!payload?.sub || !payload.email || payload.email_verified !== true) {
        throw new UnauthorizedException("No se pudo verificar la cuenta de Google.");
      }

      return {
        avatarUrl: payload.picture ?? null,
        email: payload.email.toLowerCase(),
        fullName: payload.name?.trim() || payload.email,
        providerUserId: payload.sub
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("No se pudo verificar la cuenta de Google.");
    }
  }
}
