import { IsOptional, IsString, Matches } from 'class-validator';

export class QueryAvailabilityDto {
  // Omitido/vazio = "sem preferência": retorna a união dos horários livres
  // de todos os profissionais que atendem o serviço.
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  serviceId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date!: string;
}
