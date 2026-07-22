import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AvailabilityService } from './availability.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@UseGuards(JwtAuthGuard)
@Controller('professionals/:id/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Get()
  find(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.availabilityService.findForProfessional(user.companyId, id);
  }

  @Put()
  set(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.availabilityService.setForProfessional(user.companyId, id, dto);
  }
}
