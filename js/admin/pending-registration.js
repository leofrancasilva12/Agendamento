// Guarda os dados da empresa localmente entre o signUp() e o primeiro
// login, para o caso do projeto Supabase exigir confirmação de e-mail
// (nesse caso não há sessão ativa logo após o cadastro pra chamar
// register_company — completamos no primeiro login bem-sucedido).
const KEY = 'agendamento_pending_registration';

export function savePendingRegistration(email, payload) {
  localStorage.setItem(KEY, JSON.stringify({ email, payload }));
}

export function consumePendingRegistration(email) {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.email !== email) return null;
    localStorage.removeItem(KEY);
    return parsed.payload;
  } catch {
    return null;
  }
}
