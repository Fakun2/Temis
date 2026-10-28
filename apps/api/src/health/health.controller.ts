import { Controller, Get, Res } from "@nestjs/common";
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { PublicHealthResponseDto } from "./health.schemas";
import { PublicHealthService } from "./public-health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly publicHealth: PublicHealthService) {}

  @Get()
  check() {
    return {
      status: "ok",
      service: "temis-api"
    };
  }

  @Get("authentication")
  @ApiOkResponse({ type: PublicHealthResponseDto })
  @ApiServiceUnavailableResponse({ type: PublicHealthResponseDto })
  authentication(@Res({ passthrough: true }) response: Response) {
    return this.respond(response, this.publicHealth.authentication());
  }

  @Get("documents")
  @ApiOkResponse({ type: PublicHealthResponseDto })
  @ApiServiceUnavailableResponse({ type: PublicHealthResponseDto })
  documents(@Res({ passthrough: true }) response: Response) {
    return this.respond(response, this.publicHealth.documents());
  }

  @Get("async-processing")
  @ApiOkResponse({ type: PublicHealthResponseDto })
  @ApiServiceUnavailableResponse({ type: PublicHealthResponseDto })
  asyncProcessing(@Res({ passthrough: true }) response: Response) {
    return this.respond(response, this.publicHealth.asyncProcessing());
  }

  private async respond(response: Response, result: Promise<PublicHealthResponseDto>) {
    const body = await result;
    response.status(body.status === "operational" ? 200 : 503);
    response.setHeader("Cache-Control", "no-store");
    return body;
  }
}
