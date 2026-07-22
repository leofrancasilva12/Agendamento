import { notFound } from 'next/navigation';
import { apiFetch, ApiError, Company, Professional, Service } from '@/lib/api';
import { BookingWizard } from '@/components/booking/BookingWizard';
import { TeamCarousel } from '@/components/booking/TeamCarousel';
import { LocationSection, HoursSection, SocialSection } from '@/components/booking/CompanyInfoSections';

async function getCompany(slug: string): Promise<Company | null> {
  try {
    return await apiFetch<Company>(`/public/companies/${slug}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function getServices(slug: string): Promise<Service[]> {
  return apiFetch<Service[]>(`/public/companies/${slug}/services`);
}

async function getProfessionals(slug: string): Promise<Professional[]> {
  return apiFetch<Professional[]>(`/public/companies/${slug}/professionals`);
}

export default async function PublicBookingPage({ params }: { params: { slug: string } }) {
  const company = await getCompany(params.slug);
  if (!company) notFound();

  const [services, professionals] = await Promise.all([
    getServices(params.slug),
    getProfessionals(params.slug),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl space-y-8 px-4">
        <header className="text-center">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logoUrl}
              alt={company.name}
              className="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
            />
          )}
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">Agende seu horário</p>
        </header>

        <BookingWizard slug={company.slug} services={services} />

        <TeamCarousel professionals={professionals} />
        <LocationSection addressLine={company.addressLine} />
        <HoursSection hours={company.hours} />
        <SocialSection
          instagramUrl={company.instagramUrl}
          facebookUrl={company.facebookUrl}
          whatsappNumber={company.whatsappNumber}
        />
      </div>
    </main>
  );
}
