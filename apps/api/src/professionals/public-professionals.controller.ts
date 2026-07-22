import { Controller, Get, Param } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';

@Controller('public/companies/:slug/professionals')
export class PublicProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get()
  findActive(@Param('slug') slug: string) {
    return this.professionalsService.findActiveByCompanySlug(slug);
  }
}
