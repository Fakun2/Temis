import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../database/prisma.service";
import { JwtPayload } from "./auth.types";
import { getRequiredJwtConfig } from "./jwt-config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getRequiredJwtConfig(config, "JWT_ACCESS_SECRET")
    });
  }

  async validate(payload: JwtPayload) {
    if (!isValidPayloadShape(payload)) {
      throw new UnauthorizedException("Sesion invalida.");
    }
    const [user] = await this.prisma.$queryRaw<Array<{ sessionVersion: number; status: string }>>`
      SELECT "session_version" AS "sessionVersion", "status"
      FROM "users"
      WHERE "id" = ${payload.sub}::uuid
      LIMIT 1
    `;

    if (
      !user ||
      user.status !== "active" ||
      user.sessionVersion !== payload.sessionVersion
    ) {
      throw new UnauthorizedException("Sesion invalida.");
    }

    return payload;
  }
}

function isValidPayloadShape(payload: JwtPayload) {
  if (payload.sessionKind === "tenant") {
    return Array.isArray(payload.tenantAccess) && !("platformAccess" in payload) && !("sid" in payload);
  }
  if (payload.sessionKind === "platform") {
    return Boolean(
      payload.sid &&
        payload.platformAccess?.role === "super_admin" &&
        Array.isArray(payload.amr) &&
        !("tenantAccess" in payload)
    );
  }
  return false;
}
