import React, { useState, useEffect, useRef } from 'react';
import { Product, SiteSettings, Order, Category, AICampaignSettings, User, PromoCategoryCard } from '../types';
import { checkSupabaseConnection, ConnectionStatus } from '../lib/supabase';
import { 
  LayoutDashboard, Package, Settings as SettingsIcon, ShoppingCart, 
  Edit2, Trash2, X, TrendingUp, Loader2, Image as ImageIcon,
  Wifi, WifiOff, RefreshCw, Plus, 
  Save, Trash, FileText, 
  Sparkles, Zap, CheckCircle, Clock,
  Facebook, Instagram, Linkedin, SaveIcon, CheckCircle as CheckCircle2,
  Gift, CalendarClock, Send, RefreshCcw, MessageCircle,
  Type, AlertCircle, Play, Smartphone, List, CreditCard, ChevronRight,
  Globe, SmartphoneNfc, Palette, Upload, ImagePlus, QrCode, Bot, Key, Link as LinkIcon,
  Lock, ShieldAlert, Trophy, UserCheck, AlertTriangle, Calendar, MapPin, MoreVertical,
  RotateCcw, History, Anchor, Star, Layers, Eraser, Eye, EyeOff, Moon, Sun, Camera, Barcode,
  Users, AlertOctagon, TrendingDown, DollarSign, Medal, AlignLeft, Activity, ClipboardList,
  StickyNote, ArrowRightLeft, ImagePlus as ImagePlusIcon, FileCheck, LockKeyhole, UnlockKeyhole,
  Share2, Video, Film, Shield, Mail, KeyRound, Award, Tags, Search as SearchIcon, ScanLine
} from 'lucide-react';

interface AdminProps {
  products: Product[];
  setProducts: (products: Product[]) => Promise<void>;
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => Promise<void>;
  orders: Order[];
  setOrders?: (orders: Order[]) => Promise<void>;
  users?: User[];
  deleteUser?: (id: string) => void;
}

interface AgendaItem {
  id: string;
  date?: string; 
  time?: string; 
  dayOfWeek?: string; 
  client: string;
  address: string;
  obs?: string; 
  type: 'visit' | 'call' | 'delivery';
  color: string;
  isFixed: boolean; 
  completed: boolean;
  archived: boolean;
}

