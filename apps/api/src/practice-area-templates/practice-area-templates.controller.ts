import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { TenantAuthenticated } from "../auth/tenant-endpoint.decorator";
import { PracticeAreaTemplateDto } from "./practice-area-templates.schemas";
import { PracticeAreaTemplatesService } from "./practice-area-templates.service";

@ApiTags("practice-area-templates")
@ApiBearerAuth()
@Controller("practice-area-templates")
@TenantAuthenticated()
export class PracticeAreaTemplatesController {
  constructor(private readonly practiceAreaTemplatesService: PracticeAreaTemplatesService) {}

  @Get()
  @ApiOkResponse({ type: [PracticeAreaTemplateDto] })
  list() {
    return this.practiceAreaTemplatesService.listActive();
  }
}
