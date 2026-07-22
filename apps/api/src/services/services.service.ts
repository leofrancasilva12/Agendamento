import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.service.findMany({
      where: { companyId },
      include: { professionals: { include: { professional: true } }, category: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneOrThrow(companyId: string, id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: { professionals: true },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (service.companyId !== companyId) throw new ForbiddenException();
    return service;
  }

  create(companyId: string, dto: CreateServiceDto) {
    const { professionalIds, ...data } = dto;
    return this.prisma.service.create({
      data: {
        ...data,
        companyId,
        professionals: professionalIds
          ? { create: professionalIds.map((professionalId) => ({ professionalId })) }
          : undefined,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateServiceDto) {
    await this.findOneOrThrow(companyId, id);
    const { professionalIds, ...data } = dto;

    if (professionalIds) {
      await this.prisma.serviceProfessional.deleteMany({ where: { serviceId: id } });
    }

    return this.prisma.service.update({
      where: { id },
      data: {
        ...data,
        professionals: professionalIds
          ? { create: professionalIds.map((professionalId) => ({ professionalId })) }
          : undefined,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOneOrThrow(companyId, id);
    await this.prisma.service.delete({ where: { id } });
    return { success: true };
  }

  async findActiveByCompanySlug(slug: string) {
    return this.prisma.service.findMany({
      where: { active: true, company: { slug } },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        durationMinutes: true,
        priceCents: true,
        category: { select: { id: true, name: true, order: true } },
      },
      orderBy: [{ category: { order: 'asc' } }, { name: 'asc' }],
    });
  }

  async findProfessionalsForService(slug: string, serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, active: true, company: { slug } },
    });
    if (!service) throw new NotFoundException('Serviço não encontrado');

    const links = await this.prisma.serviceProfessional.findMany({
      where: { serviceId },
      include: { professional: true },
    });

    return links
      .map((link) => link.professional)
      .filter((professional) => professional.active)
      .map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
  }
}