export const Admin: React.FC<AdminProps> = ({ products, setProducts, settings, setSettings, orders, setOrders, users = [], deleteUser }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('herbamed_admin_key') || 'herbamed');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [loginMode, setLoginMode] = useState<'login' | 'forgot'>('login');
  const [recoveryMethod, setRecoveryMethod] = useState<'current' | 'email'>('current');
  const [currentPassInput, setCurrentPassInput] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders' | 'settings' | 'integrations' | 'agenda' | 'users' | 'promocards'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  
  const [creatorLocked, setCreatorLocked] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploadCallback, setUploadCallback] = useState<((url: string) => void) | null>(null);

  // Filtro de busca de produtos para os cards promocionais
  const [promoProductSearch, setPromoProductSearch] = useState('');

  // ESTADOS ADICIONADOS PARA BUSCA E SCANNER NO CATÁLOGO DE SKUS
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [isAdminScanning, setIsAdminScanning] = useState(false);
  const [adminScannerError, setAdminScannerError] = useState<string | null>(null);
  const adminScannerVideoRef = useRef<HTMLVideoElement>(null);
  const adminScannerStreamRef = useRef<MediaStream | null>(null);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(() => {
    const saved = localStorage.getItem('herbamed_admin_agenda');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeMoveMenu, setActiveMoveMenu] = useState<string | null>(null);

  const agendaConfig = [
    { id: 'Segunda', name: 'Segunda', color: '#10b981', label: 'Segunda' },
    { id: 'Terça', name: 'Terça', color: '#3b82f6', label: 'Terça' },
    { id: 'Quarta', name: 'Quarta', color: '#f59e0b', label: 'Quarta' },
    { id: 'Quinta', name: 'Quinta', color: '#f43f5e', label: 'Quinta' },
    { id: 'Sexta', name: 'Sexta', color: '#8b5cf6', label: 'Sexta' },
    { id: 'Sábado', name: 'Sábado', color: '#64748b', label: 'Sábado' }
  ];

  const getDayFromDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const map = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return map[day];
  };

  const [newAgendaItem, setNewAgendaItem] = useState<Partial<AgendaItem>>({
    date: new Date().toISOString().split('T')[0],
    dayOfWeek: 'Segunda',
    type: 'visit',
    time: '09:00',
    color: '#10b981',
    obs: '',
    isFixed: true
  });

  useEffect(() => {
    localStorage.setItem('herbamed_admin_agenda', JSON.stringify(agendaItems));
  }, [agendaItems]);

  useEffect(() => {
    if (!newAgendaItem.isFixed && newAgendaItem.date) {
      const dayName = getDayFromDate(newAgendaItem.date);
      const config = agendaConfig.find(c => dayName.includes(c.name));
      if (config) setNewAgendaItem(prev => ({ ...prev, color: config.color }));
    } else if (newAgendaItem.isFixed && newAgendaItem.dayOfWeek) {
      const config = agendaConfig.find(c => c.name === newAgendaItem.dayOfWeek);
      if (config) setNewAgendaItem(prev => ({ ...prev, color: config.color }));
    }
  }, [newAgendaItem.date, newAgendaItem.dayOfWeek, newAgendaItem.isFixed]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadCallback) {
      if (file.size > 2 * 1024 * 1024) {
        alert("O arquivo é muito grande. O limite é 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadCallback(reader.result as string);
        setUploadCallback(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        alert("Arquivo de vídeo muito grande para armazenamento local. Limite: 20MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, bannerVideoFileUrl: reader.result as string });
        if (videoInputRef.current) videoInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = (callback: (url: string) => void) => {
    setUploadCallback(() => callback);
    fileInputRef.current?.click();
  };

  // FUNÇÕES DO SCANNER DO ADMIN
  const startAdminScanner = async () => {
    setAdminScannerError(null);
    setIsAdminScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      adminScannerStreamRef.current = stream;
      if (adminScannerVideoRef.current) adminScannerVideoRef.current.srcObject = stream;
    } catch (err: any) {
      setAdminScannerError("Erro ao acessar câmera.");
      setIsAdminScanning(false);
    }
  };

  const stopAdminScanner = () => {
    if (adminScannerStreamRef.current) adminScannerStreamRef.current.getTracks().forEach(t => t.stop());
    setIsAdminScanning(false);
  };

  const handleAddAgendaItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgendaItem.client) return;
    const item: AgendaItem = {
      id: Math.random().toString(36).substr(2, 9),
      date: !newAgendaItem.isFixed ? newAgendaItem.date : undefined,
      time: !newAgendaItem.isFixed ? newAgendaItem.time : undefined,
      dayOfWeek: newAgendaItem.isFixed ? newAgendaItem.dayOfWeek : undefined,
      client: newAgendaItem.client || '',
      address: newAgendaItem.address || '',
      obs: newAgendaItem.obs || '',
      type: (newAgendaItem.type as any) || 'visit',
      color: newAgendaItem.color || '#10b981',
      isFixed: !!newAgendaItem.isFixed,
      completed: false,
      archived: false
    };
    setAgendaItems([...agendaItems, item]);
    setNewAgendaItem({ ...newAgendaItem, client: '', address: '', obs: '' });
  };

  const toggleAgendaItem = (id: string) => {
    setAgendaItems(agendaItems.map(i => i.id === id ? { ...i, completed: !i.completed } : i));
  };

  const archiveAgendaItem = (id: string) => {
    setAgendaItems(agendaItems.map(i => i.id === id ? { ...i, archived: !i.archived } : i));
  };

  const moveAgendaItem = (id: string, newDay: string) => {
    setAgendaItems(prev => prev.map(item => {
      if (item.id === id) {
        const config = agendaConfig.find(c => c.name === newDay);
        return { 
          ...item, 
          dayOfWeek: newDay,
          date: undefined, 
          isFixed: true, 
          color: config?.color || item.color 
        };
      }
      return item;
    }));
    setActiveMoveMenu(null);
  };

  const clearExtras = () => {
    if (confirm('Deseja limpar todos os agendamentos EXTRAS?')) {
      setAgendaItems(agendaItems.filter(item => item.isFixed || item.archived));
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaveStatus('saving');
    await setSettings(settings);
    setTimeout(() => setSaveStatus('saved'), 500);
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const handleUpdatePassword = () => {
    if (!newPassword.trim() || newPassword !== confirmNewPassword || newPassword.length < 4) { 
      alert("Erro na senha: Verifique se as senhas coincidem e se possuem ao menos 4 caracteres."); 
      return; 
    }
    setAdminPassword(newPassword);
    // Fix: Changed localStorage.getItem to localStorage.setItem to correctly store the new password.
    localStorage.setItem('herbamed_admin_key', newPassword);
    setNewPassword(''); setConfirmNewPassword('');
    alert("Senha de acesso administrativa atualizada!");
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'Recebido' | 'Concluído' | 'Pendente') => {
    if (!setOrders) return;
    const newList = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    await setOrders(newList);
    setViewingOrder(null);
  };

  const handleUnlockCreator = () => {
    if (!creatorLocked) { setCreatorLocked(true); return; }
    const pwd = window.prompt("Senha do Criador:");
    if (pwd === "5660") setCreatorLocked(false);
    else if (pwd !== null) alert("Senha incorreta!");
  };

  const handleAdminRecoverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setTimeout(() => {
      if (recoveryMethod === 'current') {
        if (currentPassInput === adminPassword) {
          if (!newPassword || newPassword !== confirmNewPassword) { 
            alert("Erro: Senhas não coincidem."); 
            setRecoveryLoading(false); 
            return; 
          }
          setAdminPassword(newPassword);
          localStorage.setItem('herbamed_admin_key', newPassword);
          alert("Senha alterada com sucesso!"); 
          setLoginMode('login');
        } else { 
          alert("Senha atual incorreta."); 
        }
      } else { 
        alert("Código de segurança administrativo enviado para o e-mail cadastrado!"); 
        setLoginMode('login'); 
      }
      setRecoveryLoading(false);
    }, 1500);
  };

  const aiCampaigns = settings.aiCampaigns || {
    whatsappStatus: 'disconnected',
    whatsappApiKey: '',
    whatsappApiUrl: '',
    isActiveBirthday: false,
    birthdayPrompt: 'Um banner festivo de aniversário with suplementos naturais.',
    birthdayTemplate: 'Olá {{nome}}, a Herbamed deseja um feliz aniversário!',
    birthdayImage: '',
    isActiveInactive: false,
    inactiveDays: 7,
    inactivePrompt: 'Um design minimalista mostrando uma sacola Herbamed vazia.',
    inactiveTemplate: 'Sentimos sua falta, {{nome}}!',
    inactiveImage: '',
    isActiveMass: false,
    massMessageTemplate: 'Confira as novidades da semana na Herbamed!',
    massMessageImage: ''
  };

  const updateAiCampaigns = (update: Partial<AICampaignSettings>) => {
    setSettings({
      ...settings,
      aiCampaigns: { ...aiCampaigns, ...update }
    });
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'products', label: 'Catálogo SKUs', icon: Package },
    { id: 'promocards', label: 'Cards Promo', icon: Tags }, // NOVO ITEM ADICIONAL
    { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
    { id: 'users', label: 'Clientes', icon: Users },
    { id: 'integrations', label: 'IA & Marketing', icon: Zap },
    { id: 'settings', label: 'Ajustes Portal', icon: SettingsIcon },
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-[45px] shadow-2xl p-12 border border-gray-100 text-center animate-in zoom-in duration-500">
           <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-inner">
             <div className="p-3 bg-white rounded-2xl shadow-sm border border-emerald-100">
               {loginMode === 'login' ? <Lock className="h-8 w-8 text-emerald-600" /> : <KeyRound className="h-8 w-8 text-emerald-600" />}
             </div>
           </div>

           <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tighter uppercase">{loginMode === 'login' ? 'ADM' : 'Trocar Senha'}</h2>
           
           {loginMode === 'login' ? (
             <form onSubmit={(e) => { e.preventDefault(); if (authPassword === adminPassword) setIsAuthenticated(true); else setAuthError(true); }} className="space-y-6">
               <div className="relative">
                 <input 
                   autoFocus 
                   type={showAuthPassword ? "text" : "password"} 
                   className={`w-full py-5 px-8 bg-gray-50 rounded-3xl border-2 outline-none font-black text-center tracking-[0.6em] text-lg transition-all ${authError ? 'border-red-400' : 'border-transparent focus:border-emerald-500'}`} 
                   placeholder="SENHA" 
                   value={authPassword} 
                   onChange={e => { setAuthPassword(e.target.value); setAuthError(false); }} 
                 />
                 <button type="button" onClick={() => setShowAuthPassword(!showAuthPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-500 transition-colors p-2">
                   {showAuthPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                 </button>
               </div>
               {authError && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest">Senha Incorreta</div>}
               <button className="w-full bg-[#111827] text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95">Desbloquear</button>
             </form>
           ) : (
             <form onSubmit={handleAdminRecoverySubmit} className="space-y-6">
                <div className="flex bg-gray-100 p-1 rounded-2xl mb-4">
                  <button type="button" onClick={() => setRecoveryMethod('current')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'current' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Senha Atual</button>
                  <button type="button" onClick={() => setRecoveryMethod('email')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${recoveryMethod === 'email' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}>Código E-mail</button>
                </div>
                {recoveryMethod === 'current' ? (
                  <div className="space-y-4">
                    <input required type="password" placeholder="SENHA ATUAL" className="w-full py-4 px-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center text-xs tracking-widest" value={currentPassInput} onChange={e => setCurrentPassInput(e.target.value)} />
                    <input required type="password" placeholder="NOVA SENHA" className="w-full py-4 px-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center text-xs tracking-widest" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <input required type="password" placeholder="CONFIRMAR" className="w-full py-4 px-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center text-xs tracking-widest" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
                  </div>
                ) : (
                  <input required type="email" placeholder="E-MAIL ADMINISTRADOR" className="w-full py-4 px-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center text-xs tracking-widest" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} />
                )}
                <button disabled={recoveryLoading} className="w-full bg-[#111827] text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95">
                  {recoveryLoading ? 'AGUARDE...' : 'ATUALIZAR'}
                </button>
             </form>
           )}

           <button type="button" onClick={() => setLoginMode(loginMode === 'login' ? 'forgot' : 'login')} className="mt-8 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">
             {loginMode === 'login' ? 'Esqueci minha senha / Trocar senha' : 'Voltar ao Login'}
           </button>
        </div>
      </div>
    );
  }

  // Dashboard calculations
  const totalRevenue = orders.reduce((acc, o) => acc + o.total, 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const activeClientsCount = new Set(orders.map(o => o.customer.cnpj)).size;

  const clientRanking = orders.reduce((acc: any, order) => {
    const cnpj = order.customer.cnpj;
    if (!acc[cnpj]) acc[cnpj] = { name: order.customer.razaoSocial, total: 0 };
    acc[cnpj].total += order.total;
    return acc;
  }, {});
  const topClients = Object.values(clientRanking)
    .sort((a: any, b: any) => b.total - a.total)
    .slice(0, 3);

  const skuRanking = orders.reduce((acc: any, order) => {
    order.items.forEach(item => {
      const id = item.product.id;
      if (!acc[id]) acc[id] = { name: item.product.name, qty: 0 };
      acc[id].qty += item.quantity;
    });
    return acc;
  }, {});
  const topSkus = Object.values(skuRanking)
    .sort((a: any, b: any) => b.qty - a.qty)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 pb-32">
      <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleImageUpload} />
      <input type="file" accept="video/mp4,video/webm" ref={videoInputRef} className="hidden" onChange={handleVideoUpload} />

      {/* OVERLAY DO SCANNER PARA ADMIN */}
      {isAdminScanning && (
        <div className="fixed inset-0 z-[700] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-[40px] overflow-hidden shadow-2xl border-4 border-emerald-500/30">
            <video ref={adminScannerVideoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline />
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500 rounded-[40px] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-scan-line shadow-[0_0_15px_#10b981]" />
            </div>
            <button onClick={stopAdminScanner} className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-8 text-white font-black uppercase text-xs tracking-[0.2em] animate-pulse">Escaneando SKU...</p>
          <style>{`
            @keyframes scan-line { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
            .animate-scan-line { animation: scan-line 3s ease-in-out infinite; }
          `}</style>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-4 sticky top-24">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center space-x-3 px-5 py-4 rounded-2xl font-bold text-sm transition-all ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : 'text-gray-400'}`} /><span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="mt-8 pt-6 border-t border-gray-100 px-4"><button onClick={() => setIsAuthenticated(false)} className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-colors">Bloquear</button></div>
          </div>
        </div>

        <div className="flex-grow min-w-0">
          {activeTab === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-500">
               <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Visão Executiva</h3>
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado</span>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Faturamento</span><p className="text-2xl font-black text-gray-900 mt-1">R$ {totalRevenue.toFixed(2)}</p></div>
                 <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Pedidos</span><p className="text-2xl font-black text-gray-900 mt-1">{totalOrders}</p></div>
                 <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-purple-500 uppercase tracking-widest">Ticket Médio</span><p className="text-2xl font-black text-gray-900 mt-1">R$ {avgTicket.toFixed(2)}</p></div>
                 <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm"><span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Clientes Ativos</span><p className="text-2xl font-black text-gray-900 mt-1">{activeClientsCount}</p></div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white p-6 md:p-10 rounded-[48px] border border-gray-100 shadow-sm flex flex-col space-y-8">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-50 rounded-[24px] flex items-center justify-center text-amber-500 shadow-inner">
                           <Trophy className="h-8 w-8" />
                        </div>
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">TOP CLIENTES</h4>
                     </div>
                     <div className="space-y-4">
                        {topClients.length > 0 ? topClients.map((c: any, i) => (
                           <div key={i} className="flex justify-between items-center p-5 bg-gray-50 rounded-[24px] border border-gray-100 shadow-inner group hover:bg-white hover:shadow-lg transition-all gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                 <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs text-amber-600 shadow-sm border border-amber-50 shrink-0">{i + 1}º</span>
                                 <span className="font-bold text-gray-700 text-sm truncate">{c.name}</span>
                              </div>
                              <span className="font-black text-amber-600 text-sm shrink-0">R$ {c.total.toFixed(2)}</span>
                           </div>
                        )) : (
                           <p className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest italic">Aguardando pedidos...</p>
                        )}
                     </div>
                  </div>

                  <div className="bg-white p-6 md:p-10 rounded-[48px] border border-gray-100 shadow-sm flex flex-col space-y-8">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-emerald-50 rounded-[24px] flex items-center justify-center text-emerald-500 shadow-inner">
                           <Award className="h-8 w-8" />
                        </div>
                        <h4 className="text-lg font-black text-gray-900 uppercase tracking-tighter">TOP SKUS</h4>
                     </div>
                     <div className="space-y-4">
                        {topSkus.length > 0 ? topSkus.map((s: any, i) => (
                           <div key={i} className="flex justify-between items-center p-5 bg-gray-50 rounded-[24px] border border-gray-100 shadow-inner group hover:bg-white hover:shadow-lg transition-all gap-4">
                              <div className="flex items-center gap-4 min-w-0">
                                 <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-xs text-emerald-600 shadow-sm border border-amber-50 shrink-0">{i + 1}º</span>
                                 <span className="font-bold text-gray-700 text-sm truncate">{s.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                 <span className="hidden sm:inline text-[10px] font-black text-gray-400 uppercase">Vendidos:</span>
                                 <span className="font-black text-emerald-600 text-sm">{s.qty}x</span>
                              </div>
                           </div>
                        )) : (
                           <p className="text-center py-10 text-gray-400 font-bold text-xs uppercase tracking-widest italic">Aguardando pedidos...</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'promocards' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
               <div className="flex justify-between items-center gap-4 mb-8">
                <div><h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Cards Promo</h3><p className="text-gray-500 font-medium">Gerencie o carrossel de categorias promocionais.</p></div>
                <button 
                  onClick={() => setSettings({...settings, promoCategoryCards: [...(settings.promoCategoryCards || []), { id: Math.random().toString(36).substr(2, 9), title: '', imageUrl: '', categories: [], productIds: [], position: 'top', isActive: true }]})}
                  className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3"
                >
                   <Plus className="h-5 w-5" /> Novo Card
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {(settings.promoCategoryCards || []).map((card, idx) => (
                    <div key={card.id} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6 group relative">
                       <button 
                        onClick={() => {
                          const n = [...(settings.promoCategoryCards || [])];
                          n.splice(idx, 1);
                          setSettings({...settings, promoCategoryCards: n});
                        }}
                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                       >
                          <Trash2 className="h-4 w-4" />
                       </button>

                       <div className="flex items-center justify-between mb-4">
                          <h5 className="font-black uppercase text-[10px] text-gray-400 tracking-widest">Configuração do Card #{idx + 1}</h5>
                          <button 
                            onClick={() => {
                              const n = [...(settings.promoCategoryCards || [])];
                              n[idx].isActive = !n[idx].isActive;
                              setSettings({...settings, promoCategoryCards: n});
                            }}
                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${card.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}
                          >
                            {card.isActive ? 'Ativo' : 'Inativo'}
                          </button>
                       </div>

                       <div className="space-y-4">
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Título do Card</label>
                             <input 
                               type="text" 
                               className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-inner outline-none focus:border-emerald-500 border-2 border-transparent transition-all"
                               value={card.title}
                               onChange={e => {
                                 const n = [...(settings.promoCategoryCards || [])];
                                 n[idx].title = e.target.value;
                                 setSettings({...settings, promoCategoryCards: n});
                               }}
                             />
                          </div>

                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Imagem Banner (21:7)</label>
                             <div className="relative group">
                                <input 
                                  type="text" 
                                  className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-inner outline-none focus:border-emerald-500 border-2 border-transparent transition-all"
                                  value={card.imageUrl}
                                  onChange={e => {
                                    const n = [...(settings.promoCategoryCards || [])];
                                    n[idx].imageUrl = e.target.value;
                                    setSettings({...settings, promoCategoryCards: n});
                                  }}
                                />
                                <button onClick={() => triggerUpload(url => {
                                  const n = [...(settings.promoCategoryCards || [])];
                                  n[idx].imageUrl = url;
                                  setSettings({...settings, promoCategoryCards: n});
                                })} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl">
                                   <Camera className="h-4 w-4" />
                                </button>
                             </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Posição na Home</label>
                                <select 
                                  className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs"
                                  value={card.position}
                                  onChange={e => {
                                    const n = [...(settings.promoCategoryCards || [])];
                                    n[idx].position = e.target.value as any;
                                    setSettings({...settings, promoCategoryCards: n});
                                  }}
                                >
                                   <option value="top">Topo da Página</option>
                                   <option value="middle">Meio (Entre SKUs)</option>
                                   <option value="bottom">Final da Página</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Filtro por Categorias</label>
                                <div className="space-y-2">
                                   {/* Filtro 1 */}
                                   <select 
                                     className="w-full p-3 bg-gray-50 rounded-xl font-bold text-[10px] uppercase"
                                     value={card.categories[0] || ''}
                                     onChange={e => {
                                       const n = [...(settings.promoCategoryCards || [])];
                                       const cats = [...(n[idx].categories || [])];
                                       cats[0] = e.target.value;
                                       n[idx].categories = cats.filter(c => !!c);
                                       setSettings({...settings, promoCategoryCards: n});
                                     }}
                                   >
                                      <option value="">Selecione Categoria 1</option>
                                      {settings.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                   </select>
                                   {/* Filtro 2 */}
                                   <select 
                                     className="w-full p-3 bg-gray-50 rounded-xl font-bold text-[10px] uppercase"
                                     value={card.categories[1] || ''}
                                     onChange={e => {
                                       const n = [...(settings.promoCategoryCards || [])];
                                       const cats = [...(n[idx].categories || [])];
                                       cats[1] = e.target.value;
                                       n[idx].categories = cats.filter(c => !!c);
                                       setSettings({...settings, promoCategoryCards: n});
                                     }}
                                   >
                                      <option value="">Selecione Categoria 2 (Opcional)</option>
                                      {settings.categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                   </select>
                                </div>
                             </div>
                          </div>

                          <div className="pt-4">
                             <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                                <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Produtos Específicos (Prioridade)</label>
                                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
                                   <SearchIcon className="h-3 w-3 text-gray-400" />
                                   <input 
                                      type="text" 
                                      placeholder="Filtrar produtos..." 
                                      className="bg-transparent border-none outline-none text-[9px] font-bold w-24"
                                      value={promoProductSearch}
                                      onChange={e => setPromoProductSearch(e.target.value)}
                                   />
                                </div>
                             </div>
                             
                             <div className="max-h-48 overflow-y-auto no-scrollbar grid grid-cols-1 gap-1 p-2 bg-gray-50 rounded-2xl border border-gray-100 shadow-inner">
                                {products
                                  .filter(p => p.name.toLowerCase().includes(promoProductSearch.toLowerCase()) || p.code.toLowerCase().includes(promoProductSearch.toLowerCase()))
                                  .map(product => {
                                   const isSelected = (card.productIds || []).includes(product.id);
                                   return (
                                      <label key={product.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-white border border-transparent'}`}>
                                         <input 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            checked={isSelected}
                                            onChange={() => {
                                               const n = [...(settings.promoCategoryCards || [])];
                                               const currentIds = n[idx].productIds || [];
                                               if (isSelected) {
                                                  n[idx].productIds = currentIds.filter(id => id !== product.id);
                                               } else {
                                                  n[idx].productIds = [...currentIds, product.id];
                                               }
                                               setSettings({...settings, promoCategoryCards: n});
                                            }}
                                         />
                                         <div className="flex items-center gap-2">
                                            <img src={product.image} className="w-6 h-6 rounded object-contain bg-white" />
                                            <div className="flex flex-col">
                                               <span className="text-[10px] font-bold text-gray-700 leading-none">{product.name}</span>
                                               <span className="text-[8px] font-black text-emerald-600 uppercase mt-0.5">{product.code}</span>
                                            </div>
                                         </div>
                                      </label>
                                   );
                                })}
                             </div>
                             <p className="text-[8px] font-bold text-gray-400 mt-2 italic px-1">* Se houver produtos selecionados, o filtro de categorias será ignorado para este card.</p>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 {(settings.promoCategoryCards || []).length === 0 && (
                    <div className="col-span-full py-20 bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                       <Tags className="h-12 w-12 text-gray-200 mb-4" />
                       <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Nenhum card promocional criado.</p>
                       <button 
                        onClick={() => setSettings({...settings, promoCategoryCards: [{ id: Math.random().toString(36).substr(2, 9), title: 'Nova Promoção', imageUrl: '', categories: [], productIds: [], position: 'top', isActive: true }]})}
                        className="mt-6 text-emerald-600 font-black text-[10px] uppercase underline underline-offset-4"
                       >
                          Começar Agora
                       </button>
                    </div>
                 )}
              </div>

              <div className="flex justify-end pt-10">
                 <button 
                  onClick={() => handleSaveSettings()} 
                  disabled={saveStatus === 'saving'}
                  className="bg-emerald-600 text-white px-12 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-4 transition-all hover:scale-105"
                 >
                   {saveStatus === 'saving' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                   {saveStatus === 'saving' ? 'Salvando...' : 'Publicar Alterações'}
                 </button>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
              <div className="flex justify-between items-center gap-4 mb-8">
                <div><h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Ajustes Portal</h3><p className="text-gray-500 font-medium">Gestão de identidade, logos e banners.</p></div>
                <button onClick={() => handleSaveSettings()} disabled={saveStatus === 'saving'} className="bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all">{saveStatus === 'saving' ? 'Salvando...' : 'Salvar Tudo'}</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-[#1a202c] p-8 rounded-[40px] border border-white/5 shadow-2xl space-y-6 lg:col-span-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-6">
                    <h4 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">CATEGORIAS DO CATÁLOGO</h4>
                    <button 
                      onClick={() => setSettings({...settings, categories: [...settings.categories, { id: Math.random().toString(36).substr(2, 9), name: '', image: '', bannerImage: '' }]})}
                      className="text-emerald-500 text-[11px] font-black uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Nova
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settings.categories.map((cat, idx) => (
                      <div key={cat.id} className="bg-[#111827]/40 p-5 rounded-[32px] border border-white/5 flex flex-col gap-4 relative group transition-all hover:bg-[#111827]/60">
                        <button 
                          onClick={() => setSettings({...settings, categories: settings.categories.filter((_, i) => i !== idx)})}
                          className="absolute -top-1.5 -right-1.5 p-1.5 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-lg z-10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        
                        <div className="flex items-center gap-5">
                          <div className="w-16 h-16 bg-slate-800/80 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border border-white/5 shadow-inner">
                            {cat.image ? (
                              <img src={cat.image} className="w-full h-full object-cover" alt={cat.name} />
                            ) : (
                              <ImageIcon className="h-6 w-6 text-white/10" />
                            )}
                          </div>
                          <div className="flex-grow">
                             <input 
                               type="text" 
                               placeholder="Nome da Categoria"
                               className="w-full bg-[#111827]/40 border-none rounded-xl px-4 py-3 text-white font-bold text-xs outline-none focus:ring-1 focus:ring-emerald-500/50 placeholder:text-white/20"
                               value={cat.name}
                               onChange={e => {
                                 const n = [...settings.categories];
                                 n[idx].name = e.target.value;
                                 setSettings({...settings, categories: n});
                               }}
                             />
                          </div>
                        </div>

                        <div className="space-y-3">
                           <div>
                              <label className="block text-[8px] font-black text-white/20 uppercase mb-1 ml-1">Ícone Redondo</label>
                              <div className="relative flex items-center gap-2">
                                <div className="relative flex-grow">
                                   <input 
                                     type="text" 
                                     placeholder="URL Ícone..."
                                     className="w-full bg-[#111827]/40 border-none rounded-xl px-4 py-2 text-white/30 text-[9px] outline-none placeholder:text-white/10"
                                     value={cat.image}
                                     onChange={e => {
                                       const n = [...settings.categories];
                                       /* Fixed: url was not defined, should be e.target.value */
                                       n[idx].image = e.target.value;
                                       setSettings({...settings, categories: n});
                                     }}
                                   />
                                </div>
                                <button 
                                   onClick={() => triggerUpload(url => {
                                     const n = [...settings.categories];
                                     n[idx].image = url;
                                     setSettings({...settings, categories: n});
                                   })}
                                   className="p-2.5 bg-slate-800 rounded-xl text-white/40 hover:text-emerald-500 transition-colors border border-white/5"
                                 >
                                   <Camera className="h-4 w-4" />
                                 </button>
                              </div>
                           </div>
                           
                           <div>
                              <label className="block text-[8px] font-black text-white/20 uppercase mb-1 ml-1">Banner Separador (Horizontal)</label>
                              <div className="relative flex items-center gap-2">
                                <div className="relative flex-grow">
                                   <input 
                                     type="text" 
                                     placeholder="URL Banner Separador..."
                                     className="w-full bg-[#111827]/40 border-none rounded-xl px-4 py-2 text-white/30 text-[9px] outline-none placeholder:text-white/10"
                                     value={cat.bannerImage || ''}
                                     onChange={e => {
                                       const n = [...settings.categories];
                                       n[idx].bannerImage = e.target.value;
                                       setSettings({...settings, categories: n});
                                     }}
                                   />
                                </div>
                                <button 
                                   onClick={() => triggerUpload(url => {
                                     const n = [...settings.categories];
                                     n[idx].bannerImage = url;
                                     setSettings({...settings, categories: n});
                                   })}
                                   className="p-2.5 bg-slate-800 rounded-xl text-white/40 hover:text-blue-500 transition-colors border border-white/5"
                                 >
                                   <ImagePlusIcon className="h-4 w-4" />
                                 </button>
                              </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><Palette className="h-4 w-4" /> Identidade & Branding</h4>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Nome da Marca</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={settings.brandName} onChange={e => setSettings({...settings, brandName: e.target.value})} /></div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Formato Nomes Categoria</label>
                    <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={settings.categoryTitleCase || 'uppercase'} onChange={e => setSettings({...settings, categoryTitleCase: e.target.value as any})}>
                      <option value="uppercase">MAIÚSCULAS</option>
                      <option value="lowercase">minúsculas</option>
                      <option value="capitalize">Capitalizado (Inicial Maiúscula)</option>
                      <option value="normal">Normal (Como escrito)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Cor Primária</label><div className="flex items-center gap-2"><input type="color" className="w-10 h-10 rounded-lg cursor-pointer" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} /><input type="text" className="flex-grow p-3 bg-gray-50 rounded-xl font-bold text-[10px] uppercase" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} /></div></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Tema</label><button onClick={() => setSettings({...settings, themeMode: settings.themeMode === 'light' ? 'dark' : 'light'})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-[10px] uppercase flex items-center justify-between">{settings.themeMode === 'light' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-blue-400" />} {settings.themeMode}</button></div>
                  </div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Logo Principal</label><div className="relative group"><input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.brandLogoUrl} onChange={e => setSettings({...settings, brandLogoUrl: e.target.value})} /><button type="button" onClick={() => triggerUpload(url => setSettings({...settings, brandLogoUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl"><Camera className="h-4 w-4" /></button></div></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Logo Rodapé</label><div className="relative group"><input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.footerLogoUrl || ''} onChange={e => setSettings({...settings, footerLogoUrl: e.target.value})} /><button type="button" onClick={() => triggerUpload(url => setSettings({...settings, footerLogoUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl"><Camera className="h-4 w-4" /></button></div></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Favicon</label>
                      <div className="relative group">
                        <input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-inner" placeholder="URL do Favicon..." value={settings.faviconUrl || ''} onChange={e => setSettings({...settings, faviconUrl: e.target.value})} />
                        <button type="button" onClick={() => triggerUpload(url => setSettings({...settings, faviconUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg"><Upload className="h-4 w-4" /></button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Ícone PWA Site</label>
                      <div className="relative group">
                        <input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-inner" placeholder="Ícone da tela inicial..." value={settings.pwaIconUrl || ''} onChange={e => setSettings({...settings, pwaIconUrl: e.target.value})} />
                        <button type="button" onClick={() => triggerUpload(url => setSettings({...settings, pwaIconUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg"><Upload className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><Globe className="h-4 w-4" /> SEO & Compartilhamento</h4>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Título do Link</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={settings.metaTitle || ''} onChange={e => setSettings({...settings, metaTitle: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Descrição SEO</label><textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl font-medium text-xs resize-none" value={settings.metaDescription || ''} onChange={e => setSettings({...settings, metaDescription: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Imagem OG (1200x630)</label><div className="relative group"><input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.metaImageUrl || ''} onChange={e => setSettings({...settings, metaImageUrl: e.target.value})} /><button type="button" onClick={() => triggerUpload(url => setSettings({...settings, metaImageUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl"><ImageIcon className="h-4 w-4" /></button></div></div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                   <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2">
                      <SmartphoneNfc className="h-4 w-4" /> PWA ICON ADMIN (ATALHO)
                   </h4>
                   <div className="bg-gray-50/50 p-5 rounded-[32px] border border-gray-100 flex items-center gap-5">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm overflow-hidden text-gray-200">
                         {settings.adminPwaIconUrl ? (
                            <img src={settings.adminPwaIconUrl} className="w-full h-full object-cover" alt="Admin PWA Preview" />
                         ) : (
                            <ShieldAlert className="h-7 w-7" />
                         )}
                      </div>
                      <div className="flex-grow relative">
                         <input 
                            type="text" 
                            placeholder="URL ou upload ícone admin..." 
                            className="w-full bg-white border border-gray-100 rounded-2xl px-5 py-4 text-gray-700 font-bold text-xs outline-none focus:border-emerald-500 placeholder:text-gray-300 shadow-inner"
                            value={settings.adminPwaIconUrl || ''}
                            onChange={e => setSettings({...settings, adminPwaIconUrl: e.target.value})}
                         />
                         <button 
                            type="button" 
                            onClick={() => triggerUpload(url => setSettings({...settings, adminPwaIconUrl: url}))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-emerald-600 text-white rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                         >
                            <Upload className="h-4 w-4" />
                         </button>
                      </div>
                   </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2">Banners da Home</h4>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Modo</label><select className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={settings.bannerMode} onChange={e => setSettings({...settings, bannerMode: e.target.value as any})}><option value="single">Estático</option><option value="carousel">Carrossel</option><option value="video">Vídeo</option></select></div>
                  {settings.bannerMode === 'video' && (
                    <div className="space-y-4">
                      <input type="text" placeholder="YouTube URL" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.bannerVideoUrl} onChange={e => setSettings({...settings, bannerVideoUrl: e.target.value})} />
                      <button onClick={() => videoInputRef.current?.click()} className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl text-[10px] font-black uppercase text-gray-400">{settings.bannerVideoFileUrl ? 'Alterar Vídeo MP4' : 'Upload Vídeo MP4'}</button>
                    </div>
                  )}
                  {settings.bannerMode === 'single' && (
                    <div className="relative group"><input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.bannerImageUrl} onChange={e => setSettings({...settings, bannerImageUrl: e.target.value})} /><button type="button" onClick={() => triggerUpload(url => setSettings({...settings, bannerImageUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-emerald-600 text-white rounded-xl shadow-md"><ImageIcon className="h-4 w-4" /></button></div>
                  )}
                  {settings.bannerMode === 'carousel' && (
                    <div className="space-y-2">
                       <button onClick={() => setSettings({...settings, bannerImages: [...(settings.bannerImages || []), '']})} className="text-emerald-600 font-black text-[10px]">+ ADICIONAR IMAGEM</button>
                       {(settings.bannerImages || []).map((img, idx) => (
                         <div key={idx} className="flex gap-2"><input type="text" className="flex-grow p-3 bg-gray-50 rounded-xl font-bold text-[9px]" value={img} onChange={e => {const n = [...settings.bannerImages]; n[idx] = e.target.value; setSettings({...settings, bannerImages: n})}} /><button onClick={() => setSettings({...settings, bannerImages: settings.bannerImages.filter((_, i) => i !== idx)})} className="p-3 bg-red-50 text-red-500 rounded-xl"><Trash2 className="h-4 w-4" /></button></div>
                       ))}
                    </div>
                  )}
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-gray-50 pb-4">Suporte & Regras</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Pedido Mínimo (R$)</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={settings.minOrderValue} onChange={e => setSettings({...settings, minOrderValue: parseFloat(e.target.value)})} /></div>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mt-4 shadow-inner"><span className="text-[9px] font-black uppercase tracking-widest">Ocultar Esgotados</span><button onClick={() => setSettings({...settings, hideOutOfStock: !settings.hideOutOfStock})} className={`w-10 h-5 rounded-full relative transition-all ${settings.hideOutOfStock ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.hideOutOfStock ? 'right-0.5' : 'left-0.5'}`}></div></button></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl shadow-inner mt-4">
                       <span className="text-[9px] font-black uppercase tracking-widest">Frete Grátis Ativo</span>
                       <button onClick={() => setSettings({...settings, enableFreeShipping: !settings.enableFreeShipping})} className={`w-10 h-5 rounded-full relative transition-all ${settings.enableFreeShipping ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${settings.enableFreeShipping ? 'right-0.5' : 'left-0.5'}`}></div>
                       </button>
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Texto do Frete</label>
                       <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={settings.freeShippingLabel || ''} onChange={e => setSettings({...settings, freeShippingLabel: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 flex items-center justify-between group transition-all hover:bg-gray-50">
                    <div className="space-y-1">
                      <h5 className="text-[11px] font-black text-gray-900 uppercase tracking-tight">PRAZO PERSONALIZADO</h5>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">PERMITIR QUE O CLIENTE DIGITE O PRAZO</p>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, allowCustomBillingTerm: !settings.allowCustomBillingTerm})} 
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.allowCustomBillingTerm ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.allowCustomBillingTerm ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>

                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">E-mail Comercial</label><input type="email" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-sm" value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1">WhatsApp SAC</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-sm" value={settings.contactWhatsapp} onChange={e => setSettings({...settings, contactWhatsapp: e.target.value})} /></div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex justify-between items-center">Faturamento <button onClick={() => setSettings({...settings, billingOptions: [...settings.billingOptions, '']})} className="text-emerald-600 text-[10px] font-black">+ NOVO</button></h4>
                  <div className="space-y-2">
                    {settings.billingOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2"><input type="text" className="flex-grow p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={opt} onChange={e => {const n = [...settings.billingOptions]; n[idx] = e.target.value; setSettings({...settings, billingOptions: n})}} /><button onClick={() => setSettings({...settings, billingOptions: settings.billingOptions.filter((_, i) => i !== idx)})} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button></div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><FileCheck className="h-4 w-4" /> Políticas & Rodapé</h4>
                  
                  <div className="grid grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Fundo do Rodapé</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-gray-50 shadow-sm shrink-0" 
                          value={settings.footerBackgroundColor || '#022c22'} 
                          onChange={e => setSettings({...settings, footerBackgroundColor: e.target.value})} 
                        />
                        <div className="flex-grow bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 shadow-inner">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-none outline-none font-black text-xs text-gray-500 uppercase tracking-widest" 
                            value={settings.footerBackgroundColor || ''} 
                            onChange={e => setSettings({...settings, footerBackgroundColor: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Texto do Rodapé</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          className="w-12 h-12 rounded-2xl cursor-pointer border-4 border-gray-50 shadow-sm shrink-0" 
                          value={settings.footerTextColor || '#ffffff'} 
                          onChange={e => setSettings({...settings, footerTextColor: e.target.value})} 
                        />
                        <div className="flex-grow bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 shadow-inner">
                          <input 
                            type="text" 
                            className="w-full bg-transparent border-none outline-none font-black text-xs text-gray-500 uppercase tracking-widest" 
                            value={settings.footerTextColor || ''} 
                            onChange={e => setSettings({...settings, footerTextColor: e.target.value})} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-6">
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2 shadow-sm">Copyright Rodapé</label><input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.footerCopyright} onChange={e => setSettings({...settings, footerCopyright: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Restrição de Acesso</label><textarea rows={2} className="w-full p-4 bg-gray-50 rounded-2xl font-medium text-[10px] resize-none shadow-sm" value={settings.footerRestrictedText} onChange={e => setSettings({...settings, footerRestrictedText: e.target.value})} /></div>
                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Política de Privacidade</label><textarea rows={5} className="w-full p-4 bg-gray-50 rounded-2xl font-medium text-xs resize-none shadow-sm" value={settings.privacyPolicyText} onChange={e => setSettings({...settings, privacyPolicyText: e.target.value})} /></div>
                  </div>
                  <div className="pt-4 border-t border-gray-50">
                     <div className="flex justify-between items-center mb-4"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Créditos de Criação</span><button onClick={handleUnlockCreator} className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${creatorLocked ? 'bg-gray-100 text-gray-400' : 'bg-emerald-500 text-white'}`}>{creatorLocked ? 'Desbloquear' : 'Liberado'}</button></div>
                     <div className="space-y-4">
                       <input disabled={creatorLocked} type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.creatorName} onChange={e => setSettings({...settings, creatorName: e.target.value})} />
                       <input disabled={creatorLocked} type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.creatorUrl} onChange={e => setSettings({...settings, creatorUrl: e.target.value})} />
                     </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><Share2 className="h-4 w-4" /> Canais Sociais</h4>
                   <div className="space-y-4">
                      <div className="flex items-center gap-3"><Facebook className="h-5 w-5 text-gray-400" /><input type="text" placeholder="Facebook URL" className="flex-grow p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.facebookUrl} onChange={e => setSettings({...settings, facebookUrl: e.target.value})} /></div>
                      <div className="flex items-center gap-3"><Instagram className="h-5 w-5 text-gray-400" /><input type="text" placeholder="Instagram URL" className="flex-grow p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.instagramUrl} onChange={e => setSettings({...settings, instagramUrl: e.target.value})} /></div>
                      <div className="flex items-center gap-3"><Linkedin className="h-5 w-5 text-gray-400" /><input type="text" placeholder="Linkedin URL" className="flex-grow p-4 bg-gray-50 rounded-2xl font-bold text-xs" value={settings.linkedinUrl} onChange={e => setSettings({...settings, linkedinUrl: e.target.value})} /></div>
                   </div>
                </div>

                {/* SEÇÃO ADICIONADA: SEGURANÇA DO PAINEL */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Segurança do Painel</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nova Senha Admin</label>
                      <input 
                        type="password" 
                        placeholder="Mínimo 4 caracteres" 
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-inner border-2 border-transparent focus:border-red-500 outline-none" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Confirmar Senha</label>
                      <input 
                        type="password" 
                        placeholder="Repita a nova senha" 
                        className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs shadow-inner border-2 border-transparent focus:border-red-500 outline-none" 
                        value={confirmNewPassword} 
                        onChange={e => setConfirmNewPassword(e.target.value)} 
                      />
                    </div>
                    <button 
                      onClick={handleUpdatePassword}
                      className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-red-700 transition-all active:scale-95"
                    >
                      Atualizar Chave de Acesso
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8 animate-in fade-in duration-500 pb-20">
               <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">IA & Marketing</h3>
               
               <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                 <div className="flex items-center gap-6">
                   <div className={`p-5 rounded-[24px] ${aiCampaigns.whatsappStatus === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                     {aiCampaigns.whatsappStatus === 'connected' ? <Wifi className="h-10 w-10" /> : <WifiOff className="h-10 w-10" />}
                   </div>
                   <div><h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Status do WhatsApp</h4><p className="text-sm font-medium text-gray-500">{aiCampaigns.whatsappStatus === 'connected' ? 'Conectado via API' : 'Desconectado'}</p></div>
                 </div>
                 <button onClick={() => updateAiCampaigns({ whatsappStatus: aiCampaigns.whatsappStatus === 'connected' ? 'disconnected' : 'connected' })} className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Alternar Conexão</button>
               </div>

               <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4">WHATSAPP API</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">WHATSAPP API KEY</label>
                      <div className="relative group">
                        <Key className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Sua chave de acesso..." 
                          className="w-full pl-14 pr-6 py-5 bg-gray-50/50 rounded-3xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm shadow-inner transition-all placeholder:text-gray-300"
                          value={aiCampaigns.whatsappApiKey || ''}
                          onChange={e => updateAiCampaigns({ whatsappApiKey: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 ml-1 tracking-widest">WHATSAPP API URL</label>
                      <div className="relative group">
                        <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="https://api.whatsapp..." 
                          className="w-full pl-14 pr-6 py-5 bg-gray-50/50 rounded-3xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm shadow-inner transition-all placeholder:text-gray-300"
                          value={aiCampaigns.whatsappApiUrl || ''}
                          onChange={e => updateAiCampaigns({ whatsappApiUrl: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
               </div>

               {/* SEÇÃO ADICIONADA: DISPARO EM MASSA INTELIGENTE */}
               <div className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm space-y-10 lg:col-span-2">
                 <h4 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em] border-b border-gray-50 pb-6 flex items-center gap-3">
                   <Zap className="h-6 w-6" /> Disparo em Massa Inteligente
                 </h4>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-8">
                     <div>
                       <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Template da Oferta</label>
                       <textarea 
                         rows={6} 
                         className="w-full p-8 bg-gray-50/50 rounded-[40px] border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-base shadow-inner transition-all resize-none" 
                         placeholder="Confira as novidades da semana na Herbamed!..." 
                         value={aiCampaigns.massMessageTemplate} 
                         onChange={e => updateAiCampaigns({ massMessageTemplate: e.target.value })} 
                       />
                     </div>
                     <div className="flex items-center justify-between p-8 bg-gray-50/50 rounded-[40px] border border-gray-100">
                       <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Campanha de Massa Ativa</span>
                       <button 
                         onClick={() => updateAiCampaigns({ isActiveMass: !aiCampaigns.isActiveMass })} 
                         className={`w-14 h-7 rounded-full relative transition-all duration-300 ${aiCampaigns.isActiveMass ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-gray-200'}`}
                       >
                         <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${aiCampaigns.isActiveMass ? 'right-1' : 'left-1'}`}></div>
                       </button>
                     </div>
                   </div>
                   
                   <div className="flex flex-col">
                     <label className="block text-[11px] font-black text-gray-400 uppercase mb-3 tracking-widest ml-1">Imagem da Campanha</label>
                     <div 
                       onClick={() => triggerUpload(url => updateAiCampaigns({ massMessageImage: url }))}
                       className="flex-grow min-h-[300px] bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-[48px] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white hover:border-emerald-200 transition-all group overflow-hidden relative"
                     >
                       {aiCampaigns.massMessageImage ? (
                         <>
                           <img src={aiCampaigns.massMessageImage} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                             <div className="bg-white p-4 rounded-full shadow-2xl text-emerald-600">
                               <RefreshCw className="h-6 w-6" />
                             </div>
                           </div>
                         </>
                       ) : (
                         <>
                           <div className="p-8 bg-white rounded-[32px] shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                             <ImageIcon className="h-14 w-14 text-gray-100" />
                           </div>
                           <button className="bg-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border border-gray-100 shadow-xl transition-all active:scale-95 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-500">
                             Upload Imagem de Campanha
                           </button>
                         </>
                       )}
                     </div>
                   </div>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                    <h4 className="text-[10px] font-black text-purple-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><Gift className="h-4 w-4" /> Automação de Aniversário</h4>
                    <div><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Mensagem de Parabéns</label><textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" placeholder="Olá {{nome}}, parabéns pelo seu dia..." value={aiCampaigns.birthdayTemplate} onChange={e => updateAiCampaigns({ birthdayTemplate: e.target.value })} /></div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl shadow-inner"><span className="text-[9px] font-black uppercase tracking-widest">Ativar Campanha</span><button onClick={() => updateAiCampaigns({ isActiveBirthday: !aiCampaigns.isActiveBirthday })} className={`w-10 h-5 rounded-full relative transition-all ${aiCampaigns.isActiveBirthday ? 'bg-emerald-500' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${aiCampaigns.isActiveBirthday ? 'right-0.5' : 'left-0.5'}`}></div></button></div>
                 </div>

                 <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-50 pb-4 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Recuperação de Inativos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Dias de Inatividade</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-sm" value={aiCampaigns.inactiveDays} onChange={e => updateAiCampaigns({ inactiveDays: parseInt(e.target.value) })} /></div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl mt-6"><span className="text-[9px] font-black uppercase tracking-widest">Ativar</span><button onClick={() => updateAiCampaigns({ isActiveInactive: !aiCampaigns.isActiveInactive })} className={`w-10 h-5 rounded-full relative transition-all ${aiCampaigns.isActiveInactive ? 'bg-blue-500' : 'bg-gray-300'}`}><div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${aiCampaigns.isActiveInactive ? 'right-0.5' : 'left-0.5'}`}></div></button></div>
                    </div>
                    <div><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Mensagem de Saudades</label><textarea rows={3} className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-xs" placeholder="Olá {{nome}}, notamos que não faz pedidos há algum tempo..." value={aiCampaigns.inactiveTemplate} onChange={e => updateAiCampaigns({ inactiveTemplate: e.target.value })} /></div>
                 </div>
               </div>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-6 md:p-10 rounded-[48px] border border-gray-100 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
                  <div><h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Agenda</h3><p className="text-gray-500 font-medium">Controle de visitas industriais.</p></div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={clearExtras} className="bg-white border-2 border-amber-100 text-amber-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-amber-50 transition-all"><Eraser className="h-4 w-4" /> Limpar Extras</button>
                    <button onClick={() => document.getElementById('agenda-form')?.scrollIntoView({ behavior: 'smooth' })} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Novo Registro</button>
                  </div>
                </div>
                
                <div className="flex overflow-x-auto gap-4 pb-8 no-scrollbar">
                  {agendaConfig.map((col) => {
                    const itemsInDay = agendaItems.filter(item => !item.archived && (item.isFixed ? item.dayOfWeek === col.name : getDayFromDate(item.date!).includes(col.name)));
                    return (
                      <div key={col.id} className="min-w-[280px] flex-1 flex flex-col gap-3">
                        <div className="flex items-center justify-between px-4 py-2 border-b-2 bg-gray-50/50 rounded-t-xl shadow-inner" style={{ borderColor: col.color }}><h4 className="font-black text-gray-900 uppercase text-[9px]">{col.label}</h4><span className="text-[8px] font-black bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">{itemsInDay.length}</span></div>
                        <div className="flex flex-col gap-2.5 min-h-[550px] bg-gray-50/20 p-2.5 rounded-[28px] border border-gray-100">
                          {itemsInDay.sort((a,b) => (a.time || '00:00').localeCompare(b.time || '00:00')).map((item) => (
                            <div key={item.id} className={`group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm transition-all hover:scale-[1.02] relative ${item.completed ? 'opacity-40 grayscale' : ''}`}>
                               <div className="absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: item.color }}></div>
                               <div className="flex flex-col gap-1">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1 text-[8px] font-black text-gray-400 uppercase tracking-tighter">{item.isFixed ? <Anchor className="h-2.5 w-2.5 text-emerald-500" /> : <Clock className="h-2.5 w-2.5" />}{item.isFixed ? 'Rota Fixa' : `${new Date(item.date! + 'T12:00:00').toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})} - ${item.time}`}</div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="relative">
                                         <button onClick={() => setActiveMoveMenu(activeMoveMenu === item.id ? null : item.id)} className={`p-1 rounded-md transition-colors ${activeMoveMenu === item.id ? 'bg-blue-500 text-white' : 'bg-gray-50 text-gray-300 hover:text-blue-500'}`}><ArrowRightLeft className="h-3 w-3" /></button>
                                         {activeMoveMenu === item.id && (
                                           <>
                                             <div className="fixed inset-0 z-[90]" onClick={() => setActiveMoveMenu(null)}></div>
                                             <div className="absolute right-0 top-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-[100] p-2 min-w-[150px] animate-in zoom-in duration-200">
                                                <p className="text-[8px] font-black uppercase text-gray-400 px-3 py-2 border-b border-gray-50 mb-1">Mover para:</p>
                                                <div className="grid grid-cols-1 gap-1">
                                                  {agendaConfig.map(c => (
                                                    <button key={c.id} onClick={() => moveAgendaItem(item.id, c.name)} className={`w-full text-left px-3 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${item.dayOfWeek === c.name ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:bg-gray-50'}`}>{c.label}</button>
                                                  ))}
                                                </div>
                                             </div>
                                           </>
                                         )}
                                      </div>
                                      <button onClick={() => toggleAgendaItem(item.id)} className={`p-1 rounded-md transition-colors ${item.completed ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200' : 'bg-gray-50 text-gray-300 hover:text-emerald-500'}`}><CheckCircle className="h-3 w-3" /></button>
                                      <button onClick={() => archiveAgendaItem(item.id)} className="p-1 bg-gray-50 text-gray-300 hover:text-red-500 rounded-md transition-colors"><Trash2 className="h-3 w-3" /></button>
                                    </div>
                                  </div>
                                  <h5 className={`font-black text-gray-900 text-[11px] leading-tight ${item.completed ? 'line-through' : ''}`}>{item.client}</h5>
                                  <p className="text-[9px] text-gray-400 font-medium line-clamp-1">{item.address}</p>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div id="agenda-form" className="mt-12 pt-12 border-t border-gray-100">
                   <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4"><h4 className="text-xl font-black text-gray-900 uppercase">Novo Registro de Agenda</h4><div className="flex bg-gray-100 p-1 rounded-2xl"><button onClick={() => setNewAgendaItem({...newAgendaItem, isFixed: true})} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${newAgendaItem.isFixed ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400'}`}>Rota Fixa</button><button onClick={() => setNewAgendaItem({...newAgendaItem, isFixed: false})} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${!newAgendaItem.isFixed ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400'}`}>Agend. Extra</button></div></div>
                   <form onSubmit={handleAddAgendaItem} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end bg-gray-50/50 p-8 rounded-[40px] border border-gray-100 shadow-inner">
                      {newAgendaItem.isFixed ? (<div className="md:col-span-4"><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Dia da Semana</label><select required className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={newAgendaItem.dayOfWeek} onChange={e => setNewAgendaItem({...newAgendaItem, dayOfWeek: e.target.value})}>{agendaConfig.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></div>) : (<><div className="md:col-span-2"><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Data</label><input type="date" required className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={newAgendaItem.date} onChange={e => setNewAgendaItem({...newAgendaItem, date: e.target.value})} /></div><div className="md:col-span-2"><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Horário</label><input type="time" required className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-center" value={newAgendaItem.time} onChange={e => setNewAgendaItem({...newAgendaItem, time: e.target.value})} /></div></>)}
                      <div className="md:col-span-4"><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Cliente</label><input type="text" required placeholder="Nome..." className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={newAgendaItem.client} onChange={e => setNewAgendaItem({...newAgendaItem, client: e.target.value})} /></div>
                      <div className="md:col-span-4"><label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Endereço</label><input type="text" placeholder="Local..." className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={newAgendaItem.address} onChange={e => setNewAgendaItem({...newAgendaItem, address: e.target.value})} /></div>
                      <div className="md:col-span-8">
                         <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Observações / Notas</label>
                         <textarea rows={1} placeholder="Notas rápidas..." className="w-full p-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-medium text-sm" value={newAgendaItem.obs} onChange={e => setNewAgendaItem({...newAgendaItem, obs: e.target.value})} />
                      </div>
                      <div className="md:col-span-4"><button type="submit" className={`w-full text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95 ${newAgendaItem.isFixed ? 'bg-emerald-600' : 'bg-purple-600'}`}>{newAgendaItem.isFixed ? 'Salvar Rota' : 'Agendar Extra'}</button></div>
                   </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div><h3 className="text-2xl font-black text-gray-900 tracking-tight">Catálogo de SKUs</h3><p className="text-gray-500 font-medium">Gestão de produtos industriais.</p></div>
                <button onClick={() => setEditingProduct({ id: '', code: '', ean: '', name: '', description: '', category: settings.categories[0]?.name || 'Todas', price: 0, image: '', inStock: true, isHighlighted: false, expirationDate: '', bulaUrl: '', nutritionalInfo: '', indicationsImageUrl: '', indicationsText: '', showBula: true, showNutritionalInfo: true })} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Novo SKU</button>
              </div>

              {/* BLOCO DE BUSCA E SCANNER ADICIONADO AO ADMIN */}
              <div className="flex flex-col sm:flex-row gap-4 mb-10 p-6 bg-white rounded-[32px] border border-gray-100 shadow-sm animate-in slide-in-from-top-2 duration-500">
                <div className="relative flex-grow group">
                  <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-emerald-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Buscar SKU por nome ou código..." 
                    className="w-full pl-14 pr-6 py-5 bg-gray-50/50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-sm transition-all"
                    value={skuSearchTerm}
                    onChange={e => setSkuSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={startAdminScanner}
                  className="flex items-center justify-center gap-3 px-8 py-5 bg-[#111827] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  <ScanLine className="h-5 w-5" />
                  <span className="hidden sm:inline">Scanner SKU</span>
                </button>
              </div>

              <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-8 py-5">Item</th>
                        <th className="px-8 py-5">Preço</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products
                        .filter(p => 
                          p.name.toLowerCase().includes(skuSearchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(skuSearchTerm.toLowerCase())
                        )
                        .map((p) => (
                          <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-5 flex items-center gap-4">
                              <img src={p.image} className="w-10 h-10 rounded-xl object-contain border border-gray-100 shadow-sm" />
                              <div className="flex flex-col">
                                <div className="font-bold text-gray-900 text-sm">{p.name}</div>
                                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{p.code}</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 font-black text-emerald-600">R$ {p.price.toFixed(2)}</td>
                            <td className="px-8 py-5">
                              <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${p.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {p.inStock ? 'Ativo' : 'Esgotado'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingProduct(p)} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if(confirm('Excluir?')) setProducts(products.filter(item => item.id !== p.id)); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {products.filter(p => p.name.toLowerCase().includes(skuSearchTerm.toLowerCase()) || p.code.toLowerCase().includes(skuSearchTerm.toLowerCase())).length === 0 && (
                    <div className="py-20 text-center">
                      <ImageIcon className="h-10 w-10 text-gray-100 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nenhum SKU correspondente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Clientes Cadastrados</h3>
               <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-100"><tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-8 py-5">Razão Social / CNPJ</th><th className="px-8 py-5">Contato</th><th className="px-8 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-50">{users.map(u => (<tr key={u.id} className="group hover:bg-gray-50/50"><td className="px-8 py-5"><div className="font-bold text-gray-900 text-sm">{u.razaoSocial}</div><div className="text-[10px] text-emerald-600 font-black mt-1 uppercase">{u.cnpj}</div></td><td className="px-8 py-5"><div className="font-black text-emerald-600 text-[10px] uppercase tracking-widest">{u.contato || '-'}</div><div className="text-[10px] text-gray-400 truncate max-w-[150px]">{u.email}</div></td><td className="px-8 py-5 text-right"><button onClick={() => { if(confirm('Excluir?')) deleteUser?.(u.id); }} className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-100 shadow-sm transition-all"><Trash2 className="h-4 w-4" /></button></td></tr>))}</tbody></table></div></div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <h3 className="text-2xl font-black text-gray-900 uppercase mb-8">Gestão de Pedidos</h3>
               <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-100"><tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest"><th className="px-8 py-5">ID</th><th className="px-8 py-5">Cliente</th><th className="px-8 py-5">Total</th><th className="px-8 py-5 text-right">Ações</th></tr></thead><tbody className="divide-y divide-gray-50">{orders.map((o) => (<tr key={o.id} className="group hover:bg-gray-50/50"><td className="px-8 py-5 font-bold text-gray-900">#{o.id}</td><td className="px-8 py-5 text-sm font-bold text-gray-900">{o.customer.razaoSocial}</td><td className="px-8 py-5 font-black text-emerald-700">R$ {o.total.toFixed(2)}</td><td className="px-8 py-5 text-right"><button onClick={() => setViewingOrder(o)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-gray-900 shadow-sm"><Eye className="h-5 w-5" /></button></td></tr>))}</tbody></table></div></div>
            </div>
          )}
        </div>
      </div>
      
      {editingProduct && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="flex justify-between items-center p-10 pb-6 border-b border-gray-50 flex-shrink-0">
              <h3 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Editar SKU Industrial</h3>
              <button onClick={() => setEditingProduct(null)} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-10 pt-6 no-scrollbar">
              <form onSubmit={async (e) => { e.preventDefault(); const updated = editingProduct.id ? products.map(p => p.id === editingProduct.id ? editingProduct : p) : [...products, {...editingProduct, id: Math.random().toString(36).substr(2, 9)}]; await setProducts(updated); setEditingProduct(null); }} className="space-y-8">
                
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest border-b border-gray-50 pb-4">DADOS DO SKU</h4>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-8">
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Nome do Produto</label>
                       <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold shadow-sm" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Categoria</label>
                       <select className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}>
                         {settings.categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                       </select>
                    </div>
                    <div className="md:col-span-12">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1 flex items-center gap-2"><AlignLeft className="h-3 w-3" /> Descrição Curta</label>
                      <textarea rows={2} className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-medium text-sm resize-none shadow-sm transition-all" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">SKU Code (Interno)</label>
                      <input required type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm" value={editingProduct.code} onChange={e => setEditingProduct({...editingProduct, code: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">EAN (Cód. Barras)</label>
                      <input type="text" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm" value={editingProduct.ean || ''} onChange={e => setEditingProduct({...editingProduct, ean: e.target.value})} />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Vencimento</label>
                      <input type="text" placeholder="Ex: 12/26" className="w-full p-4 bg-gray-50 rounded-2xl font-bold shadow-sm" value={editingProduct.expirationDate || ''} onChange={e => setEditingProduct({...editingProduct, expirationDate: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-widest border-b border-gray-50 pb-4">VALORES & LOGÍSTICA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Preço Venda (R$)</label>
                      <input required type="number" step="0.01" className="w-full p-4 bg-gray-50 rounded-2xl font-black text-lg text-emerald-600 shadow-sm" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Preço Original (Riscado)</label>
                      <input type="number" step="0.01" className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-400 shadow-sm" value={editingProduct.originalPrice || 0} onChange={e => setEditingProduct({...editingProduct, originalPrice: parseFloat(e.target.value)})} />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl shadow-inner mt-6">
                      <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Em Estoque</span>
                      <button type="button" onClick={() => setEditingProduct({...editingProduct, inStock: !editingProduct.inStock})} className={`w-12 h-6 rounded-full relative transition-all ${editingProduct.inStock ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingProduct.inStock ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <div className="md:col-span-3 flex items-center justify-between p-6 bg-amber-50/50 rounded-3xl border border-amber-100">
                       <div className="flex items-center gap-4">
                          <Trophy className="h-6 w-6 text-amber-500" />
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase">Selo de Destaque</p>
                            <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest">O produto aparecerá com um selo especial no catálogo</p>
                          </div>
                       </div>
                       <button type="button" onClick={() => setEditingProduct({...editingProduct, isHighlighted: !editingProduct.isHighlighted})} className={`w-12 h-6 rounded-full relative transition-all ${editingProduct.isHighlighted ? 'bg-amber-500 shadow-lg shadow-amber-200' : 'bg-gray-200'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingProduct.isHighlighted ? 'right-1' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-widest border-b border-gray-50 pb-4">IMAGENS & MÍDIA</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Imagem Principal (Frente)</label>
                         <div className="relative group">
                           <input type="text" className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xs shadow-sm shadow-inner" value={editingProduct.image} onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                           <button type="button" onClick={() => triggerUpload(url => setEditingProduct({...editingProduct, image: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-gray-900 text-white rounded-xl shadow-lg transition-all hover:bg-black"><Camera className="h-5 w-5" /></button>
                         </div>
                    </div>
                    <div>
                         <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Foto Benefícios/Indicações</label>
                         <div className="relative group">
                           <input type="text" placeholder="URL ou Upload..." className="w-full pl-4 pr-14 py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold text-xs shadow-sm shadow-inner" value={editingProduct.indicationsImageUrl || ''} onChange={e => setEditingProduct({...editingProduct, indicationsImageUrl: e.target.value})} />
                           <button type="button" onClick={() => triggerUpload(url => setEditingProduct({...editingProduct, indicationsImageUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-purple-600 text-white rounded-xl shadow-lg transition-all"><ImagePlusIcon className="h-5 w-5" /></button>
                         </div>
                    </div>
                    <div className="md:col-span-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 ml-1">Texto de Benefícios (Se não houver foto)</label>
                       <textarea rows={3} placeholder="Destaque pontos importantes com **texto entre asteriscos**" className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-medium text-sm resize-none shadow-sm" value={editingProduct.indicationsText || ''} onChange={e => setEditingProduct({...editingProduct, indicationsText: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4">DETALHAMENTO TÉCNICO</h4>
                  <div className="grid grid-cols-1 gap-8">
                    <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <FileText className="h-5 w-5 text-blue-500" />
                             <span className="text-[10px] font-black uppercase text-gray-900 tracking-widest">Bula do Produto</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase text-gray-400">Ativar no Catálogo</span>
                            <button type="button" onClick={() => setEditingProduct({...editingProduct, showBula: !editingProduct.showBula})} className={`w-10 h-5 rounded-full relative transition-all ${editingProduct.showBula ? 'bg-blue-500' : 'bg-gray-200'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editingProduct.showBula ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                          </div>
                       </div>
                       <div className="relative group">
                        <input type="text" placeholder="Link para PDF ou imagem da bula..." className="w-full pl-4 pr-14 py-4 bg-white rounded-2xl border-2 border-transparent focus:border-blue-500 outline-none font-bold text-xs shadow-sm" value={editingProduct.bulaUrl || ''} onChange={e => setEditingProduct({...editingProduct, bulaUrl: e.target.value})} />
                        <button type="button" onClick={() => triggerUpload(url => setEditingProduct({...editingProduct, bulaUrl: url}))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-500 text-white rounded-xl shadow-lg transition-all hover:bg-blue-600">
                          <Camera className="h-4 w-4" />
                        </button>
                       </div>
                    </div>

                    <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                       <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                             <Activity className="h-5 w-5 text-emerald-500" />
                             <span className="text-[10px] font-black uppercase text-gray-900 tracking-widest">Tabela Nutricional</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase text-gray-400">Ativar no Catálogo</span>
                            <button type="button" onClick={() => setEditingProduct({...editingProduct, showNutritionalInfo: !editingProduct.showNutritionalInfo})} className={`w-10 h-5 rounded-full relative transition-all ${editingProduct.showNutritionalInfo ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${editingProduct.showNutritionalInfo ? 'right-0.5' : 'left-0.5'}`}></div>
                            </button>
                          </div>
                       </div>
                       <div className="relative group">
                        <textarea rows={4} placeholder="Digite os dados da tabela nutricional aqui..." className="w-full pl-4 pr-14 py-4 bg-white rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-medium text-xs resize-none shadow-sm" value={editingProduct.nutritionalInfo || ''} onChange={e => setEditingProduct({...editingProduct, nutritionalInfo: e.target.value})} />
                        <button type="button" onClick={() => triggerUpload(url => setEditingProduct({...editingProduct, nutritionalInfo: url}))} className="absolute right-2 top-4 p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg transition-all hover:bg-emerald-600">
                          <Camera className="h-4 w-4" />
                        </button>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 pb-2"><button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-sm tracking-[0.2em] shadow-2xl transition-all active:scale-95">Salvar Alterações</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {viewingOrder && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[48px] w-full max-w-4xl max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl animate-in zoom-in duration-300">
              <div className="p-10 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-20">
                 <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">DETALHES DO PEDIDO #{viewingOrder.id}</h3>
                 <button onClick={() => setViewingOrder(null)} className="p-3 bg-gray-50 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                    <X className="h-6 w-6" />
                 </button>
              </div>
              
              <div className="p-10 grid grid-cols-1 md:grid-cols-12 gap-12">
                 <div className="md:col-span-5 space-y-12">
                    <div>
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">INFORMAÇÕES DO CLIENTE</h4>
                       <div className="bg-gray-50/50 rounded-[32px] p-8 border border-gray-100 shadow-inner space-y-4">
                          <p className="font-black text-gray-900 text-xl tracking-tight leading-none">{viewingOrder.customer.razaoSocial}</p>
                          <div className="space-y-2 pt-2 border-t border-gray-100">
                             <p className="text-xs font-bold text-gray-500">CNPJ: {viewingOrder.customer.cnpj}</p>
                             <p className="text-xs font-bold text-gray-500">Resp: {viewingOrder.customer.responsible}</p>
                             <p className="text-xs font-bold text-emerald-600">WhatsApp: {viewingOrder.customer.phone}</p>
                          </div>
                       </div>
                    </div>
                    
                    <div>
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">STATUS & FATURAMENTO</h4>
                       <div className="space-y-4">
                          <div className="bg-emerald-50 text-emerald-600 px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest text-center shadow-sm border border-emerald-100/50">
                             {viewingOrder.billingTerm}
                          </div>
                          <div className={`px-8 py-5 rounded-3xl font-black uppercase text-xs tracking-widest text-center shadow-sm border ${
                             viewingOrder.status === 'Pendente' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                             viewingOrder.status === 'Recebido' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                             'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                             {viewingOrder.status}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="md:col-span-7 flex flex-col space-y-12">
                    <div>
                       <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">RESUMO DOS ITENS</h4>
                       <div className="bg-white border border-gray-100 rounded-[32px] p-2 shadow-inner overflow-hidden">
                          <div className="max-h-[350px] overflow-y-auto no-scrollbar px-4">
                             {viewingOrder.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-4 border-b border-gray-50 last:border-0 group">
                                   <div className="flex items-center gap-4">
                                      <div className="bg-emerald-600 text-white w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs shadow-lg shadow-emerald-900/10 shrink-0">
                                         {item.quantity}x
                                      </div>
                                      <span className="font-bold text-gray-900 text-sm line-clamp-1">{item.product.name}</span>
                                   </div>
                                   <span className="font-black text-emerald-600 whitespace-nowrap text-sm">
                                      R$ {(item.product.price * item.quantity).toFixed(2)}
                                   </span>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto pt-8 border-t border-gray-100 flex flex-col items-end">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">TOTAL GERAL À FATURAR:</span>
                       <span className="text-5xl font-black text-emerald-600 tracking-tighter">R$ {viewingOrder.total.toFixed(2)}</span>
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-gray-50/50 border-t border-gray-100 flex flex-col sm:flex-row gap-4 sticky bottom-0 z-20">
                 {viewingOrder.status !== 'Recebido' && (
                    <button 
                       onClick={() => handleUpdateOrderStatus(viewingOrder.id, 'Recebido')} 
                       className="flex-grow bg-blue-600 text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all active:scale-95"
                    >
                       MARCAR COMO RECEBIDO
                    </button>
                 )}
                 <button 
                    onClick={() => setViewingOrder(null)} 
                    className="flex-grow bg-[#111827] text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all active:scale-95"
                 >
                    FECHAR JANELA
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};