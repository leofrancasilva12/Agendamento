const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface FetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }));
    throw new ApiError(body.message ?? 'Erro ao comunicar com a API', response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface CompanyHours {
  weekday: number;
  closed: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string | null;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  primaryColor: string;
  timezone: string;
  addressLine?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsappNumber?: string | null;
  hours?: CompanyHours[];
}

export interface ServiceCategory {
  id: string;
  name: string;
  order: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
  category?: ServiceCategory | null;
  categoryId?: string | null;
}

export interface Professional {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  active: boolean;
}

export interface Client {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  notes?: string | null;
}

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED' | 'NO_SHOW';

export interface Booking {
  id: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  notes?: string | null;
  service: Service;
  professional: Professional;
  client: Client;
}

export const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function formatPrice(priceCents: number) {
  return (priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h${rest}min`;
}
