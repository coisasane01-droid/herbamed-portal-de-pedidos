import React from 'react';
import { ShoppingBag, Calendar, Clock, ChevronRight, Package, ArrowLeft, ExternalLink, FileText, Printer, CheckCircle, Download } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Order, User, SiteSettings } from '../types';
import { supabase } from '../lib/supabase';

export const OrderHistory: React.FC<{ orders: Order[], user: User | null, settings: SiteSettings }> = ({ orders, user, settings }) => {
  if (!user) return <Navigate to="/login" />;

  const myOrders = orders.filter(o => o.customerEmail === user.email || o.customer.cnpj === user.cnpj);

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
        
        <div style="margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 12px;">
          <p><strong>Razão Social:</strong> ${order.customer.razaoSocial}</p>
          <p><strong>CNPJ:</strong> ${order.customer.cnpj}</p>
          <p><strong>Responsável:</strong> ${order.customer.responsible}</p>
          <p><strong>Prazo de Faturamento:</strong> ${order.billingTerm}</p>
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
        
        <div style="text-align: right; font-size: 24px; font-weight: bold; margin-top: 30px; color: ${settings.primaryColor};">Total do Pedido: R$ ${order.total.toFixed(2)}</div>
      </div>
    `;
  };

  const sendToWebhook = async (order: Order) => {
    const WEBHOOK_URL = 'https://hook.eu1.make.com/auukxvfpxiijzn59aoh8egup36lmbkq5';
    let publicUrl = 'Link indisponível (Re-envio)';

    try {
      const element = document.createElement('div');
      element.id = 're-render-temp';
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '750px';
      element.style.background = '#ffffff';
      element.innerHTML = getOrderHtml(order);
      document.body.appendChild(element);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const opt = {
        margin: [0.2, 0.2],
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };
      
      const pdfBlob = await (window as any).html2pdf().set(opt).from(element).output('blob');
      document.body.removeChild(element);

      if (pdfBlob && pdfBlob.size > 100) {
        const fileName = `re-envio-${order.id}-${Date.now()}.pdf`;
        const filePath = `webhook-sync/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pedidos')
          .upload(filePath, pdfBlob, { contentType: 'application/pdf', upsert: true });

        if (!uploadError) {
          const { data } = supabase.storage.from('pedidos').getPublicUrl(filePath);
          if (data?.publicUrl) {
            publicUrl = data.publicUrl;
          }
        }
      }
    } catch (err) {
      console.warn('Falha PDF re-envio:', err);
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
      console.error('Falha re-envio webhook:', err);
    }
  };

  const generatePDF = (order: Order) => {
    const element = document.createElement('div');
    element.innerHTML = getOrderHtml(order);
    const opt = {
      margin: [0.2, 0.2],
      filename: `pedido_${order.id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    (window as any).html2pdf().from(element).set(opt).save();
    
    sendToWebhook(order);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Meus Pedidos</h1>
          <p className="text-gray-500 mt-1 font-medium">Acompanhe o status e histórico de suas compras.</p>
        </div>
        <Link to="/" className="p-4 bg-white rounded-3xl border border-gray-100 text-gray-400 hover:text-emerald-600 transition-all shadow-sm">
          <ArrowLeft className="h-6 w-6" />
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white rounded-[40px] p-16 text-center border border-gray-100 shadow-sm">
          <div className="inline-flex p-8 bg-gray-50 rounded-full mb-8">
            <Package className="h-16 w-16 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Nenhum pedido ainda</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Você ainda não realizou nenhum pedido em nosso portal.</p>
          <Link to="/" className="inline-block px-10 py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-lg shadow-emerald-100 hover:scale-105 transition-all" style={{ backgroundColor: settings.primaryColor }}>
            Fazer Primeiro Pedido
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {myOrders.map(order => (
            <div key={order.id} className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-gray-50">
                  <div className="flex items-center space-x-5">
                    <div className="h-16 w-16 bg-gray-50 rounded-[22px] flex items-center justify-center text-emerald-600 font-black text-2xl" style={{ color: settings.primaryColor, backgroundColor: settings.primaryColor + '10' }}>
                      #{order.id.slice(-4)}
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">ID: {order.id}</div>
                      <div className="text-2xl font-black text-gray-900">R$ {order.total.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 bg-gray-50 px-5 py-2.5 rounded-2xl text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-100">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{order.date}</span>
                    </div>
                    <div className={`flex items-center space-x-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                      order.status === 'Concluído' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : order.status === 'Recebido' 
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      <Clock className="h-3.5 w-3.5" />
                      <span>{order.status}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-10">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <ShoppingBag className="h-3 w-3" /> Itens Solicitados
                  </div>
                  <div className="bg-gray-50/50 rounded-[32px] p-6 md:p-8 space-y-4 border border-gray-100/50">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center group/item border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center space-x-4">
                          <div className="h-12 w-12 bg-white rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                            <img src={item.product.image} className="h-full w-full object-cover" alt={item.product.name} />
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 text-sm line-clamp-1">{item.product.name}</div>
                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5" style={{ color: settings.primaryColor }}>
                              {item.quantity} {item.quantity > 1 ? 'Unidades' : 'Unidade'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-black text-gray-900 text-sm">R$ {(item.product.price * item.quantity).toFixed(2)}</div>
                          <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">R$ {item.product.price.toFixed(2)} / un</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6">
                  <div className="flex items-center space-x-3 text-xs font-medium text-gray-500">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span>Faturamento: <strong className="text-gray-900">{order.billingTerm}</strong></span>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => generatePDF(order)}
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3.5 bg-gray-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-lg"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Comprovante PDF</span>
                    </button>
                    
                    <a 
                      href={`https://wa.me/${settings.contactWhatsapp}?text=Olá! Gostaria de falar sobre o pedido #${order.id}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-6 py-3.5 border-2 border-emerald-100 text-emerald-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-50 transition-all"
                      style={{ color: settings.primaryColor, borderColor: settings.primaryColor + '20' }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Suporte</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};