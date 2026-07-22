import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

const STATUSES = ['PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED', 'NO_SHOW'] as const;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class QueryBookingsDto {
  // Filtro por um único dia. Use "from"/"to" para um intervalo (ex.: semana).
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'date deve estar no formato YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'from deve estar no formato YYYY-MM-DD' })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: 'to deve estar no formato YYYY-MM-DD' })
  to?: string;

  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];
}
