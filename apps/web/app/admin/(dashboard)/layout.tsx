import { redirect } from 'next/navigation';
import { apiFetch, ApiError, Company } from '@/lib/api';
import { getSessionToken } from '@/lib/session';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const token = getSessionToken();
  if (!token) redirect('/admin/login');

  let company: Company;
  try {
    company = await apiFetch<Company>('/companies/me', { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/admin/login');
    throw error;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AdminNav companyName={company.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
