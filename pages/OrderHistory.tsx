import React from 'react';
import {
  ShoppingBag, Calendar, Clock, Package, ArrowLeft,
  ExternalLink, CheckCircle, Download
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { Order, User, SiteSettings } from '../types';

export const OrderHistory: React.FC<{
  orders: Order[];
  user: User | null;
  settings: SiteSettings;
}> = ({ orders, user, settings }) => {
  if (!user) return <Navigate to="/login" />;

  const myOrders = orders.filter(
    o => o.customerEmail === user.email || o.customer.cnpj === user.cnpj
  );

  const getOrderHtml = (order: Order) => {
    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom:1px solid #eee">
        <td>${item.product.name}</td>
        <td align="center">${item.quantity}</td>
        <td align="right">R$ ${item.product.price.toFixed(2)}</td>
        <td align="right"><strong>R$ ${(item.product.price * item.quantity).toFixed(2)}</strong></td>
      </tr>
    `).join('');

    return `
      <div style="font-family:Arial;padding:40px;width:700px">
        <h2>${settings.brandName}</h2>
        <p><strong>Pedido #${order.id}</strong></p>
        <p>Data: ${order.date}</p>
        <hr/>
        <p><strong>Cliente:</strong> ${order.customer.razaoSocial}</p>
        <p><strong>CNPJ:</strong> ${order.customer.cnpj}</p>
        <p><strong>Prazo:</strong> ${order.billingTerm}</p>

        <table width="100%" cellspacing="0" cellpadding="6" style="margin-top:20px">
          <thead>
            <tr>
              <th align="left">Produto</th>
              <th>Qtd</th>
              <th align="right">Unitário</th>
              <th align="right">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <h3 style="text-align:right;margin-top:20px;color:${settings.primaryColor}">
          Total: R$ ${order.total.toFixed(2)}
        </h3>
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
      html2canvas: { scale: 2, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    (window as any).html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black">Meus Pedidos</h1>
          <p className="text-gray-500">Histórico de compras</p>
        </div>
        <Link to="/" className="p-3 border rounded-xl">
          <ArrowLeft />
        </Link>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl text-center">
          <Package className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-8">
          {myOrders.map(order => (
            <div key={order.id} className="bg-white rounded-3xl p-8 border">
              <div className="flex justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400">Pedido</p>
                  <p className="font-black text-xl">#{order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-black text-xl">R$ {order.total.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs mb-6">
                <Calendar size={14} />
                {order.date}
                <Clock size={14} />
                {order.status}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">
                  Faturamento: <strong>{order.billingTerm}</strong>
                </span>

                <div className="flex gap-3">
                  <button
                    onClick={() => generatePDF(order)}
                    className="px-5 py-3 bg-black text-white rounded-xl text-xs font-black uppercase"
                  >
                    <Download size={14} /> PDF
                  </button>

                  <a
                    href={`https://wa.me/${settings.contactWhatsapp}?text=Pedido%20${order.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 border rounded-xl text-xs font-black uppercase"
                    style={{ color: settings.primaryColor }}
                  >
                    <ExternalLink size={14} /> Suporte
                  </a>
                </div>
              </div>

              <div className="mt-4 flex items-center text-xs text-gray-500">
                <CheckCircle size={14} className="text-emerald-500 mr-2" />
                Pedido registrado com sucesso
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
