import { IsIn } from 'class-validator';

const STATUSES = ['CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW'] as const;

export class UpdateBookingStatusDto {
  @IsIn(STATUSES)
  status!: (typeof STATUSES)[number];
}
