import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.professional.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneOrThrow(companyId: string, id: string) {
    const professional = await this.prisma.professional.findUnique({ where: { id } });
    if (!professional) throw new NotFoundException('Profissional não encontrado');
    if (professional.companyId !== companyId) throw new ForbiddenException();
    return professional;
  }

  create(companyId: string, dto: CreateProfessionalDto) {
    return this.prisma.professional.create({ data: { ...dto, companyId } });
  }

  async update(companyId: string, id: string, dto: UpdateProfessionalDto) {
    await this.findOneOrThrow(companyId, id);
    return this.prisma.professional.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOneOrThrow(companyId, id);
    await this.prisma.professional.delete({ where: { id } });
    return { success: true };
  }
}
