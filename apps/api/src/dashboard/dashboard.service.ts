import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60_000);

    const [todayCount, upcoming, activeServices, activeProfessionals, totalClients] =
      await Promise.all([
        this.prisma.booking.count({
          where: {
            companyId,
            startAt: { gte: startOfToday, lt: endOfToday },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        }),
        this.prisma.booking.findMany({
          where: { companyId, startAt: { gte: new Date() }, status: { in: ['PENDING', 'CONFIRMED'] } },
          orderBy: { startAt: 'asc' },
          take: 5,
          include: { service: true, professional: true, client: true },
        }),
        this.prisma.service.count({ where: { companyId, active: true } }),
        this.prisma.professional.count({ where: { companyId, active: true } }),
        this.prisma.client.count({ where: { companyId } }),
      ]);

    return { todayCount, upcoming, activeServices, activeProfessionals, totalClients };
  }
}
