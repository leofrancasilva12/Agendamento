import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';

@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger(RemindersScheduler.name);

  constructor(private readonly bookingsService: BookingsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleReminders() {
    const bookings = await this.bookingsService.findBookingsNeedingReminder();
    for (const booking of bookings) {
      await this.bookingsService.sendReminder(booking.id);
    }
    if (bookings.length > 0) {
      this.logger.log(`Lembretes enviados para ${bookings.length} agendamento(s).`);
    }
  }
}
