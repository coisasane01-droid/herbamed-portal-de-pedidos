
import React from 'react';
/* Added CheckCircle to imports */
import { Trash2, Plus, Minus, ArrowRight, AlertCircle, Package, CheckCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartItem, SiteSettings } from '../types';

interface CartProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  settings: SiteSettings;
}

export const Cart: React.FC<CartProps> = ({ cart, onUpdateQuantity, onRemove, settings }) => {
  const total = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const diffToMin = settings.minOrderValue - total;

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block p-10 bg-emerald-50 rounded-full mb-8">
          <Package className="h-20 w-20 text-emerald-300" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Seu carrinho está vazio</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">Explore nosso catálogo e adicione produtos naturais de alta qualidade ao seu pedido.</p>
        <Link to="/" className="inline-flex items-center justify-center space-x-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all" style={{ backgroundColor: settings.primaryColor }}>
          <span>Ver Catálogo</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-black text-gray-900 mb-12">Meu Pedido</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart List */}
        <div className="lg:col-span-2 space-y-6">
          {cart.map((item) => (
            <div key={item.product.id} className="bg-white p-6 rounded-3xl flex items-center space-x-6 shadow-sm border border-gray-100">
              <img src={item.product.image} alt={item.product.name} className="h-24 w-24 object-cover rounded-2xl" />
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{item.product.name}</h3>
                    <p className="text-sm text-gray-500">{item.product.category}</p>
                  </div>
                  <button onClick={() => onRemove(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center bg-gray-50 rounded-xl p-1">
                    <button onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)} className="p-2">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)} className="p-2">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-lg font-bold text-emerald-600" style={{ color: settings.primaryColor }}>
                    R$ {(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 sticky top-24">
            <h3 className="text-xl font-bold mb-6">Resumo do Pedido</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-gray-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-bold">R$ {total.toFixed(2)}</span>
              </div>
              {settings.enableFreeShipping && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 font-medium">Frete</span>
                  <span className="text-emerald-600 font-bold" style={{ color: settings.primaryColor }}>{settings.freeShippingLabel || 'Grátis'}</span>
                </div>
              )}
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="text-lg font-bold">Total</span>
                <span className="text-3xl font-black text-emerald-600" style={{ color: settings.primaryColor }}>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            {total < settings.minOrderValue ? (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-8">
                <div className="flex space-x-3">
                  <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-amber-800 text-sm font-bold">Pedido Mínimo não atingido</p>
                    <p className="text-amber-700 text-xs">Faltam <span className="font-bold">R$ {diffToMin.toFixed(2)}</span> para atingir o valor mínimo de R$ {settings.minOrderValue.toFixed(2)}.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-8 text-emerald-700 text-sm flex items-center space-x-3">
                <CheckCircle className="h-5 w-5" />
                <span>Valor mínimo atingido! Pronto para finalizar.</span>
              </div>
            )}

            <div className="space-y-4">
              <Link
                to={total >= settings.minOrderValue ? "/checkout" : "#"}
                className={`w-full block text-center py-5 rounded-[24px] font-black uppercase text-xs tracking-widest transition-all ${
                  total >= settings.minOrderValue 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                style={total >= settings.minOrderValue ? { backgroundColor: settings.primaryColor } : {}}
              >
                Ir para Checkout
              </Link>

              {total < settings.minOrderValue && (
                <Link
                  to="/"
                  className="w-full flex items-center justify-center gap-2 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest bg-white border-2 transition-all hover:bg-gray-50 shadow-sm"
                  style={{ borderColor: settings.primaryColor, color: settings.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar ao Catálogo</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
