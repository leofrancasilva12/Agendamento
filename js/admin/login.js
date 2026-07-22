import { supabase } from '/js/supabaseClient.js';
import { showError, hideError } from '/js/utils.js';
import { consumePendingRegistration } from './pending-registration.js';

const form = document.getElementById('login-form');
const errorBox = document.getElementById('error-box');
const submitBtn = document.getElementById('submit-btn');

function setLoading(loading, label) {
  submitBtn.disabled = loading;
  submitBtn.textContent = label;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError(errorBox);
  setLoading(true, 'Entrando...');

  const email = form.email.value.trim();
  const password = form.password.value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    showError(errorBox, 'E-mail ou senha inválidos.');
    setLoading(false, 'Entrar');
    return;
  }

  const { data: member } = await supabase.from('company_members').select('company_id').maybeSingle();

  if (!member) {
    const pending = consumePendingRegistration(email);
    if (!pending) {
      showError(errorBox, 'Sua conta ainda não está associada a nenhuma empresa. Cadastre-se novamente.');
      setLoading(false, 'Entrar');
      return;
    }
    const { error: rpcError } = await supabase.rpc('register_company', {
      p_company_name: pending.companyName,
      p_slug: pending.slug,
      p_email: pending.email,
    });
    if (rpcError) {
      showError(errorBox, `Login ok, mas não foi possível concluir o cadastro da empresa: ${rpcError.message}`);
      setLoading(false, 'Entrar');
      return;
    }
  }

  window.location.href = '/admin/dashboard.html';
});
