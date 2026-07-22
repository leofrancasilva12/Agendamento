import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('senha123', 10);

  const company = await prisma.company.upsert({
    where: { slug: 'salao-exemplo' },
    update: {},
    create: {
      name: 'Salão Exemplo',
      slug: 'salao-exemplo',
      email: 'contato@salaoexemplo.com.br',
      phone: '11999990000',
      primaryColor: '#2563eb',
      users: {
        create: {
          name: 'Owner Exemplo',
          email: 'owner@salaoexemplo.com.br',
          passwordHash,
          role: 'OWNER',
        },
      },
    },
  });

  const professional = await prisma.professional.create({
    data: {
      companyId: company.id,
      name: 'Ana Souza',
      email: 'ana@salaoexemplo.com.br',
      availability: {
        create: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          startTime: '09:00',
          endTime: '18:00',
        })),
      },
    },
  });

  const service = await prisma.service.create({
    data: {
      companyId: company.id,
      name: 'Corte de Cabelo',
      description: 'Corte feminino ou masculino',
      durationMinutes: 45,
      priceCents: 8000,
      professionals: { create: { professionalId: professional.id } },
    },
  });

  await prisma.service.create({
    data: {
      companyId: company.id,
      name: 'Manicure',
      durationMinutes: 30,
      priceCents: 4500,
      professionals: { create: { professionalId: professional.id } },
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed concluído:', { company: company.slug, service: service.name });
  // eslint-disable-next-line no-console
  console.log('Login admin: owner@salaoexemplo.com.br / senha123');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
