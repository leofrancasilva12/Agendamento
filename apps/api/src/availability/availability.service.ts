import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalsService } from '../professionals/professionals.service';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly professionalsService: ProfessionalsService,
  ) {}

  async findForProfessional(companyId: string, professionalId: string) {
    await this.professionalsService.findOneOrThrow(companyId, professionalId);
    return this.prisma.availability.findMany({
      where: { professionalId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
  }

  async setForProfessional(companyId: string, professionalId: string, dto: SetAvailabilityDto) {
    await this.professionalsService.findOneOrThrow(companyId, professionalId);

    await this.prisma.$transaction([
      this.prisma.availability.deleteMany({ where: { professionalId } }),
      this.prisma.availability.createMany({
        data: dto.slots.map((slot) => ({ ...slot, professionalId })),
      }),
    ]);

    return this.findForProfessional(companyId, professionalId);
  }
}
