import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

class PublicClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8)
  phone!: string;
}

export class CreatePublicBookingDto {
  @IsString()
  serviceId!: string;

  // Omitido = "sem preferência": o backend escolhe automaticamente um
  // profissional qualificado que esteja livre nesse horário.
  @IsOptional()
  @IsString()
  professionalId?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato YYYY-MM-DD' })
  date!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time deve estar no formato HH:mm' })
  time!: string;

  @ValidateNested()
  @Type(() => PublicClientDto)
  client!: PublicClientDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
