import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SetCompanyHoursDto } from './dto/set-hours.dto';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findById(user.companyId);
  }

  @Patch('me')
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(user.companyId, dto);
  }

  @Put('me/hours')
  setHours(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetCompanyHoursDto) {
    return this.companiesService.setHours(user.companyId, dto);
  }
}
