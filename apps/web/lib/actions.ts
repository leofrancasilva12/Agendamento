'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, BookingStatus } from './api';
import { getSessionToken } from './session';

function requireToken(): string {
  const token = getSessionToken();
  if (!token) redirect('/admin/login');
  return token;
}

// ---- Bookings ----
export async function updateBookingStatus(id: string, status: BookingStatus) {
  const token = requireToken();
  await apiFetch(`/bookings/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
  revalidatePath('/admin');
}

// ---- Services ----
export async function createService(formData: FormData) {
  const token = requireToken();
  await apiFetch('/services', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      categoryId: formData.get('categoryId') || undefined,
      imageUrl: formData.get('imageUrl') || undefined,
      durationMinutes: Number(formData.get('durationMinutes')),
      priceCents: Math.round(Number(formData.get('price')) * 100),
      professionalIds: formData.getAll('professionalIds'),
    }),
  });
  revalidatePath('/admin/services');
}

export async function updateService(id: string, formData: FormData) {
  const token = requireToken();
  await apiFetch(`/services/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      categoryId: formData.get('categoryId') || undefined,
      imageUrl: formData.get('imageUrl') || undefined,
      durationMinutes: Number(formData.get('durationMinutes')),
      priceCents: Math.round(Number(formData.get('price')) * 100),
      active: formData.get('active') === 'on',
      professionalIds: formData.getAll('professionalIds'),
    }),
  });
  revalidatePath('/admin/services');
}

export async function deleteService(id: string) {
  const token = requireToken();
  await apiFetch(`/services/${id}`, { method: 'DELETE', token });
  revalidatePath('/admin/services');
}

// ---- Service categories ----
export async function createCategory(formData: FormData) {
  const token = requireToken();
  await apiFetch('/service-categories', {
    method: 'POST',
    token,
    body: JSON.stringify({ name: formData.get('name') }),
  });
  revalidatePath('/admin/services');
}

export async function deleteCategory(id: string) {
  const token = requireToken();
  await apiFetch(`/service-categories/${id}`, { method: 'DELETE', token });
  revalidatePath('/admin/services');
}

// ---- Professionals ----
export async function createProfessional(formData: FormData) {
  const token = requireToken();
  await apiFetch('/professionals', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
    }),
  });
  revalidatePath('/admin/professionals');
}

export async function updateProfessional(id: string, formData: FormData) {
  const token = requireToken();
  await apiFetch(`/professionals/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      active: formData.get('active') === 'on',
    }),
  });
  revalidatePath('/admin/professionals');
}

export async function deleteProfessional(id: string) {
  const token = requireToken();
  await apiFetch(`/professionals/${id}`, { method: 'DELETE', token });
  revalidatePath('/admin/professionals');
}

export async function setAvailability(professionalId: string, formData: FormData) {
  const token = requireToken();
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  const slots = weekdays
    .filter((day) => formData.get(`active-${day}`) === 'on')
    .map((day) => ({
      weekday: day,
      startTime: String(formData.get(`start-${day}`)),
      endTime: String(formData.get(`end-${day}`)),
    }));

  await apiFetch(`/professionals/${professionalId}/availability`, {
    method: 'PUT',
    token,
    body: JSON.stringify({ slots }),
  });
  revalidatePath(`/admin/professionals/${professionalId}/availability`);
}

// ---- Clients ----
export async function createClient(formData: FormData) {
  const token = requireToken();
  await apiFetch('/clients', {
    method: 'POST',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email') || undefined,
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath('/admin/clients');
}

export async function deleteClient(id: string) {
  const token = requireToken();
  await apiFetch(`/clients/${id}`, { method: 'DELETE', token });
  revalidatePath('/admin/clients');
}

// ---- Company settings ----
export async function updateCompanySettings(formData: FormData) {
  const token = requireToken();
  await apiFetch('/companies/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      name: formData.get('name'),
      phone: formData.get('phone') || undefined,
      primaryColor: formData.get('primaryColor') || undefined,
      timezone: formData.get('timezone') || undefined,
      addressLine: formData.get('addressLine') || undefined,
      instagramUrl: formData.get('instagramUrl') || undefined,
      facebookUrl: formData.get('facebookUrl') || undefined,
      whatsappNumber: formData.get('whatsappNumber') || undefined,
    }),
  });
  revalidatePath('/admin/settings');
}

export async function updateCompanyHours(formData: FormData) {
  const token = requireToken();
  const days = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    closed: formData.get(`closed-${weekday}`) === 'on',
    startTime: String(formData.get(`start-${weekday}`) || '09:00'),
    endTime: String(formData.get(`end-${weekday}`) || '18:00'),
  }));

  await apiFetch('/companies/me/hours', {
    method: 'PUT',
    token,
    body: JSON.stringify({ days }),
  });
  revalidatePath('/admin/settings');
}
