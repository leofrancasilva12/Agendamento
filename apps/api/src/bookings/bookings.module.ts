import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { PublicBookingsController } from './public-bookings.controller';
import { AdminBookingsController } from './admin-bookings.controller';
import { RemindersScheduler } from './reminders.scheduler';
import { ClientsModule } from '../clients/clients.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ClientsModule, NotificationsModule],
  providers: [BookingsService, RemindersScheduler],
  controllers: [PublicBookingsController, AdminBookingsController],
})
export class BookingsModule {}
