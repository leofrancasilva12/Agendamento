import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW'] as const;

export class QueryBookingsDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
