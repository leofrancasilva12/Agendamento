import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { computeAvailableSlots } from './slots.util';

const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getAvailability(slug: string, query: QueryAvailabilityDto) {
    const company = await this.prisma.company.findUnique({ where: { slug } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const [service, professional] = await Promise.all([
      this.prisma.service.findFirst({
        where: { id: query.serviceId, companyId: company.id, active: true },
      }),
      this.prisma.professional.findFirst({
        where: { id: query.professionalId, companyId: company.id, active: true },
      }),
    ]);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!professional) throw new NotFoundException('Profissional não encontrado');

    const requestedDate = new Date(`${query.date}T00:00:00`);
    const weekday = requestedDate.getDay();

    const [windows, bookings] = await Promise.all([
      this.prisma.availability.findMany({
        where: { professionalId: professional.id, weekday },
      }),
      this.prisma.booking.findMany({
        where: {
          professionalId: professional.id,
          status: { in: [...ACTIVE_STATUSES] },
          startAt: {
            gte: new Date(`${query.date}T00:00:00`),
            lt: new Date(`${query.date}T23:59:59`),
          },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const slots = computeAvailableSlots(
      windows,
      bookings.map((b) => ({ startAt: b.startAt, endAt: b.endAt })),
      service.durationMinutes,
      query.date,
      new Date(),
    );

    return { date: query.date, durationMinutes: service.durationMinutes, slots };
  }

  async createPublicBooking(slug: string, dto: CreatePublicBookingDto) {
    const company = await this.prisma.company.findUnique({ where: { slug } });
    if (!company) throw new NotFoundException('Empresa não encontrada');

    const [service, professional] = await Promise.all([
      this.prisma.service.findFirst({
        where: { id: dto.serviceId, companyId: company.id, active: true },
      }),
      this.prisma.professional.findFirst({
        where: { id: dto.professionalId, companyId: company.id, active: true },
      }),
    ]);
    if (!service) throw new NotFoundException('Serviço não encontrado');
    if (!professional) throw new NotFoundException('Profissional não encontrado');

    // Revalidate the slot server-side — never trust the time sent by the client.
    const availability = await this.getAvailability(slug, {
      serviceId: dto.serviceId,
      professionalId: dto.professionalId,
      date: dto.date,
    });
    if (!availability.slots.includes(dto.time)) {
      throw new BadRequestException('Esse horário não está mais disponível');
    }

    const startAt = new Date(`${dto.date}T${dto.time}:00`);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

    const client = await this.clientsService.findOrCreateByPhone(company.id, dto.client);

    const booking = await this.prisma.booking.create({
      data: {
        companyId: company.id,
        serviceId: service.id,
        professionalId: professional.id,
        clientId: client.id,
        startAt,
        endAt,
        notes: dto.notes,
        status: 'CONFIRMED',
      },
      include: { company: true, service: true, professional: true, client: true },
    });

    await this.notificationsService.notifyBookingCreated(booking);

    return booking;
  }

  findAllForCompany(
    companyId: string,
    filters: { date?: string; professionalId?: string; status?: BookingStatus },
  ) {
    return this.prisma.booking.findMany({
      where: {
        companyId,
        professionalId: filters.professionalId,
        status: filters.status,
        ...(filters.date && {
          startAt: {
            gte: new Date(`${filters.date}T00:00:00`),
            lt: new Date(`${filters.date}T23:59:59`),
          },
        }),
      },
      include: { service: true, professional: true, client: true },
      orderBy: { startAt: 'asc' },
    });
  }

  async updateStatus(companyId: string, id: string, dto: UpdateBookingStatusDto) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Agendamento não encontrado');
    if (booking.companyId !== companyId) throw new ForbiddenException();

    return this.prisma.booking.update({ where: { id }, data: { status: dto.status } });
  }

  async findBookingsNeedingReminder() {
    const windowStart = new Date(Date.now() + 23 * 60 * 60_000);
    const windowEnd = new Date(Date.now() + 25 * 60 * 60_000);

    return this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        reminderSentAt: null,
        startAt: { gte: windowStart, lte: windowEnd },
      },
      include: { company: true, service: true, professional: true, client: true },
    });
  }

  async sendReminder(bookingId: string) {
    const booking = await this.prisma.booking.findUniqueOrThrow({
      where: { id: bookingId },
      include: { company: true, service: true, professional: true, client: true },
    });
    await this.notificationsService.notifyBookingReminder(booking);
  }
}
