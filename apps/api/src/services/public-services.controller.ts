import { Controller, Get, Param } from '@nestjs/common';
import { ServicesService } from './services.service';

@Controller('public/companies/:slug/services')
export class PublicServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findActive(@Param('slug') slug: string) {
    return this.servicesService.findActiveByCompanySlug(slug);
  }

  @Get(':serviceId/professionals')
  findProfessionals(@Param('slug') slug: string, @Param('serviceId') serviceId: string) {
    return this.servicesService.findProfessionalsForService(slug, serviceId);
  }
}
