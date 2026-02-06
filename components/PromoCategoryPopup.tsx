import React from 'react';
import { X, ShoppingBag, Tags } from 'lucide-react';
import { Product, SiteSettings, CartItem } from '../types';
import { IsolatedProductCard } from './IsolatedProductCard';

interface PromoCategoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categories: string[];
  productIds?: string[]; // IDs específicos (prioridade)
  allProducts: Product[];
  settings: SiteSettings;
  onAddToCart: (product: Product, quantity: number) => void;
  cart: CartItem[];
}

export const PromoCategoryPopup: React.FC<PromoCategoryPopupProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  categories, 
  productIds,
  allProducts, 
  settings, 
  onAddToCart,
  cart 
}) => {
  if (!isOpen) return null;

  // Lógica de filtragem: Prioriza productIds se houver, senão usa categorias.
  const filteredProducts = productIds && productIds.length > 0 
    ? allProducts.filter(p => productIds.includes(p.id))
    : allProducts.filter(p => categories.includes(p.category));

  const getProductQuantity = (productId: string) => cart.find(i => i.product.id === productId)?.quantity || 0;

  return (
    <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-gray-50 w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
        {/* Header da Popup */}
        <div className="bg-white px-6 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner">
              <Tags className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none">{title}</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Ofertas Selecionadas</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-gray-100 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Listagem de Produtos */}
        <div className="flex-grow overflow-y-auto no-scrollbar p-6">
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <IsolatedProductCard 
                  key={product.id}
                  product={product}
                  settings={settings}
                  onAddToCart={onAddToCart}
                  quantity={getProductQuantity(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <ShoppingBag className="h-16 w-16 text-gray-300" />
              <p className="font-black uppercase text-xs tracking-widest">Nenhum produto disponível nesta seleção</p>
            </div>
          )}
        </div>

        {/* Footer da Popup (Opicional) */}
        <div className="p-6 bg-white border-t border-gray-100 shrink-0 hidden sm:block">
           <button 
             onClick={onClose}
             className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl hover:bg-black transition-all"
           >
             Continuar Navegando
           </button>
        </div>
      </div>
    </div>
  );
};