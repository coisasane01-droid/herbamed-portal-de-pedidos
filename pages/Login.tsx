
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck, User as UserIcon, Eye, EyeOff, UserCheck, KeyRound, AlertCircle } from 'lucide-react';
import { SiteSettings, User } from '../types';
import { supabase } from '../lib/supabase';

interface LoginProps {
  setUser: (user: User) => void;
  addUser?: (user: User) => void;
  settings: SiteSettings;
}

export const Login: React.FC<LoginProps> = ({ setUser, addUser, settings }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [recoveryMethod, setRecoveryMethod] = useState<'current' | 'email'>('email');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Estados dos Campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contato, setContato] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');

  const handleCnpjMask = (val: string) => {
    const raw = val.replace(/\D/g, '');
    return raw.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const handlePhoneMask = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 10) return raw.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return raw.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Se logou, buscamos os dados extras do usuário (ou usamos o que temos no metadata)
        const userObj: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || 'Usuário',
          email: data.user.email!,
          cnpj: data.user.user_metadata?.cnpj || '',
          razaoSocial: data.user.user_metadata?.razao_social || 'Empresa Parceira',
          contato: data.user.user_metadata?.phone || '',
        };
        
        setUser(userObj);
        navigate('/');

      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nomeResponsavel,
              cnpj: cnpj,
              razao_social: razaoSocial,
              phone: contato,
            }
          }
        });

        if (error) throw error;
        
        alert("Cadastro realizado! Verifique seu e-mail para confirmar a conta antes de entrar.");
        setMode('login');

      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#/login`,
        });

        if (error) throw error;
        alert("Link de recuperação enviado para " + email);
        setMode('login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setErrorMsg(null);
    if (mode === 'forgot') setMode('login');
    else setMode(mode === 'login' ? 'register' : 'login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border border-gray-100 p-10 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-emerald-50 rounded-2xl mb-4 shadow-inner">
            {mode === 'login' ? (
              <UserIcon className="h-10 w-10 text-emerald-600" style={{ color: settings.primaryColor }} />
            ) : mode === 'register' ? (
              <UserCheck className="h-10 w-10 text-emerald-600" style={{ color: settings.primaryColor }} />
            ) : (
              <KeyRound className="h-10 w-10 text-emerald-600" style={{ color: settings.primaryColor }} />
            )}
          </div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
            {mode === 'login' ? 'Acesso do Cliente' : mode === 'register' ? 'Novo Cadastro' : 'Trocar Senha'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            {mode === 'login' ? 'Faça login para acompanhar seus pedidos.' : mode === 'register' ? 'Preencha os dados da sua empresa abaixo.' : 'Informe seu e-mail para receber o link.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-[11px] font-black uppercase tracking-tight">{errorMsg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">E-mail Corporativo</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input 
                  required
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none transition-all font-bold shadow-sm"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="grid grid-cols-1 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Razão Social</label>
                   <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm border-2 border-transparent focus:border-emerald-500 outline-none" value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">CNPJ</label>
                   <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm border-2 border-transparent focus:border-emerald-500 outline-none" value={cnpj} onChange={e => setCnpj(handleCnpjMask(e.target.value))} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">Responsável Comercial</label>
                   <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm border-2 border-transparent focus:border-emerald-500 outline-none" value={nomeResponsavel} onChange={e => setNomeResponsavel(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 tracking-widest">WhatsApp</label>
                   <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm border-2 border-transparent focus:border-emerald-500 outline-none" value={contato} onChange={e => setContato(handlePhoneMask(e.target.value))} />
                 </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input required type={showPassword ? "text" : "password"} className="w-full pl-12 pr-14 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none transition-all font-bold shadow-sm shadow-inner" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors p-2">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
              </div>
            )}
          </div>

          <button disabled={loading} className="w-full py-5 rounded-2xl text-white font-black uppercase text-sm tracking-widest shadow-xl transition-all flex items-center justify-center space-x-3 active:scale-95" style={{ backgroundColor: settings.primaryColor }}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><span>{mode === 'login' ? 'Entrar' : mode === 'register' ? 'Finalizar Cadastro' : 'Enviar Link'}</span> <ArrowRight className="h-5 w-5" /></>}
          </button>
        </form>

        <div className="mt-6 text-center space-y-4">
          <button type="button" onClick={() => { if(mode === 'forgot') setMode('login'); else setMode('forgot'); }} className="block w-full text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">
            {mode === 'forgot' ? 'Voltar ao Login' : 'Esqueci minha senha / Recuperar'}
          </button>
          
          {mode !== 'forgot' && (
            <button onClick={toggleMode} className="text-[11px] font-black text-emerald-600 uppercase tracking-widest hover:underline" style={{ color: settings.primaryColor }}>
              {mode === 'login' ? 'Ainda não tem cadastro ? Cadastre-se aqui !' : 'Já possui conta? Faça Login'}
            </button>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-100 flex items-center justify-center space-x-3 opacity-60">
          <ShieldCheck className="h-5 w-5 text-gray-300" />
          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Plataforma segura portal de pedidos</span>
        </div>
      </div>
    </div>
  );
};
