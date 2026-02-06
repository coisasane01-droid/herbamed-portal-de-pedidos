import React, { useState, useEffect } from 'react';
import { ShoppingCart, User as UserIcon, Leaf, Menu, X, Settings, Home, Search, ShoppingBag, ChevronRight, Lock, MessageCircle, LogOut, Package, ShieldCheck, ChevronRight as ChevronRightIcon, KeyRound, Mail, ShieldAlert, Loader2, CheckCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SiteSettings, CartItem, User } from '../types';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  settings: SiteSettings;
  cartCount: number;
  cart: CartItem[];
  user: User | null;
  setUser: (user: User | null) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, settings, cartCount, cart, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'current' | 'email'>('current');
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState({ old: '', new: '', confirm: '', email: user?.email || '' });
  
  const location = useLocation();
  const navigate = useNavigate();

  const isHome = location.pathname === '/';
  const isCart = location.pathname === '/carrinho';
  const isAdmin = location.pathname.startsWith('/admin');
  const isCheckout = location.pathname === '/checkout';
  
  const useDarkTheme = isAdmin && settings.themeMode === 'dark';
  const [activeIndex, setActiveIndex] = useState(1);

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  useEffect(() => {
    if (isCart) {
      setActiveIndex(2);
    } else if (isHome) {
      const state = location.state as { focusSearch?: boolean };
      setActiveIndex(state?.focusSearch ? 0 : 1);
    }
  }, [location, isHome, isCart]);

  const handleSearchClick = () => {
    window.dispatchEvent(new Event('trigger-catalog-search'));
    if (!isHome) {
      navigate('/', { state: { focusSearch: true } });
    } else {
      window.dispatchEvent(new CustomEvent('trigger-catalog-search'));
      setActiveIndex(0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsMenuOpen(false);
    navigate('/');
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (recoveryMethod === 'current') {
        if (passData.new !== passData.confirm) {
          alert("A nova senha e a confirmação não coincidem.");
          setLoading(false);
          return;
        }
        
        const { error } = await supabase.auth.updateUser({ 
          password: passData.new 
        });

        if (error) throw error;
        alert("Senha atualizada com sucesso!");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(passData.email, {
          redirectTo: `${window.location.origin}/#/login`,
        });

        if (error) throw error;
        alert(`Um link de recuperação foi enviado para o e-mail: ${passData.email}`);
      }
      
      setIsPassModalOpen(false);
      setPassData({ ...passData, old: '', new: '', confirm: '' });
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.length >= 11) {
      return `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
    }
    return phone;
  };

  const footerTextStyle = { color: settings.footerTextColor || '#ffffff' };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${useDarkTheme ? 'dark-theme bg-gray-900' : 'bg-gray-50'}`}>
      
      {/* MODAL TROCAR SENHA */}
      {isPassModalOpen && (
        <div className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setIsPassModalOpen(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Trocar Senha</h3>
              </div>
              <button onClick={() => setIsPassModalOpen(false)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handlePassSubmit} className="p-8 space-y-6">
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                <button type="button" onClick={() => setRecoveryMethod('current')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'current' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Senha Atual</button>
                <button type="button" onClick={() => setRecoveryMethod('email')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'email' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Código E-mail</button>
              </div>

              {recoveryMethod === 'current' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Nova Senha</label>
                    <input required type="password" placeholder="Nova senha segura" className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={passData.new} onChange={e => setPassData({...passData, new: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">Confirmar Nova</label>
                    <input required type="password" placeholder="Repita a nova senha" className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={passData.confirm} onChange={e => setPassData({...passData, confirm: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
                      <Mail className="h-5 w-5 text-emerald-600 mt-0.5" />
                      <p className="text-[11px] font-medium text-emerald-800 leading-relaxed italic">
                        Enviaremos um link de recuperação para o e-mail cadastrado abaixo para validar sua identidade com segurança.
                      </p>
                   </div>
                   <div>
                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2 ml-1">E-mail Cadastrado</label>
                    <input required type="email" placeholder="seu@email.com" className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={passData.email} onChange={e => setPassData({...passData, email: e.target.value})} />
                  </div>
                </div>
              )}

              <button disabled={loading} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (recoveryMethod === 'current' ? 'Atualizar Senha' : 'Enviar Link')}
              </button>
            </form>
          </div>
        </div>
      )}

      <nav className={`border-b sticky top-0 z-50 ${useDarkTheme ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link to="/" onClick={() => setActiveIndex(1)} className="flex items-center space-x-2">
                {settings.brandLogoUrl ? (
                  <img src={settings.brandLogoUrl} alt={settings.brandName} className="h-9 w-auto object-contain" style={useDarkTheme ? { filter: 'brightness(0) invert(1)' } : {}} />
                ) : (
                  <>
                    <Leaf className="h-7 w-7" style={{ color: settings.primaryColor }} />
                    <span className="text-xl font-black tracking-tighter uppercase">{settings.brandName}</span>
                  </>
                )}
              </Link>
              {isAdmin && (
                <div className="hidden sm:flex items-center bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 animate-in fade-in zoom-in">
                  <ShieldCheck className="h-3 w-3 mr-1.5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Painel Gestor</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {!isAdmin && (
                <>
                  {user ? (
                    <Link to="/meus-pedidos" className="hidden md:flex items-center space-x-2 text-[10px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest">
                      <Package className="h-4 w-4" />
                      <span>Pedidos</span>
                    </Link>
                  ) : (
                    <Link to="/login" className="hidden md:flex items-center space-x-2 text-[10px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest">
                      <UserIcon className="h-4 w-4" />
                      <span>Entrar</span>
                    </Link>
                  )}
                </>
              )}
              
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`p-2 rounded-full transition-colors ${useDarkTheme ? 'text-white hover:bg-gray-700' : 'text-gray-800 hover:bg-gray-100'}`}
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsMenuOpen(false)}>
            <div className={`absolute right-0 top-0 h-full w-72 shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-500 ${useDarkTheme ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10">
                <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">Portal de Pedidos</span>
                <button onClick={() => setIsMenuOpen(false)} className={`p-2 rounded-full transition-colors ${useDarkTheme ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto space-y-2 no-scrollbar pb-24">
                {user && (
                  <div className={`mb-6 p-5 rounded-[24px] border ${useDarkTheme ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Empresa Parceira</p>
                    <p className="font-bold truncate text-sm">{user.razaoSocial}</p>
                  </div>
                )}

                <Link to="/" onClick={() => { setIsMenuOpen(false); setActiveIndex(1); }} className={`flex items-center space-x-4 p-4 rounded-2xl font-bold transition-all ${useDarkTheme ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                  <Home className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Catálogo</span>
                </Link>

                <a href={`https://wa.me/${settings.contactWhatsapp}`} target="_blank" rel="noopener noreferrer" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-4 p-4 rounded-2xl font-bold transition-all ${useDarkTheme ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                  <MessageCircle className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Suporte Online</span>
                </a>

                {!user && (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center space-x-4 p-4 rounded-2xl font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 transition-all">
                    <UserIcon className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">LOGIN CLIENTE</span>
                  </Link>
                )}

                <div className="py-4">
                  <hr className={`${useDarkTheme ? 'border-gray-700' : 'border-gray-100'}`} />
                </div>

                <Link to="/admin" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-4 p-4 rounded-2xl font-bold transition-all ${useDarkTheme ? 'hover:bg-gray-700 text-emerald-400' : 'hover:bg-emerald-50 text-emerald-600'}`}>
                  <ShieldCheck className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Painel Admin</span>
                </Link>

                {user && (
                  <div className="space-y-2 pt-2">
                    <Link to="/meus-pedidos" onClick={() => setIsMenuOpen(false)} className={`flex items-center space-x-4 p-4 rounded-2xl font-bold transition-all ${useDarkTheme ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                      <Package className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Meus Pedidos</span>
                    </Link>
                    
                    <button onClick={() => { setIsPassModalOpen(true); setIsMenuOpen(false); }} className={`w-full flex items-center space-x-4 p-4 rounded-2xl font-bold transition-all ${useDarkTheme ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}>
                      <KeyRound className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Trocar Senha</span>
                    </button>

                    <button onClick={handleLogout} className="w-full flex items-center space-x-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                      <LogOut className="h-6 w-6" /> <span className="uppercase text-xs tracking-widest font-black">Sair da Conta</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer 
        className="py-20 pb-44 md:pb-48 mt-auto border-t border-emerald-900/50"
        style={{ backgroundColor: settings.footerBackgroundColor || '#022c22' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <div className="flex flex-col items-center space-y-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-emerald-900/30 rounded-[32px] backdrop-blur-sm border border-emerald-800/50 shadow-inner">
                {settings.footerLogoUrl ? (
                  <img src={settings.footerLogoUrl} alt={settings.brandName} className="h-14 w-auto object-contain" />
                ) : settings.brandLogoUrl ? (
                  <img src={settings.brandLogoUrl} alt={settings.brandName} className="h-14 w-auto object-contain brightness-0 invert" />
                ) : (
                  <Leaf className="h-12 w-12 text-emerald-400" />
                )}
              </div>
              <span className="text-3xl font-black uppercase tracking-tighter" style={footerTextStyle}>{settings.brandName}</span>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-20">
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Canais de Atendimento</span>
                <a href={`mailto:${settings.contactEmail}`} className="text-sm font-bold hover:opacity-80 transition-opacity" style={footerTextStyle}>{settings.contactEmail}</a>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Suporte WhatsApp</span>
                <a 
                  href={`https://wa.me/${settings.contactWhatsapp}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm font-bold hover:opacity-80 transition-opacity"
                  style={footerTextStyle}
                >
                  {formatPhone(settings.contactWhatsapp)}
                </a>
              </div>
            </div>

            <div className="w-12 h-1 bg-emerald-800 rounded-full opacity-30"></div>

            <div className="space-y-6 max-w-3xl mx-auto">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed opacity-90" style={footerTextStyle}>
                {settings.footerCopyright}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] leading-relaxed px-4 opacity-60" style={footerTextStyle}>
                {settings.footerRestrictedText}
              </p>
            </div>

            <div className="pt-10 border-t border-emerald-900/40 w-full flex flex-col items-center space-y-2">
               <div className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.3em] opacity-40" style={footerTextStyle}>
                 <span>Sistema criado com</span>
                 <span className="text-emerald-400">{settings.creatorName || 'GENIUSCARD BRASIL'}</span>
               </div>
               <a href="tel:62993884660" className="text-[9px] font-bold tracking-widest hover:opacity-80 transition-all opacity-30" style={footerTextStyle}>
                 Contato: 62 99388-4660
               </a>
            </div>
          </div>
        </div>
      </footer>

      {!isAdmin && !isCheckout && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center">
          <div className="flex flex-col items-center w-full pointer-events-auto">
            
            {cartCount > 0 && (
              <div className="px-4 pb-4 w-full max-w-lg animate-in slide-in-from-bottom-10 duration-500">
                <button 
                  onClick={() => navigate('/carrinho')}
                  className="w-full text-white p-6 rounded-[28px] shadow-2xl flex items-center justify-between border border-white/10 active:scale-95 transition-all"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  <div className="text-left">
                    <div className="text-xl font-black tracking-tighter">R$ {cartTotal.toFixed(2)}</div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-80">{cartCount} {cartCount === 1 ? 'Produto' : 'Produtos'}</div>
                  </div>
                  <div className="flex items-center gap-2 font-black uppercase text-xs tracking-widest">
                    <span>CONCLUIR</span>
                    <ChevronRightIcon className="h-5 w-5" />
                  </div>
                </button>
              </div>
            )}

            <div className={`
              w-full h-[70px] flex justify-around items-center relative shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
              ${useDarkTheme ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-gray-100'}
            `}>
              <div 
                className="absolute top-[-25px] h-[95px] w-[110px] transition-all duration-500 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)] pointer-events-none" 
                style={{ left: `calc(${activeIndex * 33.33}% + 16.66% - 55px)` }}
              >
                <svg viewBox="0 0 110 60" className="w-full h-full">
                  <path d="M0 60 L110 60 L110 35 C95 35 85 15 55 15 C25 15 15 35 0 35 Z" fill={useDarkTheme ? '#1f2937' : 'white'} />
                </svg>
              </div>

              <button onClick={handleSearchClick} className="flex flex-col items-center justify-center flex-1 h-full z-10 relative group">
                <div className={`transition-all duration-300 ${activeIndex === 0 ? '-translate-y-6 scale-125' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeIndex === 0 ? { color: settings.primaryColor } : {}}>
                  <Search className="h-6 w-6" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest absolute bottom-3 transition-opacity duration-300 ${activeIndex === 0 ? 'opacity-100' : 'opacity-0'}`}>Buscar</span>
              </button>

              <Link to="/" onClick={() => setActiveIndex(1)} className="flex flex-col items-center justify-center flex-1 h-full z-10 relative group">
                <div className={`transition-all duration-300 ${activeIndex === 1 ? '-translate-y-6 scale-125' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeIndex === 1 ? { color: settings.primaryColor } : {}}>
                  <Home className="h-6 w-6" />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest absolute bottom-3 transition-opacity duration-300 ${activeIndex === 1 ? 'opacity-100' : 'opacity-0'}`}>Catálogo</span>
              </Link>

              <Link to="/carrinho" onClick={() => setActiveIndex(2)} className="flex flex-col items-center justify-center flex-1 h-full z-10 relative group">
                <div className={`transition-all duration-300 relative ${activeIndex === 2 ? '-translate-y-6 scale-125' : 'text-gray-400 group-hover:text-gray-600'}`} style={activeIndex === 2 ? { color: settings.primaryColor } : {}}>
                  <ShoppingBag className="h-6 w-6" />
                  {cartCount > 0 && (
                     <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                       {cartCount}
                     </span>
                  )}
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest absolute bottom-3 transition-opacity duration-300 ${activeIndex === 2 ? 'opacity-100' : 'opacity-0'}`}>Sacola</span>
              </Link>
            </div>
            
            <div className={`w-full h-[env(safe-area-inset-bottom,20px)] min-h-[15px] ${useDarkTheme ? 'bg-gray-800' : 'bg-white'} lg:hidden`}></div>
          </div>
        </div>
      )}
    </div>
  );
};