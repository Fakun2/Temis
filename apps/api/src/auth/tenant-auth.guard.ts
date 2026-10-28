import { ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { AuthenticatedRequest } from "./auth.types";

@Injectable()
export class TenantAuthGuard extends JwtAuthGuard {
  handleRequest<TUser = AuthenticatedRequest["user"]>(
    error: unknown,
    user: TUser,
    info: unknown,
    context: ExecutionContext
  ): TUser {
    const authenticated = super.handleRequest(
      error,
      user,
      info,
      context
    ) as AuthenticatedRequest["user"];
    if (!authenticated || authenticated.sessionKind !== "tenant") {
      throw new UnauthorizedException("Sesion tenant invalida.");
    }
    return authenticated as TUser;
  }
}
