import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.client.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  }

  async findOneOrThrow(companyId: string, id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { bookings: { orderBy: { startAt: 'desc' }, take: 20, include: { service: true } } },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    if (client.companyId !== companyId) throw new ForbiddenException();
    return client;
  }

  create(companyId: string, dto: CreateClientDto) {
    return this.prisma.client.create({ data: { ...dto, companyId } });
  }

  async update(companyId: string, id: string, dto: UpdateClientDto) {
    await this.findOneOrThrow(companyId, id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  async remove(companyId: string, id: string) {
    await this.findOneOrThrow(companyId, id);
    await this.prisma.client.delete({ where: { id } });
    return { success: true };
  }

  async findOrCreateByPhone(companyId: string, dto: CreateClientDto) {
    const existing = await this.prisma.client.findUnique({
      where: { companyId_phone: { companyId, phone: dto.phone } },
    });
    if (existing) {
      return this.prisma.client.update({
        where: { id: existing.id },
        data: { name: dto.name, email: dto.email ?? existing.email },
      });
    }
    return this.create(companyId, dto);
  }
}
