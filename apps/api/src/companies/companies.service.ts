import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { SetCompanyHoursDto } from './dto/set-hours.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findById(companyId: string) {
    return this.prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      include: { hours: { orderBy: { weekday: 'asc' } } },
    });
  }

  update(companyId: string, dto: UpdateCompanyDto) {
    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }

  async setHours(companyId: string, dto: SetCompanyHoursDto) {
    await this.prisma.$transaction([
      this.prisma.companyHours.deleteMany({ where: { companyId } }),
      this.prisma.companyHours.createMany({
        data: dto.days.map((day) => ({ ...day, companyId })),
      }),
    ]);
    return this.prisma.companyHours.findMany({
      where: { companyId },
      orderBy: { weekday: 'asc' },
    });
  }

  async findPublicBySlug(slug: string) {
    const company = await this.prisma.company.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        coverImageUrl: true,
        primaryColor: true,
        timezone: true,
        addressLine: true,
        instagramUrl: true,
        facebookUrl: true,
        whatsappNumber: true,
        hours: { orderBy: { weekday: 'asc' } },
      },
    });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }
}
