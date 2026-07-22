import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'session';

export function getSessionToken(): string | null {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}
