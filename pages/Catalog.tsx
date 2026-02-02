import React, { useState, useEffect, useRef } from 'react';
import { Product, SiteSettings } from '../types';
import { Search, Plus, Minus, X, ScanLine, Share, Image as ImageIcon, Play, Smartphone, Barcode, Camera, RefreshCw, PlusSquare, Download, AlertCircle, ShieldCheck, Sparkles, ChevronRight, Maximize2, FileText, Calendar, Info, ChevronDown, ChevronUp, ClipboardList, Activity, Smartphone as SmartphoneIcon } from 'lucide-react';

interface CatalogProps {
  products: Product[];
  onAddToCart: (product: Product, quantity: number) => void;
  settings: SiteSettings;
  cart: { product: Product; quantity: number }[];
}

export const Catalog: React.FC<CatalogProps> = ({ products, onAddToCart, settings, cart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [productCode, setProductCode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // States para interações
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('herbamed_welcome_accepted');
  });
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

  const getYoutubeEmbedUrl = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regExp);
    const id = (match && match[1].length === 11) ? match[1] : null;
    
    if (!id) return '';
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&enablejsapi=1&rel=0&iv_load_policy=3&modestbranding=1&origin=${window.location.origin}`;
  };

  useEffect(() => {
    if (settings.bannerMode === 'carousel' && settings.bannerImages?.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex(prev => (prev + 1) % settings.bannerImages.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [settings.bannerMode, settings.bannerImages]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallInstructions(true);
    }
  };

  useEffect(() => {
    const handleTriggerSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('trigger-catalog-search', handleTriggerSearch);
    
    const checkFocusState = () => {
      try {
        if (window.history.state?.usr?.focusSearch) {
          handleTriggerSearch();
        }
      } catch (e) {}
    };
    
    const timeoutId = setTimeout(checkFocusState, 300);

    return () => {
      window.removeEventListener('trigger-catalog-search', handleTriggerSearch);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleScannerClick = () => {
    setShowPermissionPrompt(true);
  };

  const startScanner = async () => {
    setShowPermissionPrompt(false);
    setScannerError(null);
    setIsScanning(true);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScannerError("Seu navegador ou dispositivo não suporta o acesso direto à câmera.");
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Play automático bloqueado.");
        }
      }
      
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code']
        });
        
        const detect = async () => {
          if (!isScanning || !videoRef.current || !streamRef.current?.active) return;
          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              handleScanSuccess(code);
            } else {
              requestAnimationFrame(detect);
            }
          } catch (e) {
            console.error("Erro na detecção.");
          }
        };
        detect();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setScannerError("Permissão negada. Clique no ícone de CADEADO no navegador e mude 'Câmera' para 'Permitir'.");
      } else {
        setScannerError(`Erro: ${err.message || 'Não foi possível acessar a câmera'}.`);
      }
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setShowPermissionPrompt(false);
  };

  const handleScanSuccess = (code: string) => {
    setProductCode(code);
    stopScanner();
    if (navigator.vibrate) navigator.vibrate(200);
  };

  const handleAcceptWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('herbamed_welcome_accepted', 'true');
  };

  const ResponsiveBanner = ({ src }: { src: string }) => (
    <div className="w-full overflow-hidden flex items-center justify-center bg-gray-100">
      <img src={src} className="w-full h-auto block object-cover" alt="Banner" style={{ maxHeight: '450px', minHeight: '200px' }} />
    </div>
  );

  const getProductQuantity = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    return item ? item.quantity : 0;
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-black text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="w-full pb-32">
      {/* MODAL DE ZOOM DA FOTO */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 md:p-12 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-full flex items-center justify-center">
            <img 
              src={zoomedImage} 
              className="max-w-full max-h-[90vh] object-contain rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-white p-4 animate-in zoom-in duration-500" 
              alt="Zoom do Produto"
              onClick={(e) => e.stopPropagation()}
            />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 md:top-4 md:right-4 bg-white text-black p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all z-[610]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE DESCRIÇÃO COMPLETA */}
      {activeDescriptionProduct && (
        <div 
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={() => setActiveDescriptionProduct(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                     <Info className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Descrição do Produto</h3>
               </div>
               <button onClick={() => setActiveDescriptionProduct(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors">
                 <X className="h-6 w-6" />
               </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="mb-4">
                 <h4 className="font-black text-lg text-gray-900 leading-tight">{activeDescriptionProduct.name}</h4>
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">{activeDescriptionProduct.category}</p>
               </div>
               <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {activeDescriptionProduct.description || "Nenhuma descrição detalhada disponível no momento."}
               </div>
            </div>
            <div className="p-8 border-t border-gray-50">
               <button onClick={() => setActiveDescriptionProduct(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INFORMAÇÃO NUTRICIONAL */}
      {activeNutritionalInfo && (
        <div 
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={() => setActiveNutritionalInfo(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600">
                     <Activity className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Tabela Nutricional</h3>
               </div>
               <button onClick={() => setActiveNutritionalInfo(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors">
                 <X className="h-6 w-6" />
               </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                  {activeNutritionalInfo.nutritionalInfo || "Nenhuma informação nutricional detalhada cadastrada para este item."}
               </div>
               <div className="mt-10 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-widest text-center">Produto Premium Herbamed - Qualidade Industrial</p>
               </div>
            </div>
            <div className="p-8 border-t border-gray-50">
               <button onClick={() => setActiveNutritionalInfo(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Fechar Leitura</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BENEFÍCIOS (TEXTO) */}
      {activeBenefitsText && (
        <div 
          className="fixed inset-0 z-[600] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300"
          onClick={() => setActiveBenefitsText(null)}
        >
          <div 
            className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-50 p-8 border-b border-gray-100 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-2xl text-purple-600">
                     <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Benefícios e Indicações</h3>
               </div>
               <button onClick={() => setActiveBenefitsText(null)} className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 transition-colors">
                 <X className="h-6 w-6" />
               </button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto no-scrollbar">
               <div className="text-base text-gray-600 leading-relaxed font-semibold whitespace-pre-wrap">
                  {renderFormattedText(activeBenefitsText.indicationsText || "Nenhuma indicação detalhada cadastrada em texto para este item.")}
               </div>
            </div>
            <div className="p-8 border-t border-gray-50">
               <button onClick={() => setActiveBenefitsText(null)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">Concluir Leitura</button>
            </div>
          </div>
        </div>
      )}

      {/* TELA DE ENTRADA */}
      {showWelcome && (
        <div className="fixed inset-0 z-[500] bg-white flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="max-w-md w-full text-center space-y-12">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-ping"></div>
              <div className="relative bg-white p-10 rounded-[45px] shadow-2xl border border-emerald-50">
                <ShieldCheck className="h-20 w-20 text-emerald-600" />
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-tight">
                Acesso ao <br/><span className="text-emerald-600">Portal de Pedidos</span>
              </h1>
              <p className="text-gray-500 font-medium text-lg leading-relaxed">
                Para uma experiência completa e uso do leitor de códigos, solicitaremos permissão para sua câmera a seguir.
              </p>
            </div>

            <button 
              onClick={handleAcceptWelcome}
              className="w-full py-6 bg-gray-900 text-white rounded-[28px] font-black uppercase text-xs tracking-[0.3em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all group"
            >
              <span>Acessar Agora</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Pré-Autorização */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-sm p-10 shadow-2xl relative overflow-hidden text-center">
             <button onClick={() => setShowPermissionPrompt(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400">
               <X className="h-5 w-5" />
             </button>
             <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
               <Camera className="h-10 w-10 text-emerald-600" />
             </div>
             <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">Ativar Câmera</h3>
             <p className="text-gray-500 text-sm font-medium leading-relaxed mb-10">
               Ao clicar abaixo, o navegador perguntará se você permite o uso da câmera. Escolha "Permitir" para usar o leitor.
             </p>
             <div className="space-y-3">
               <button onClick={startScanner} className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all">Autorizar Agora</button>
               <button onClick={() => setShowPermissionPrompt(false)} className="w-full py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Agora não</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal do Scanner */}
      {isScanning && (
        <div className="fixed inset-0 z-[250] bg-black flex flex-col animate-in fade-in duration-300">
          <div className="p-6 flex justify-between items-center text-white z-10">
            <h3 className="text-sm font-black uppercase tracking-widest">Scanner de SKU / EAN</h3>
            <button onClick={stopScanner} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-grow relative flex items-center justify-center overflow-hidden bg-black">
            {scannerError ? (
              <div className="p-10 text-center space-y-6 max-w-sm mx-auto">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
                  <AlertCircle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-white font-black uppercase text-xs tracking-widest">Acesso à Câmera</h4>
                  <p className="text-white/60 text-sm leading-relaxed">{scannerError}</p>
                </div>
                <div className="pt-4 space-y-3">
                  <button onClick={startScanner} className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Tentar Novamente</button>
                  <button onClick={stopScanner} className="w-full py-4 bg-white/10 text-white/60 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-white/5">Voltar</button>
                </div>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="relative z-10 w-72 h-48 border-2 border-emerald-500 rounded-3xl shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-full h-0.5 bg-emerald-500/50 animate-scan-line shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                  </div>
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                </div>
              </>
            )}
          </div>
          
          <div className="p-10 text-center text-white/60 space-y-6 z-10">
            <p className="text-[10px] font-black uppercase tracking-widest">Posicione o código de barras no centro do quadro</p>
            {!scannerError && (
              <button 
                onClick={() => {
                  const randomProduct = products[Math.floor(Math.random() * products.length)];
                  handleScanSuccess(randomProduct.code);
                }}
                className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
              >
                Capturar Imagem
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal Instruções PWA */}
      {showInstallInstructions && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl relative">
            <button onClick={() => setShowInstallInstructions(false)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center">
              <div className="inline-flex p-5 bg-emerald-50 rounded-[24px] mb-6"><Smartphone className="h-10 w-10 text-emerald-600" /></div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase mb-2">Instalação Manual</h3>
              <p className="text-gray-500 text-sm font-medium mb-6">Siga os passos para ter o App em sua tela inicial:</p>
              
              <div className="space-y-4 text-left bg-gray-50 p-6 rounded-3xl mb-8 border border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">1</div>
                  <p className="text-xs font-bold text-gray-700">Clique no ícone de <span className="text-emerald-600">Compartilhar</span> ou nos <span className="text-emerald-600">3 pontos</span> do navegador.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">2</div>
                  <p className="text-xs font-bold text-gray-700">Procure pela opção <span className="text-emerald-600">"Adicionar à Tela de Início"</span> ou <span className="text-emerald-600">"Instalar Aplicativo"</span>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 text-[10px] font-black">3</div>
                  <p className="text-xs font-bold text-gray-700">Pronto! O ícone da Herbamed aparecerá junto aos seus outros apps.</p>
                </div>
              </div>

              <button onClick={() => setShowInstallInstructions(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Entendi!</button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Area */}
      <div className="w-full bg-white border-b border-gray-100 relative">
        {settings.bannerMode === 'video' ? (
          <div className="w-full aspect-video md:max-h-[450px] bg-black flex flex-col items-center justify-center overflow-hidden">
            {settings.bannerVideoFileUrl ? (
              <video 
                className="w-full h-full z-10"
                controls={false}
                autoPlay 
                muted 
                loop
                playsInline
                src={settings.bannerVideoFileUrl}
              />
            ) : (
              <iframe 
                className="w-full h-full z-10" 
                src={getYoutubeEmbedUrl(settings.bannerVideoUrl)} 
                title="Vídeo de Apresentação" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                sandbox="allow-forms allow-scripts allow-pointer-lock allow-same-origin allow-top-navigation allow-presentation"
                allowFullScreen
              ></iframe>
            )}
          </div>
        ) : settings.bannerMode === 'carousel' && settings.bannerImages?.length > 0 ? (
          <div className="relative overflow-hidden">
            <div className="flex transition-transform duration-1000 ease-in-out" style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}>
              {settings.bannerImages.map((img, idx) => (
                <div key={idx} className="w-full flex-shrink-0">
                  <ResponsiveBanner src={img || DEFAULT_BANNER} />
                </div>
              ))}
            </div>
            {settings.bannerImages.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                {settings.bannerImages.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentBannerIndex(idx)} className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentBannerIndex ? 'w-8 bg-white shadow-lg' : 'w-2 bg-white/40'}`} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <ResponsiveBanner src={settings.bannerImageUrl || DEFAULT_BANNER} />
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categorias */}
        <div className="flex items-start space-x-8 overflow-x-auto pt-4 pb-10 mb-2 no-scrollbar px-2">
          {settings.categories.map(cat => {
            const isActive = selectedCategory === cat.name;
            return (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className="flex flex-col items-center space-y-4 flex-shrink-0 group">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 transition-all duration-500 overflow-hidden shadow-xl ${isActive ? 'scale-110' : 'bg-white border-white opacity-50 grayscale hover:grayscale-0 hover:opacity-100'}`} style={{ borderColor: isActive ? settings.primaryColor : 'transparent' }}>
                  {cat.image ? <img src={cat.image} className="w-full h-full object-cover" /> : <div className="bg-gray-50 w-full h-full flex items-center justify-center"><ImageIcon className="h-8 w-8 text-gray-200" /></div>}
                </div>
                <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Botão PWA */}
        <div className="max-w-4xl mx-auto mb-10 px-2 animate-in fade-in slide-in-from-top-4 duration-700">
           <button 
             onClick={handleInstallClick}
             className="w-full bg-white border-2 border-emerald-100 p-6 rounded-[32px] flex items-center justify-between group hover:border-emerald-500 transition-all shadow-sm active:scale-[0.98]"
           >
             <div className="flex items-center gap-4 text-left">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                   <SmartphoneIcon className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">Instalar Aplicativo</h4>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Acesso rápido e offline na sua tela de início</p>
                </div>
             </div>
             <div className="flex items-center gap-2 text-emerald-600">
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Instalar App</span>
                <PlusSquare className="h-5 w-5" />
             </div>
           </button>
        </div>

        {/* BUSCA */}
        <div className="max-w-4xl mx-auto mb-16 px-2">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center"><Search className="h-5 w-5 text-gray-300" /></div>
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar por nome..." 
                className="block w-full pl-14 pr-6 py-6 bg-white border border-gray-100 rounded-[28px] text-base font-medium shadow-sm outline-none focus:border-emerald-500 transition-all" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <div className="relative md:w-64 group flex items-center gap-2">
               <div className="relative flex-grow">
                 <div className="absolute inset-y-0 left-0 pl-6 flex items-center"><Barcode className="h-5 w-5 text-gray-300" /></div>
                 <input type="text" placeholder="Código SKU..." className="block w-full pl-14 pr-12 py-6 bg-white border border-gray-100 rounded-[28px] text-base font-medium shadow-sm outline-none focus:border-emerald-500 transition-all uppercase" value={productCode} onChange={(e) => setProductCode(e.target.value)} />
                 {productCode && (
                    <button 
                      onClick={() => setProductCode('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                 )}
               </div>
               <button 
                 onClick={handleScannerClick}
                 className="p-6 bg-gray-900 text-white rounded-[28px] shadow-xl hover:scale-105 active:scale-95 transition-all"
               >
                 <ScanLine className="h-6 w-6" />
               </button>
            </div>
          </div>
        </div>

        {/* Grade de Produtos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-10">
          {products
            .filter(p => (selectedCategory === 'Todas' || p.category === selectedCategory) && 
                    p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                    p.code.toLowerCase().includes(productCode.toLowerCase()))
            .map(product => {
              const originalPrice = product.originalPrice || (product.price * 1.18);
              const qty = getProductQuantity(product.id);

              return (
                <div key={product.id} className="bg-white rounded-[40px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-500 border border-gray-100 flex flex-col h-full relative group">
                  
                  {product.isHighlighted && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-[#059669] text-white text-[9px] md:text-[11px] font-black uppercase px-4 py-2 rounded-2xl shadow-lg tracking-widest">Destaque</span>
                    </div>
                  )}

                  <div 
                    className="relative aspect-square p-4 flex items-center justify-center overflow-hidden cursor-zoom-in group/img"
                    onClick={() => setZoomedImage(product.image)}
                  >
                    <img src={product.image || 'https://via.placeholder.com/400?text=Produto'} className="max-w-full max-h-full object-contain transition-all duration-700 group-hover:scale-105" alt={product.name} />
                    <div className="absolute bottom-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <Maximize2 className="h-4 w-4 text-gray-400" />
                    </div>
                    {!product.inStock && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
                        <span className="bg-gray-900 text-white px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Esgotado</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 md:p-8 flex flex-col items-center text-center flex-grow pt-0">
                    <h3 className="text-sm md:text-lg font-bold text-gray-800 leading-tight mb-2">
                      {product.name}
                    </h3>
                    
                    <button 
                      onClick={() => setActiveDescriptionProduct(product)}
                      className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-600 transition-colors mb-4"
                    >
                      <Info className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Ver Descrição</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>

                    <div className="space-y-1 mb-6">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-gray-300 line-through text-xs font-medium">R$ {originalPrice.toFixed(2)}</span>
                        <span className="text-[#1a202c] font-black text-2xl md:text-3xl tracking-tighter">R$ {product.price.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 mt-2">
                        {product.expirationDate && (
                          <div className="flex items-center gap-1.5 text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Venc: {product.expirationDate}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center justify-center gap-4 mt-1">
                          {(product.indicationsImageUrl || product.indicationsText) && (
                            <button 
                              onClick={() => {
                                if (product.indicationsImageUrl) setZoomedImage(product.indicationsImageUrl);
                                else setActiveBenefitsText(product);
                              }}
                              className="flex items-center gap-1.5 text-purple-600 hover:text-purple-700 transition-colors"
                            >
                              <Sparkles className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-2">Benefícios</span>
                            </button>
                          )}

                          {product.showBula && product.bulaUrl && (
                            <a 
                              href={product.bulaUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-2">Bula</span>
                            </a>
                          )}
                          
                          {product.showNutritionalInfo && product.nutritionalInfo && (
                            <button 
                              onClick={() => setActiveNutritionalInfo(product)}
                              className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 transition-colors"
                            >
                              <Activity className="h-3 w-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest underline decoration-2 underline-offset-2">Nutricional</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex flex-col items-center gap-4 mt-auto">
                      {qty > 0 ? (
                        <div className="w-full flex items-center justify-between bg-gray-50 p-1.5 rounded-[30px] border border-gray-100 shadow-inner">
                          <button 
                            onClick={() => onAddToCart(product, -1)} 
                            className="w-12 h-12 flex items-center justify-center bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm transition-all active:scale-90"
                          >
                            <Minus className="h-5 w-5" />
                          </button>
                          <span className="text-xl font-black text-gray-900">{qty}</span>
                          <button 
                            onClick={() => onAddToCart(product, 1)} 
                            className="w-12 h-12 flex items-center justify-center text-white rounded-full shadow-lg transition-all active:scale-90"
                            style={{ backgroundColor: settings.primaryColor }}
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => onAddToCart(product, 1)} 
                          disabled={!product.inStock}
                          className="w-full py-6 rounded-[30px] font-black uppercase text-sm md:text-base tracking-[0.2em] text-white shadow-2xl transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                          style={{ backgroundColor: settings.primaryColor }}
                        >
                          Comprar
                        </button>
                      )}

                      <a 
                        href={`https://wa.me/?text=Confira este produto premium no catálogo Herbamed: ${product.name} - R$ ${product.price.toFixed(2)}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-[70%] flex items-center justify-center gap-1.5 py-1.5 md:py-2 rounded-[16px] font-black text-[7px] md:text-[8px] uppercase border transition-all hover:bg-gray-50 active:scale-95 tracking-[0.1em] opacity-40 hover:opacity-100"
                        style={{ color: settings.primaryColor, borderColor: `${settings.primaryColor}20` }}
                      >
                        <Share className="h-2.5 w-2.5" />
                        Compartilhar
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
};