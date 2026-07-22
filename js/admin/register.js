import { supabase } from '/js/supabaseClient.js';
import { showError, hideError } from '/js/utils.js';
import { savePendingRegistration } from './pending-registration.js';

const form = document.getElementById('register-form');
const errorBox = document.getElementById('error-box');
const submitBtn = document.getElementById('submit-btn');
const formWrapper = document.getElementById('form-wrapper');
const confirmMessage = document.getElementById('confirm-email-message');

function setLoading(loading, label) {
  submitBtn.disabled = loading;
  submitBtn.textContent = label;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  hideError(errorBox);
  setLoading(true, 'Criando...');

  const companyName = form.companyName.value.trim();
  const slug = form.slug.value.trim().toLowerCase();
  const ownerName = form.ownerName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: ownerName } },
  });

  if (signUpError) {
    showError(errorBox, signUpError.message);
    setLoading(false, 'Criar empresa');
    return;
  }

  if (signUpData.session) {
    const { error: rpcError } = await supabase.rpc('register_company', {
      p_company_name: companyName,
      p_slug: slug,
      p_email: email,
    });
    if (rpcError) {
      showError(errorBox, rpcError.message);
      setLoading(false, 'Criar empresa');
      return;
    }
    window.location.href = '/admin/dashboard.html';
    return;
  }

  // Sem sessão = confirmação de e-mail obrigatória no projeto Supabase.
  savePendingRegistration(email, { companyName, slug, email });
  formWrapper.classList.add('hidden');
  confirmMessage.classList.remove('hidden');
});
