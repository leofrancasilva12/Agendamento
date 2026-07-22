import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @Matches(/^[a-z0-9](-?[a-z0-9])*$/, {
    message: 'slug deve conter apenas letras minúsculas, números e hífen',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  ownerName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
