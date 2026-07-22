import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.error('Supabase não configurado: edite js/config.js com a URL e a anon key do seu projeto.');
}

export const supabase = createClient(window.SUPABASE_URL || '', window.SUPABASE_ANON_KEY || '');
