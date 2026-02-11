
import React, { useState, useEffect } from 'react';
import { CreditCard, Truck, ShieldCheck, FileText, CheckCircle2, ArrowRight, AlertCircle, CheckCircle, Loader2, Store, Edit3, Download, Printer, Clock, Package, Home, Sparkles, Mail, Info, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SiteSettings, CartItem, Order, User } from '../types';
import { supabase } from '../lib/supabase';

/* ================= CONFETTI ================= */
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

/* ================= CHECKOUT ================= */
export const Checkout: React.FC<{
  cart: CartItem[];
  settings: SiteSettings;
  onPlaceOrder: (order: Order) => void;
  onClearCart: () => void;
  user: User | null;
}> = ({ cart, settings, onPlaceOrder, onClearCart, user }) => {

  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  const total = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);

  /* ================= HTML DO PDF ================= */
  const getOrderHtml = (order: Order) => {
    const itemsHtml = order.items.map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>R$ ${item.product.price.toFixed(2)}</td>
        <td><strong>R$ ${(item.product.price * item.quantity).toFixed(2)}</strong></td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial; padding:40px; width:700px">
        <h2>${settings.brandName}</h2>
        <p><strong>PEDIDO #${order.id}</strong></p>
        <p>Cliente: ${order.customer.razaoSocial}</p>
        <p>CNPJ: ${order.customer.cnpj}</p>
        <p>Condição: ${order.billingTerm}</p>
        <table width="100%" border="1" cellspacing="0" cellpadding="8">
          ${itemsHtml}
        </table>
        <h2>Total: R$ ${order.total.toFixed(2)}</h2>
      </div>
    `;
  };

  /* ================= WEBHOOK ================= */
  const sendToWebhook = async (order: Order) => {
    const WEBHOOK_URL = 'https://hook.eu1.make.com/auukxvfpxiijzn59aoh8egup36lmbkq5';
    let pdfUrl = 'PDF não gerado';

    try {
      const el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.innerHTML = getOrderHtml(order);
      document.body.appendChild(el);

      await new Promise(r => setTimeout(r, 1500));

      const pdfBlob = await (window as any).html2pdf().from(el).output('blob');
      document.body.removeChild(el);

      if (pdfBlob.size > 100) {
        const path = `webhook/pedido-${order.id}.pdf`;
        await supabase.storage.from('pedidos').upload(path, pdfBlob, { upsert: true });
        const { data } = supabase.storage.from('pedidos').getPublicUrl(path);
        pdfUrl = data?.publicUrl || pdfUrl;
      }
    } catch {}

    const payload = {
      to: 'aneherbamed@gmail.com',
      subject: 'PEDIDO HERBAMED RECEBIDO',

      pedido_id: order.id,
      nome_cliente: order.customer.razaoSocial,
      email_cliente: order.customerEmail,
      cnpj_cliente: order.customer.cnpj,
      contato: order.customer.phone,
      prazo: order.billingTerm,
      total: `R$ ${order.total.toFixed(2).replace('.', ',')}`,
      itens: order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', '),
      url_pdf: pdfUrl,
      data: order.date
    };

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
  const order: Order = {
    id: Math.random().toString(36).substring(2, 8).toUpperCase(),
    date: new Date().toLocaleDateString('pt-BR'),
    customerEmail: user?.email || 'convidado',
    customer: {
      razaoSocial: user?.razaoSocial || '',
      cnpj: user?.cnpj || '',
      responsible: user?.name || '',
      phone: user?.contato || ''
    },
    items: cart,
    total,
    billingTerm: settings.billingOptions[0],
    status: 'Recebido'
  };

  setIsProcessing(true);

  try {
    await sendToWebhook(order); // 🔥 AGORA ESPERA ENVIAR

    setSuccess(true);
    setLastOrder(order);
    onPlaceOrder(order);
    onClearCart();

  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
  } finally {
    setIsProcessing(false);
  }
};

  /* ================= SUCESSO ================= */
  if (success && lastOrder) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <Confetti />
        <h1 className="text-4xl font-black">Pedido Enviado!</h1>
        <p className="mt-2 text-gray-500">#{lastOrder.id}</p>
        <button onClick={() => navigate('/')} className="mt-8 px-10 py-4 bg-black text-white rounded-xl">
          Voltar ao início
        </button>
      </div>
    );
  }

  /* ================= FORM ================= */
  return (
    <div className="max-w-xl mx-auto py-20 text-center">
      <button onClick={handleSubmit} className="px-10 py-6 bg-emerald-600 text-white rounded-xl text-xl font-black">
        Finalizar Pedido
      </button>
    </div>
  );
};