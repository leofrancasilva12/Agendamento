import { supabase } from '/js/supabaseClient.js';

export async function requireSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = '/admin/login.html';
    return null;
  }
  return session;
}

let cachedCompany = null;

export async function getCurrentCompany({ force = false } = {}) {
  if (cachedCompany && !force) return cachedCompany;
  const { data, error } = await supabase
    .from('company_members')
    .select('company_id, companies(*)')
    .single();
  if (error || !data) throw error || new Error('Empresa não encontrada para este usuário.');
  cachedCompany = data.companies;
  return cachedCompany;
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/admin/login.html';
}
