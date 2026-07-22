import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './email.service';
import { WhatsappService } from './whatsapp.service';

type BookingWithRelations = {
  id: string;
  startAt: Date;
  company: { name: string };
  service: { name: string };
  professional: { name: string };
  client: { name: string; email: string | null; phone: string };
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
  ) {}

  async notifyBookingCreated(booking: BookingWithRelations) {
    const results = await Promise.all([
      booking.client.email
        ? this.emailService.sendBookingConfirmation({
            to: booking.client.email,
            companyName: booking.company.name,
            clientName: booking.client.name,
            serviceName: booking.service.name,
            professionalName: booking.professional.name,
            startAt: booking.startAt,
          })
        : Promise.resolve({ sent: false, reason: 'Cliente sem e-mail' }),
      this.whatsappService.sendBookingCreated({
        companyName: booking.company.name,
        clientName: booking.client.name,
        clientPhone: booking.client.phone,
        serviceName: booking.service.name,
        professionalName: booking.professional.name,
        startAt: booking.startAt.toISOString(),
      }),
    ]);

    await this.logResults(booking.id, results);
  }

  async notifyBookingReminder(booking: BookingWithRelations) {
    const result = await this.whatsappService.sendBookingReminder({
      companyName: booking.company.name,
      clientName: booking.client.name,
      clientPhone: booking.client.phone,
      serviceName: booking.service.name,
      professionalName: booking.professional.name,
      startAt: booking.startAt.toISOString(),
    });
    await this.logResults(booking.id, [result], ['WHATSAPP']);
    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: new Date() },
    });
  }

  private async logResults(
    bookingId: string,
    results: { sent: boolean; reason?: string }[],
    channels: ('EMAIL' | 'WHATSAPP')[] = ['EMAIL', 'WHATSAPP'],
  ) {
    try {
      await this.prisma.notificationLog.createMany({
        data: results.map((result, index) => ({
          bookingId,
          channel: channels[index],
          status: result.sent ? 'SENT' : 'SKIPPED',
          error: result.sent ? null : result.reason,
        })),
      });
    } catch (error) {
      this.logger.error('Falha ao registrar log de notificação', error as Error);
    }
  }
}
