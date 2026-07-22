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
      addressLine: 'Praça da Sé, 10 - Sé - São Paulo - SP - 01001-000',
      instagramUrl: 'https://instagram.com/salaoexemplo',
      facebookUrl: 'https://facebook.com/salaoexemplo',
      whatsappNumber: '11999990000',
      users: {
        create: {
          name: 'Owner Exemplo',
          email: 'owner@salaoexemplo.com.br',
          passwordHash,
          role: 'OWNER',
        },
      },
      hours: {
        create: [
          { weekday: 0, closed: true },
          { weekday: 1, startTime: '08:00', endTime: '18:00' },
          { weekday: 2, startTime: '08:00', endTime: '18:00' },
          { weekday: 3, startTime: '08:00', endTime: '18:00' },
          { weekday: 4, startTime: '08:00', endTime: '18:00' },
          { weekday: 5, startTime: '08:00', endTime: '18:00' },
          { weekday: 6, startTime: '08:00', endTime: '14:00' },
        ],
      },
    },
  });

  const cabelo = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Cabelo', order: 0 },
  });
  const unhas = await prisma.serviceCategory.create({
    data: { companyId: company.id, name: 'Manicure e Pedicure', order: 1 },
  });

  const ana = await prisma.professional.create({
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

  const bruno = await prisma.professional.create({
    data: {
      companyId: company.id,
      name: 'Bruno Lima',
      email: 'bruno@salaoexemplo.com.br',
      availability: {
        create: [2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startTime: '10:00',
          endTime: '19:00',
        })),
      },
    },
  });

  const service = await prisma.service.create({
    data: {
      companyId: company.id,
      categoryId: cabelo.id,
      name: 'Corte de Cabelo',
      description: 'Corte feminino ou masculino',
      durationMinutes: 45,
      priceCents: 8000,
      professionals: { create: [{ professionalId: ana.id }, { professionalId: bruno.id }] },
    },
  });

  await prisma.service.create({
    data: {
      companyId: company.id,
      categoryId: unhas.id,
      name: 'Manicure',
      description: 'Cuticulagem + esmaltação comum + finalização.',
      durationMinutes: 30,
      priceCents: 4500,
      professionals: { create: { professionalId: ana.id } },
    },
  });

  await prisma.service.create({
    data: {
      companyId: company.id,
      categoryId: unhas.id,
      name: 'Esmaltação em Gel',
      description: 'Esmalte em gel com cura na cabine, brilho intenso e maior durabilidade.',
      durationMinutes: 60,
      priceCents: 11000,
      professionals: { create: { professionalId: ana.id } },
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
