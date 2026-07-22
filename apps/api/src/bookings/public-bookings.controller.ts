import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BookingsService } from './bookings.service';
import { CreatePublicBookingDto } from './dto/create-public-booking.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';

@Controller('public/companies/:slug')
export class PublicBookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('availability')
  getAvailability(@Param('slug') slug: string, @Query() query: QueryAvailabilityDto) {
    return this.bookingsService.getAvailability(slug, query);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('bookings')
  create(@Param('slug') slug: string, @Body() dto: CreatePublicBookingDto) {
    return this.bookingsService.createPublicBooking(slug, dto);
  }
}
