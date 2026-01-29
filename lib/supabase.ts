import { createClient } from '@supabase/supabase-js';

// Tenta pegar de process.env (Node/Vercel) ou import.meta (Vite/ESM)
const getEnv = (name: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) return process.env[name];
  if ((import.meta as any).env && (import.meta as any).env[`VITE_${name}`]) return (import.meta as any).env[`VITE_${name}`];
  // Fallback para nomes alternativos
  if (name === 'SUPABASE_ANON_KEY') {
    return getEnv('SUPABASE_KEY');
  }
  return undefined;
};

// URL fornecida pelo usuário como padrão se não houver variável de ambiente
const HARDCODED_URL = 'https://kkkrfnrluavvrcjtbrmz.supabase.co';

const supabaseUrl = getEnv('SUPABASE_URL') || HARDCODED_URL;
const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');

// Validação se as chaves são reais e não placeholders
const isValidConfig = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('xyz.supabase.co')
);

export const supabase = createClient(
  isValidConfig ? supabaseUrl : HARDCODED_URL,
  isValidConfig ? supabaseAnonKey! : 'dummy-key'
);

export const isSupabaseConfigured = isValidConfig;

export type ConnectionStatus = {
  configured: boolean;
  connected: boolean;
  tablesExist: boolean;
  details?: {
    urlFound: boolean;
    keyFound: boolean;
  };
  error?: string;
};

export const checkSupabaseConnection = async (): Promise<ConnectionStatus> => {
  const status: ConnectionStatus = {
    configured: isValidConfig,
    connected: false,
    tablesExist: false,
    details: {
      urlFound: !!supabaseUrl,
      keyFound: !!supabaseAnonKey
    }
  };

  if (!isValidConfig) return status;
  
  try {
    const { error } = await supabase.from('products').select('id').limit(1);
    
    if (!error) {
      status.connected = true;
      status.tablesExist = true;
      return status;
    }
    
    status.connected = true; // Se respondeu erro de tabela, o servidor está alcançável
    
    // Erros de tabela inexistente (42P01 ou PGRST116)
    if (error.code === 'PGRST116' || error.code === '42P01' || error.message.includes('relation "products" does not exist')) {
      status.tablesExist = false;
    } else {
      status.connected = false;
      status.error = error.message;
    }

    return status;
  } catch (e: any) {
    status.connected = false;
    status.error = e.message;
    return status;
  }
};
