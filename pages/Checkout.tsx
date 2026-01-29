import React, { useState, useEffect } from 'react';
import { CreditCard, Truck, ShieldCheck, FileText, CheckCircle2, ArrowRight, AlertCircle, CheckCircle, Loader2, Store, Edit3, Download, Printer, Clock, Package, Home, Sparkles, Mail, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SiteSettings, CartItem, Order, User } from '../types';
import { supabase } from '../lib/supabase';

const Confetti = () => {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[150] overflow-hidden">
      {[...Array(50)].map((_, i) => {
        const size = Math.random() * 10 + 5;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const left = Math.random() * 100;
        const duration = Math.random() * 3 + 2;
        const delay = Math.random() * 2;
        return (
          <div
            key={i}
            className="absolute rounded-sm animate-confetti"
            style={{
              width: `${size}px`,
              height: `${size * 0.6}px`,
              backgroundColor: color,
              left: `${left}%`,
              top: `-20px`,
              opacity: 0.8,
              transform: `rotate(${Math.random() * 360}deg)`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

export const Checkout: React.FC<{ cart: CartItem[], settings: SiteSettings, onPlaceOrder: (order: Order) => void, onClearCart: () => void, user: User | null }> = ({ cart, settings, onPlaceOrder, onClearCart, user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    razaoSocial: user?.razaoSocial || '',
    cnpj: user?.cnpj || '',
    responsible: user?.name || '',
    phone: user?.contato || '',
    billingTerm: settings.billingOptions[0] || '',
    customBillingTerm: '',
    observation: ''
  });
  
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showCustomTermInput, setShowCustomTermInput] = useState(false);
  
  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  useEffect(() => {
    if (success) {
      window.scrollTo(0, 0);
    }
  }, [success]);

  const handleCnpjMask = (val: string) => {
    const raw = val.replace(/\D/g, '');
    return raw.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1');
  };

  const handlePhoneMask = (val: string) => {
    const raw = val.replace(/\D/g, '');
    if (raw.length <= 10) return raw.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    return raw.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
  };

  const getOrderHtml = (order: Order) => {
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #eee; background-color: #ffffff;">
        <td style="padding: 12px 10px; font-size: 13px; color: #333; text-align: left;">${item.product.name}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #333; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #333; text-align: right;">R$ ${item.product.price.toFixed(2)}</td>
        <td style="padding: 12px 10px; font-size: 13px; color: #000; text-align: right; font-weight: bold;">R$ ${(item.product.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; width: 700px; background: white; border: 1px solid #eee;">
        <div style="border-bottom: 4px solid ${settings.primaryColor}; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: inline-block; vertical-align: top;">
            <h1 style="margin:0; color:#111; font-size: 28px;">${settings.brandName}</h1>
            <p style="margin:5px 0 0 0; font-size:12px; font-weight:bold; color:${settings.primaryColor}">COMPROVANTE DE PEDIDO</p>
          </div>
          <div style="display: inline-block; vertical-align: top; text-align:right">
            <strong style="font-size: 18px;">PEDIDO #${order.id}</strong><br>
            <span style="font-size: 14px; color: #666;">${order.date}</span>
          </div>
        </div>
        <div style="margin-top:30px; padding:25px; background:#f9fafb; border-radius:15px; border: 1px solid #eee;">
          <div style="margin-bottom: 10px;"><strong style="color: #666;">Cliente:</strong> <span style="font-weight: bold;">${order.customer.razaoSocial}</span></div>
          <div style="margin-bottom: 10px;"><strong style="color: #666;">CNPJ:</strong> ${order.customer.cnpj}</div>
          <div style="margin-bottom: 10px;"><strong style="color: #666;">Responsável:</strong> ${order.customer.responsible}</div>
          <div><strong style="color: #666;">Condição:</strong> ${order.billingTerm}</div>
        </div>
        
        <div style="margin-top: 40px; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="text-align: left; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd;">Produto</th>
                <th style="text-align: center; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd;">Qtd</th>
                <th style="text-align: right; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd;">Unitário</th>
                <th style="text-align: right; padding: 12px 10px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd;">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
        </div>

        <div style="margin-top: 40px; border-top: 2px solid #eee; padding-top: 20px; text-align: right;">
          <span style="font-size: 16px; color: #666; font-weight: bold;">TOTAL DO PEDIDO:</span><br>
          <span style="font-size: 32px; font-weight: 900; color: ${settings.primaryColor};">R$ ${order.total.toFixed(2)}</span>
        </div>
      </div>
    `;
  };

  const generatePDF = (order: Order) => {
    const element = document.createElement('div');
    element.innerHTML = getOrderHtml(order);
    const opt = {
      margin: [0.2, 0.2],
      filename: `pedido_${order.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    (window as any).html2pdf().from(element).set(opt).save();
  };

  const sendToWebhook = async (order: Order) => {
    const WEBHOOK_URL = 'https://hook.eu1.make.com/auukxvfpxiijzn59aoh8egup36lmbkq5'; 
    let publicUrl = 'Link indisponível (Erro Supabase)';

    try {
      const element = document.createElement('div');
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '750px'; // Levemente maior para garantir espaço
      element.style.background = '#ffffff';
      element.style.zIndex = '9999';
      element.innerHTML = getOrderHtml(order);
      document.body.appendChild(element);

      // Aguarda 2 segundos para garantir que o HTML e as tabelas estejam prontos para o canvas
      await new Promise(resolve => setTimeout(resolve, 2000));

      const opt = {
        margin: [0.2, 0.2],
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { 
          scale: 1.5, 
          useCORS: true, 
          backgroundColor: '#ffffff',
          logging: false,
          removeContainer: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const pdfBlob = await (window as any).html2pdf().set(opt).from(element).output('blob');
      document.body.removeChild(element);

      if (pdfBlob && pdfBlob.size > 100) {
        const fileName = `pedido-${order.id}-${Date.now()}.pdf`;
        const filePath = `webhook-sync/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pedidos')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('pedidos').getPublicUrl(filePath);
          if (data?.publicUrl) {
            publicUrl = data.publicUrl;
          }
        } else {
          publicUrl = `Erro Upload: ${uploadError.message}`;
        }
      }
    } catch (err: any) {
      publicUrl = `Erro PDF: ${err.message || 'Falha na geração'}`;
    }

    try {
      const payload = {
        pedido_id: order.id,
        nome_cliente: order.customer.razaoSocial,
        email_cliente: order.customerEmail,
        para: 'aneherbamed@gmail.com',
        TO: 'aneherbamed@gmail.com',
        Subject: "PEDIDO HERBAMED RECEBIDO",
        "URL do PDF": publicUrl,
        url_pdf: publicUrl,
        total: `R$ ${order.total.toFixed(2).replace('.', ',')}`,
        dados: order.date,
        data: order.date,
        subject: "PEDIDO HERBAMED RECEBIDO",
        contato: order.customer.phone,
        prazo: order.billingTerm,
        itens: order.items.map(item => `${item.quantity}x ${item.product.name}`).join(', '),
        cnpj_cliente: order.customer.cnpj
      };

      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Erro Fatal Webhook:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (total < settings.minOrderValue) return;
    if (!agreedToPrivacy) { alert("Você deve concordar com a Política de Privacidade."); return; }
    const finalTerm = showCustomTermInput ? formData.customBillingTerm : formData.billingTerm;
    if (!finalTerm) { alert("Selecione um prazo."); return; }

    setIsProcessing(true);
    
    const order: Order = {
      id: Math.random().toString(36).substr(2, 6).toUpperCase(),
      date: new Date().toLocaleDateString('pt-BR'),
      customerEmail: user?.email || 'convidado',
      customer: {
        razaoSocial: formData.razaoSocial,
        cnpj: formData.cnpj,
        responsible: formData.responsible,
        phone: formData.phone
      },
      items: [...cart],
      total: total,
      billingTerm: finalTerm,
      status: 'Pendente',
      observation: formData.observation
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
    await sendToWebhook(order);

    setLastOrder(order);
    onPlaceOrder(order);
    onClearCart();
    setIsProcessing(false);
    setSuccess(true);
    
    window.open(`https://wa.me/${settings.contactWhatsapp}?text=*NOVO PEDIDO*%0A*ID:* ${order.id}%0A*Total:* R$ ${order.total.toFixed(2)}%0A%0A_O link do comprovante foi enviado ao setor comercial._`, '_blank');
  };

  if (success && lastOrder) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 flex flex-col items-center animate-in fade-in duration-700">
        <Confetti />
        <div className="bg-white rounded-[40px] p-12 shadow-2xl border border-emerald-50 text-center w-full">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-2 tracking-tighter">Pedido Enviado!</h2>
          <div className="bg-gray-50 rounded-[32px] p-8 mb-6 border border-gray-100 shadow-inner">
            <span className="text-3xl font-black text-emerald-600 tracking-tight block">#{lastOrder.id}</span>
          </div>
          <div className="space-y-4">
            <button onClick={() => generatePDF(lastOrder)} className="w-full bg-[#111827] text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center space-x-3 hover:bg-black transition-all">
              <Download className="h-5 w-5" />
              <span>Baixar Comprovante PDF</span>
            </button>
            <button onClick={() => navigate('/')} className="w-full bg-white border-2 border-gray-100 text-gray-400 py-6 rounded-[24px] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center space-x-3">
              <Home className="h-5 w-5" />
              <span>Voltar ao Início</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {showPrivacyModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
           <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-8 border-b flex justify-between items-center bg-gray-50">
                 <h3 className="font-black uppercase tracking-tight text-gray-900">Privacidade</h3>
                 <button onClick={() => setShowPrivacyModal(false)} className="p-2 bg-white rounded-full"><X className="h-5 w-5" /></button>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto text-sm text-gray-600 leading-relaxed font-medium">
                 {settings.privacyPolicyText || "Nossa política de privacidade protege seus dados."}
              </div>
              <div className="p-8 border-t bg-gray-50">
                 <button onClick={() => setShowPrivacyModal(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest">Fechar</button>
              </div>
           </div>
        </div>
      )}

      <div className="mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Checkout</h1>
        <p className="text-gray-500 font-medium">Confirme os detalhes fiscais para gerar o pedido.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xl font-bold mb-6 flex items-center space-x-3 text-emerald-700" style={{ color: settings.primaryColor }}>
              <ShieldCheck className="h-6 w-6" />
              <span className="uppercase tracking-tight">Dados da Empresa</span>
            </h3>
            <div className="space-y-4">
              <input required type="text" placeholder="CNPJ" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={formData.cnpj} onChange={(e) => setFormData({...formData, cnpj: handleCnpjMask(e.target.value)})} />
              <input required type="text" placeholder="Razão Social" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={formData.razaoSocial} onChange={(e) => setFormData({...formData, razaoSocial: e.target.value})} />
              <input required type="text" placeholder="Responsável" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={formData.responsible} onChange={(e) => setFormData({...formData, responsible: e.target.value})} />
              <input required type="text" placeholder="WhatsApp" className="w-full p-5 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-emerald-500 outline-none font-bold" value={formData.phone} onChange={(e) => setFormData({...formData, phone: handlePhoneMask(e.target.value)})} />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <h3 className="text-xl font-bold mb-8 flex items-center space-x-3 text-emerald-700" style={{ color: settings.primaryColor }}><Clock className="h-6 w-6" /><span className="uppercase tracking-tight">Condição de Pagamento</span></h3>
            <div className="space-y-3">
              {settings.billingOptions.map((option) => (
                <label key={option} className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${!showCustomTermInput && formData.billingTerm === option ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-100 hover:border-gray-200'}`} style={!showCustomTermInput && formData.billingTerm === option ? { borderColor: settings.primaryColor } : {}}>
                  <input type="radio" className="sr-only" checked={!showCustomTermInput && formData.billingTerm === option} onChange={() => { setShowCustomTermInput(false); setFormData({...formData, billingTerm: option}); }} />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${!showCustomTermInput && formData.billingTerm === option ? 'border-emerald-500' : 'border-gray-200'}`} style={!showCustomTermInput && formData.billingTerm === option ? { borderColor: settings.primaryColor } : {}}>
                    {!showCustomTermInput && formData.billingTerm === option && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" style={{ backgroundColor: settings.primaryColor }}></div>}
                  </div>
                  <span className="font-bold text-gray-700">{option}</span>
                </label>
              ))}

              {settings.allowCustomBillingTerm && (
                <div className="space-y-4">
                  <label className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all ${showCustomTermInput ? 'border-emerald-500 bg-emerald-50/10' : 'border-gray-100 hover:border-gray-200'}`} style={showCustomTermInput ? { borderColor: settings.primaryColor } : {}}>
                    <input type="radio" className="sr-only" checked={showCustomTermInput} onChange={() => setShowCustomTermInput(true)} />
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${showCustomTermInput ? 'border-emerald-500' : 'border-gray-200'}`} style={showCustomTermInput ? { borderColor: settings.primaryColor } : {}}>
                      {showCustomTermInput && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" style={{ backgroundColor: settings.primaryColor }}></div>}
                    </div>
                    <span className="font-bold text-gray-700">Outro (especificar...)</span>
                  </label>
                  {showCustomTermInput && (
                    <input required type="text" placeholder="Ex: 30/60 dias" className="w-full p-4 bg-gray-50 border-2 border-emerald-500 rounded-2xl outline-none font-bold" value={formData.customBillingTerm} onChange={e => setFormData({...formData, customBillingTerm: e.target.value})} />
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-4 px-2">
             <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" checked={agreedToPrivacy} onChange={e => setAgreedToPrivacy(e.target.checked)} />
                <span className="text-xs font-bold text-gray-500">Concordo com a <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-emerald-600 underline">Política de Privacidade</button></span>
             </label>
          </div>

          <button disabled={isProcessing} className="w-full py-6 rounded-[24px] font-black text-xl text-white shadow-2xl transition-all flex items-center justify-center space-x-3" style={{ backgroundColor: settings.primaryColor }}>
            {isProcessing ? <Loader2 className="animate-spin h-7 w-7" /> : <><span>Finalizar Pedido</span><ArrowRight className="h-6 w-6" /></>}
          </button>
        </form>
        <div className="bg-[#111827] text-white p-8 rounded-[40px] shadow-2xl h-fit sticky top-24">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3"><Package className="h-6 w-6 text-emerald-400" /><span>Resumo</span></h3>
          <div className="space-y-5 max-h-[40vh] overflow-y-auto no-scrollbar">
            {cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 h-8 w-8 flex items-center justify-center rounded-lg text-xs font-black">{item.quantity}x</div>
                  <span className="line-clamp-1">{item.product.name}</span>
                </div>
                <span className="font-black text-emerald-400">R$ {(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
             {settings.enableFreeShipping && (
               <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Frete</span>
                  <span className="text-emerald-400 font-black">{settings.freeShippingLabel || 'Grátis'}</span>
               </div>
             )}
             <div className="flex justify-between items-end">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Total Geral</span>
                <span className="text-4xl font-black text-emerald-400 tracking-tighter">R$ {total.toFixed(2)}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};