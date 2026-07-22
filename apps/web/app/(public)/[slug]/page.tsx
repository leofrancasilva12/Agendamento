import { notFound } from 'next/navigation';
import { apiFetch, ApiError, Company, Service } from '@/lib/api';
import { BookingWizard } from '@/components/booking/BookingWizard';

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

export default async function PublicBookingPage({ params }: { params: { slug: string } }) {
  const company = await getCompany(params.slug);
  if (!company) notFound();

  const services = await getServices(params.slug);

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <header className="mb-8 text-center">
          {company.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={company.name} className="mx-auto mb-3 h-16 w-16 rounded-full object-cover" />
          )}
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">Escolha um serviço para agendar seu horário</p>
        </header>

        <BookingWizard slug={company.slug} services={services} primaryColor={company.primaryColor} />
      </div>
    </main>
  );
}
