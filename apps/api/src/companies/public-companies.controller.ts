import { Controller, Get, Param } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('public/companies')
export class PublicCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.companiesService.findPublicBySlug(slug);
  }
}
