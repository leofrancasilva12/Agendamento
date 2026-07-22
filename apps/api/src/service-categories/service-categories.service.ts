import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.serviceCategory.findMany({
      where: { companyId },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  create(companyId: string, dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({ data: { ...dto, companyId } });
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOneOrThrow(companyId, id);
    return this.prisma.serviceCategory.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOneOrThrow(companyId, id);
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { success: true };
  }

  private async findOneOrThrow(companyId: string, id: string) {
    const category = await this.prisma.serviceCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoria não encontrada');
    if (category.companyId !== companyId) throw new ForbiddenException();
    return category;
  }
}
