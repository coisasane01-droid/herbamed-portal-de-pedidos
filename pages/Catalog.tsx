import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Product, SiteSettings, Category } from '../types';
import { Search, Plus, Minus, X, ScanLine, Share, Image as ImageIcon, Play, Smartphone, Barcode, Camera, RefreshCw, PlusSquare, Download, AlertCircle, ShieldCheck, Sparkles, ChevronRight, Maximize2, FileText, Calendar, Info, ChevronDown, ChevronUp, ClipboardList, Activity, Smartphone as SmartphoneIcon } from 'lucide-react';
import PromoCategoryCarousel from "../components/components/PromoCategoryCarousel";
import { PromoCategoryPopup } from '../components/PromoCategoryPopup';

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  settings: SiteSettings;
  cart: { product: Product; quantity: number }[];
}

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart, settings, cart }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [productCode, setProductCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // NOVO ESTADO ADICIONAL PARA FILTROS DOS CARDS PROMOCIONAIS
  const [promoFilter, setPromoFilter] = useState<string[] | null>(null);
  
  // NOVO ESTADO ADICIONAL PARA POPUP DE CATEGORIA (ATUALIZADO COM PRODUCTIDS)
  const [activePromoPopup, setActivePromoPopup] = useState<{categories: string[], title: string, productIds?: string[]} | null>(null);
  
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('herbamed_welcome_accepted'));
  const [isScanning, setIsScanning] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeDescriptionProduct, setActiveDescriptionProduct] = useState<Product | null>(null);
  const [activeNutritionalInfo, setActiveNutritionalInfo] = useState<Product | null>(null);
  const [activeBenefitsText, setActiveBenefitsText] = useState<Product | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1579722820308-d74e57198c79?auto=format&fit=crop&q=80&w=2000';

  // Lógica complementar para foco e rolagem via Lupa da barra inferior (Isolada)
  useEffect(() => {
    const handleGlobalSearchTrigger = () => {
      if (searchInputRef.current) {
        // Garante a rolagem suave primeiro
        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Chamada direta do foco com timeout curto (300ms) para garantir abertura do teclado mobile
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 300);
      }
    };

    // Caso o usuário tenha vindo de outra página clicando na lupa
    if ((location.state as any)?.focusSearch) {
      handleGlobalSearchTrigger();
      // Limpa o estado para evitar disparos indesejados em re-renders
      window.history.replaceState({}, document.title);
    }

    window.addEventListener('trigger-catalog-search', handleGlobalSearchTrigger);
    return () => window.removeEventListener('trigger-catalog-search', handleGlobalSearchTrigger);
  }, [location]);

  // Listener para instalação PWA
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[1].length === 11) ? match[1] : null;
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&enablejsapi=1&rel=0&iv_load_policy=3&modestbranding=1&origin=${window.location.origin}` : '';
  };

  useEffect(() => {
    if (settings.bannerMode === 'carousel' && settings.bannerImages?.length > 1) {
      const interval = setInterval(() => setCurrentBannerIndex(prev => (prev + 1) % settings.bannerImages.length), 5000);
      return () => clearInterval(interval);
    }
  }, [settings.bannerMode, settings.bannerImages]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    } else {
      setShowInstallInstructions(true);
    }
  };

  const handleScannerClick = () => setShowPermissionPrompt(true);

  const startScanner = async () => {
    setShowPermissionPrompt(false);
    setScannerError(null);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err: any) {
      setScannerError("Erro ao acessar câmera.");
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setIsScanning(false);
  };

  const handleScanSuccess = (code: string) => {
    setProductCode(code);
    stopScanner();
  };

  const handleAcceptWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('herbamed_welcome_accepted', 'true');
  };

  const getProductQuantity = (productId: string) => cart.find(i => i.product.id === productId)?.quantity || 0;

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, i) => 
      (part.startsWith('**') && part.endsWith('**')) ? <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong> : part
    );
  };

  const useDragScroll = () => {
    const ref = useRef<HTMLDivElement>(null);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
      if (!ref.current) return;
      isDown.current = true;
      ref.current.classList.add('active');
      startX.current = e.pageX - ref.current.offsetLeft;
      scrollLeft.current = ref.current.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown.current = false;
      if (ref.current) ref.current.classList.remove('active');
    };

    const onMouseUp = () => {
      isDown.current = false;
      if (ref.current) ref.current.classList.remove('active');
    };

    const onMouseMove = (e: React.MouseEvent) => {
      if (!isDown.current || !ref.current) return;
      e.preventDefault();
      const x = e.pageX - ref.current.offsetLeft;
      const walk = (x - startX.current) * 2;
      ref.current.scrollLeft = scrollLeft.current - walk;
    };

    return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
  };

  const ProductCard = ({ product }: { product: Product; key?: React.Key }) => {
    const originalPrice = product.originalPrice || (product.price * 1.18);
    const qty = getProductQuantity(product.id);

    return (
      <div className="bg-white rounded-[40px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 flex flex-col h-full relative group select-none">
        {product.isHighlighted && (
          <div className="absolute top-4 left-4 z-10">
            <span className="bg-[#059669] text-white text-[9px] md:text-[11px] font-black uppercase px-4 py-2 rounded-2xl shadow-lg tracking-widest">Destaque</span>
          </div>
        )}
        <div className="relative aspect-square p-4 flex items-center justify-center overflow-hidden cursor-zoom-in" onClick={() => setZoomedImage(product.image)}>
          <img src={product.image || 'https://via.placeholder.com/400?text=Produto'} className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-105 pointer-events-none" alt={product.name} />
          {!product.inStock && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="bg-gray-900 text-white px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Esgotado</span>
            </div>
          )}
        </div>
        <div className="p-5 md:p-8 flex flex-col items-center text-center flex-grow pt-0">
          <h3 className="text-sm md:text-lg font-bold text-gray-800 leading-tight mb-2">{product.name}</h3>
          <button onClick={(e) => { e.stopPropagation(); setActiveDescriptionProduct(product); }} className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-600 transition-colors mb-4">
            <Info className="h-3 w-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Ver Descrição</span>
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="space-y-1 mb-6">
            <div className="flex flex-col items-center justify-center">
              <span className="text-gray-300 line-through text-xs font-medium">R$ {originalPrice.toFixed(2)}</span>
              <span className="text-[#1a202c] font-black text-2xl md:text-3xl tracking-tighter">R$ {product.price.toFixed(2)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
              {(product.indicationsImageUrl || product.indicationsText) && (
                <button onClick={(e) => { e.stopPropagation(); product.indicationsImageUrl ? setZoomedImage(product.indicationsImageUrl) : setActiveBenefitsText(product); }} className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 transition-colors">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-2">Benefícios</span>
                </button>
              )}
              {product.showNutritionalInfo && product.nutritionalInfo && (
                <button onClick={(e) => { e.stopPropagation(); setActiveNutritionalInfo(product); }} className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 transition-colors">
                  <Activity className="h-3 w-3" />
                  <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-2">Nutricional</span>
                </button>
              )}
            </div>
          </div>
          <div className="w-full mt-auto">
            {qty > 0 ? (
              <div className="w-full flex items-center justify-between bg-gray-50 p-1.5 rounded-[30px] border border-gray-100 shadow-inner">
                <button onClick={(e) => { e.stopPropagation(); onAddToCart(product, -1); }} className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm active:scale-90"><Minus className="h-5 w-5" /></button>
                <span className="text-xl font-black text-gray-900">{qty}</span>
                <button onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }} className="w-12 h-12 flex items-center justify-center text-white rounded-full shadow-lg active:scale-90" style={{ backgroundColor: settings.primaryColor }}><Plus className="h-5 w-5" /></button>
              </div>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onAddToCart(product, 1); }} disabled={!product.inStock} className="w-full py-6 rounded-[30px] font-black uppercase text-sm md:text-base tracking-[0.2em] text-white shadow-2xl transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-30" style={{ backgroundColor: settings.primaryColor }}>Comprar</button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CategorySeparator = ({ category }: { category: Category }) => {
    if (!category || !category.bannerImage) return null;
    return (
      <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-10 mt-0 md:mt-4 md:w-full md:ml-0 md:mr-0 md:static animate-in fade-in slide-in-from-top duration-700">
        <div className="relative w-full aspect-[21/9] md:aspect-[21/4] overflow-hidden rounded-none shadow-none group bg-white">
          <img 
            src={category.bannerImage} 
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-[1.02]" 
             alt={category.name} 
          />
        </div>
      </div>
    );
  };

  const ScrolableRow = ({ children }: { children?: React.ReactNode }) => {
    const dragProps = useDragScroll();
    return (
      <div 
        {...dragProps}
        className="flex overflow-x-auto gap-4 md:gap-8 pb-10 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing scroll-smooth"
      >
        {children}
      </div>
    );
  };

  // LOGICA DE FILTRO ATUALIZADA (ISOLADA)
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
                         p.code.toLowerCase().includes(productCode.toLowerCase());
    
    // Se houver um filtro promocional ativo (Ex: Pele + FlexiGold)
    if (promoFilter && promoFilter.length > 0) {
      return matchesSearch && promoFilter.includes(p.category);
    }
    
    // Filtro padrão por categoria única
    return matchesSearch && (selectedCategory === 'Todas' || p.category === selectedCategory);
  });

  const getTitleCaseClass = () => {
    const mode = settings.categoryTitleCase;
    if (mode === 'lowercase') return 'lowercase';
    if (mode === 'capitalize') return 'capitalize';
    if (mode === 'normal') return '';
    return 'uppercase';
  };

  // FUNCAO ATUALIZADA PARA ABRIR A POPUP (AGORA RECEBE PRODUCTIDS)
  const handleSelectPromo = (categories: string[], productIds?: string[]) => {
    // Busca o título do card que contém essas categorias para exibir na popup
    const card = settings.promoCategoryCards?.find(c => JSON.stringify(c.categories) === JSON.stringify(categories));
    const title = card?.title || "Ofertas Especiais";
    
    setActivePromoPopup({ categories, title, productIds });
    
    // Mantém a funcionalidade de filtro da página principal caso o usuário feche a popup
    setPromoFilter(categories);
    setSelectedCategory('Todas');
  };

  return (
    <div className="w-full pb-32 overflow-x-hidden">
      {zoomedImage && (
        <div className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center">
            <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded-[40px] bg-white p-4 shadow-2xl" alt="Zoom" onClick={e => e.stopPropagation()} />
            <button onClick={() => setZoomedImage(null)} className="absolute -top-4 -right-4 bg-white text-black p-4 rounded-full shadow-2xl z-[610]"><X className="h-6 w-6" /></button>
          </div>
        </div>
      )}

      {/* OVERLAY DO SCANNER RESTAURADO */}
      {isScanning && (
        <div className="fixed inset-0 z-[700] bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg aspect-square bg-gray-900 rounded-[40px] overflow-hidden shadow-2xl border-4 border-emerald-500/30">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay playsInline />
            <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-50 rounded-[40px] shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-scan-line shadow-[0_0_15px_#10b981]" />
            </div>
            <button onClick={stopScanner} className="absolute top-8 right-8 p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="mt-8 text-white font-black uppercase text-xs tracking-[0.2em] animate-pulse">Escaneando...</p>
        </div>
      )}

      {/* INSTRUCOES DE INSTALACAO RESTAURADAS */}
      {showInstallInstructions && (
        <div className="fixed inset-0 z-[650] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowInstallInstructions(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
             <div className="p-10 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><SmartphoneIcon className="h-10 w-10 text-emerald-600" /></div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-4">Instalar Aplicativo</h3>
                <div className="space-y-6 text-left">
                   <div className="flex gap-4 items-start">
                      <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-1">1</div>
                      <p className="text-sm font-medium text-gray-600">No iPhone: Toque no ícone de <strong>Compartilhar</strong> e selecione <strong>Adicionar à Tela de Início</strong>.</p>
                   </div>
                   <div className="flex gap-4 items-start">
                      <div className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-1">2</div>
                      <p className="text-sm font-medium text-gray-600">No Android: Toque nos <strong>três pontos</strong> do navegador e selecione <strong>Instalar Aplicativo</strong>.</p>
                   </div>
                </div>
                <button onClick={() => setShowInstallInstructions(false)} className="w-full mt-10 py-5 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl">Entendi</button>
             </div>
          </div>
        </div>
      )}

      {/* PROMPT DE PERMISSÃO DE CÂMERA RESTAURADO */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[650] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowPermissionPrompt(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
             <div className="p-10 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner"><Camera className="h-10 w-10 text-emerald-600" /></div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-2">Acesso à Câmera</h3>
                <p className="text-gray-500 font-medium mb-10">Precisamos da sua permissão para ler o código de barras dos produtos.</p>
                <div className="flex flex-col gap-4">
                   <button onClick={startScanner} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl">Permitir Acesso</button>
                   <button onClick={() => setShowPermissionPrompt(false)} className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Agora não</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {activeDescriptionProduct && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setActiveDescriptionProduct(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><Info className="h-6 w-6" /></div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Descrição do Produto</h3>
               </div>
               <button onClick={() => setActiveDescriptionProduct(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors">
                <X className="h-6 w-6" />
               </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
               <h4 className="font-black text-lg text-gray-900 leading-tight mb-4">{activeDescriptionProduct.name}</h4>
               <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{activeDescriptionProduct.description}</div>
            </div>
            <div className="p-8 border-t border-gray-50"><button onClick={() => setActiveDescriptionProduct(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Fechar</button></div>
          </div>
        </div>
      )}

      {activeNutritionalInfo && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setActiveNutritionalInfo(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-50 p-8 border-b flex justify-between items-center">
              <div className="flex items-center gap-4"><div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600"><Activity className="h-6 w-6" /></div><h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tabela Nutricional</h3></div>
              <button onClick={() => setActiveNutritionalInfo(null)} className="p-2 bg-white rounded-full text-gray-400"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar text-sm text-gray-600 whitespace-pre-wrap">{activeNutritionalInfo.nutritionalInfo}</div>
            <div className="p-8 border-t"><button onClick={() => setActiveNutritionalInfo(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs">Fechar</button></div>
          </div>
        </div>
      )}

      {activeBenefitsText && (
        <div className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setActiveBenefitsText(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gray-50 p-8 border-b flex justify-between items-center">
              <div className="flex items-center gap-4"><div className="p-3 bg-purple-100 rounded-2xl text-purple-600"><Sparkles className="h-6 w-6" /></div><h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Benefícios</h3></div>
              <button onClick={() => setActiveBenefitsText(null)} className="p-2 bg-white rounded-full text-gray-400"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar text-base font-semibold text-gray-600 whitespace-pre-wrap">{renderFormattedText(activeBenefitsText.indicationsText || '')}</div>
            <div className="p-8 border-t"><button onClick={() => setActiveBenefitsText(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs">Fechar</button></div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-12">
            <div className="relative inline-block"><div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping"></div><div className="relative bg-white p-10 rounded-[45px] shadow-2xl border border-emerald-50"><ShieldCheck className="h-20 w-20 text-emerald-600" /></div></div>
            <div className="space-y-4"><h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-tight">Acesso ao <br/><span className="text-emerald-600">Portal de Pedidos</span></h1><p className="text-gray-500 font-medium text-lg leading-relaxed">Bem-vindo à Herbamed Industrial. O catálogo está pronto para você.</p></div>
            <button onClick={handleAcceptWelcome} className="w-full py-6 bg-gray-900 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all">Acessar Catálogo <ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      )}

      <div className="w-full relative">
        {settings.bannerMode === 'video' ? (
          <div className="w-full aspect-video md:max-h-[450px] bg-black overflow-hidden">
            {settings.bannerVideoFileUrl ? <video className="w-full h-full object-cover" autoPlay muted loop playsInline src={settings.bannerVideoFileUrl} /> : <iframe className="w-full h-full" src={getYoutubeEmbedUrl(settings.bannerVideoUrl)} frameBorder="0" allowFullScreen></iframe>}
          </div>
        ) : settings.bannerMode === 'carousel' && settings.bannerImages?.length > 0 ? (
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
              {settings.bannerImages.map((img, idx) => <div key={idx} className="w-full flex-shrink-0"><ResponsiveBanner src={img || DEFAULT_BANNER} /></div>)}
            </div>
          </div>
        ) : (
          <ResponsiveBanner src={settings.bannerImageUrl || DEFAULT_BANNER} />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* RECURSO ADICIONAL: CARROSSEL DE CARDS PROMOCIONAIS (TOPO) */}
        {settings.promoCategoryCards && settings.promoCategoryCards.length > 0 && (
          <PromoCategoryCarousel 
            cards={settings.promoCategoryCards} 
            settings={settings} 
            onSelectPromo={handleSelectPromo} 
            position="top" 
          />
        )}

        <div className="flex items-start space-x-8 overflow-x-auto pt-4 pb-10 mb-2 no-scrollbar px-2 -mx-4 sm:-mx-6 lg:-mx-8 pl-4 sm:pl-6 lg:pl-8">
          {settings.categories.map(cat => {
            const isActive = selectedCategory === cat.name && !promoFilter;
            return (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat.name); setPromoFilter(null); }} className="flex flex-col items-center space-y-4 flex-shrink-0 group">
                <div 
                  className={`w-20 h-20 rounded-full ring-4 ring-inset transition-all duration-500 overflow-hidden shadow-xl relative ${isActive ? 'scale-110' : 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100'}`} 
                  style={{ 
                    '--tw-ring-color': isActive ? settings.primaryColor : 'white',
                    backgroundColor: 'transparent'
                  } as React.CSSProperties}
                >
                  {cat.image ? (
                    <img src={cat.image} className="w-full h-full object-cover object-center pointer-events-none" alt={cat.name} />
                  ) : <div className="bg-gray-50 w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-200" /></div>}
                </div>
                <span className={`text-[11px] font-black tracking-[0.2em] transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'} ${getTitleCaseClass()}`}>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* FEEDBACK DE FILTRO PROMOCIONAL ATIVO */}
        {promoFilter && (
           <div className="mb-8 animate-in slide-in-from-top-4 duration-500">
             <button onClick={() => setPromoFilter(null)} className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-black uppercase text-[10px] tracking-widest hover:bg-emerald-100 transition-all">
                <span>Remover Filtro Especial</span>
                <X className="h-4 w-4" />
             </button>
           </div>
        )}

        <div className="max-w-4xl mx-auto mb-10 px-2">
           <button onClick={handleInstallClick} className="w-full bg-white border-2 border-emerald-100 p-6 rounded-[32px] flex items-center justify-between group hover:border-emerald-500 transition-all shadow-sm">
             <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><SmartphoneIcon className="h-6 w-6" /></div><div><h4 className="text-sm font-black text-gray-900 uppercase">Instalar Aplicativo</h4><p className="text-[10px] font-bold text-gray-400 uppercase">Acesso rápido e offline na tela de início</p></div></div>
             <div className="flex items-center gap-2 text-emerald-600"><span className="hidden sm:inline text-[10px] font-black uppercase">Instalar App</span><PlusSquare className="h-5 w-5" /></div>
           </button>
        </div>

        <div className="max-w-4xl mx-auto mb-16 px-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
              <input ref={searchInputRef} type="text" placeholder="Buscar por nome..." className="block w-full pl-14 pr-6 py-6 bg-white border border-gray-100 rounded-[28px] text-base font-medium shadow-sm outline-none focus:border-emerald-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative md:w-64 flex items-center gap-2">
              <div className="relative flex-grow">
                <Barcode className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                <input type="text" placeholder="CÓDIGO !" className="block w-full pl-14 pr-12 py-6 bg-white border border-gray-100 rounded-[28px] text-base font-medium shadow-sm outline-none focus:border-emerald-500 transition-all uppercase" value={productCode} onChange={e => setProductCode(e.target.value)} />
                {productCode && <button onClick={() => setProductCode('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500"><X className="h-4 w-4" /></button>}
              </div>
              <button onClick={handleScannerClick} className="p-6 bg-[#111827] text-white rounded-[28px] shadow-xl active:scale-95 transition-all"><ScanLine className="h-6 w-6" /></button>
            </div>
          </div>
        </div>

        <div className="w-full">
          {/* RECURSO ADICIONAL: CARROSSEL DE CARDS PROMOCIONAIS (MEIO) */}
          {settings.promoCategoryCards && settings.promoCategoryCards.length > 0 && (
            <PromoCategoryCarousel 
              cards={settings.promoCategoryCards} 
              settings={settings} 
              onSelectPromo={handleSelectPromo} 
              position="middle" 
            />
          )}

          {selectedCategory === 'Todas' && !promoFilter ? (
            <div className="space-y-16">
              {settings.categories
                .filter(cat => cat.name !== 'Todas')
                .map(cat => {
                  const catProducts = products.filter(p => 
                    p.category === cat.name && 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    p.code.toLowerCase().includes(productCode.toLowerCase())
                  );
                  
                  if (catProducts.length === 0) return null;

                  return (
                    <div key={cat.id} className="space-y-8 animate-in fade-in duration-700">
                      <CategorySeparator category={cat} />
                      <ScrolableRow>
                        {catProducts.map(p => (
                          <div key={p.id} className="min-w-[170px] md:min-w-[280px] snap-start flex-shrink-0">
                            <ProductCard product={p} />
                          </div>
                        ))}
                      </ScrolableRow>
                    </div>
                  );
                })}
            </div>
          ) : (
            <>
              {settings.categories
                .find(c => c.name.trim().toLowerCase() === selectedCategory.trim().toLowerCase()) && (
                <CategorySeparator category={settings.categories.find(c => c.name.trim().toLowerCase() === selectedCategory.trim().toLowerCase())!} />
              )}
              <ScrolableRow>
                {filteredProducts.map(p => (
                  <div key={p.id} className="min-w-[170px] md:min-w-[280px] snap-start flex-shrink-0">
                    <ProductCard product={p} />
                  </div>
                ))}
              </ScrolableRow>
            </>
          )}

          {/* RECURSO ADICIONAL: CARROSSEL DE CARDS PROMOCIONAIS (FINAL) */}
          {settings.promoCategoryCards && settings.promoCategoryCards.length > 0 && (
            <div className="mt-20">
              <PromoCategoryCarousel 
                cards={settings.promoCategoryCards} 
                settings={settings} 
                onSelectPromo={handleSelectPromo} 
                position="bottom" 
              />
            </div>
          )}
          
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center"><ImageIcon className="h-12 w-12 text-gray-200 mx-auto mb-4" /><p className="text-gray-400 font-bold uppercase text-xs">Nenhum item encontrado</p></div>
          )}
        </div>
      </div>

      {/* COMPONENTE ADICIONAL ISOLADO: POPUP DE PRODUTOS PROMOCIONAIS */}
      {activePromoPopup && (
        <PromoCategoryPopup 
          isOpen={!!activePromoPopup}
          onClose={() => setActivePromoPopup(null)}
          title={activePromoPopup.title}
          categories={activePromoPopup.categories}
          productIds={activePromoPopup.productIds}
          allProducts={products}
          settings={settings}
          onAddToCart={onAddToCart}
          cart={cart}
        />
      )}

      {/* ESTILOS DO SCANNER RESTAURADOS */}
      <style>{`
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan-line {
          animation: scan-line 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

const ResponsiveBanner = ({ src }: { src: string }) => (
  <div className="w-full relative overflow-hidden flex items-center justify-center aspect-[16/9] md:aspect-[21/5] bg-gray-100">
    <img src={src} className="absolute inset-0 w-full h-full object-cover transition-all duration-700" alt="Banner" />
  </div>
);