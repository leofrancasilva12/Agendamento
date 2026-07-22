import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const [slugTaken, emailTaken] = await Promise.all([
      this.prisma.company.findUnique({ where: { slug: dto.slug } }),
      this.prisma.user.findUnique({ where: { email: dto.email } }),
    ]);
    if (slugTaken) throw new ConflictException('Esse endereço (slug) já está em uso');
    if (emailTaken) throw new ConflictException('Esse e-mail já está cadastrado');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        slug: dto.slug,
        email: dto.email,
        users: {
          create: {
            name: dto.ownerName,
            email: dto.email,
            passwordHash,
            role: 'OWNER',
          },
        },
      },
      include: { users: true },
    });

    const owner = company.users[0];
    return this.buildSession(owner.id, company.id, owner.role, owner.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.buildSession(user.id, user.companyId, user.role, user.email);
  }

  private buildSession(userId: string, companyId: string, role: 'OWNER' | 'STAFF', email: string) {
    const token = this.jwt.sign({ sub: userId, companyId, role, email });
    return { token, user: { id: userId, companyId, role, email } };
  }
}
