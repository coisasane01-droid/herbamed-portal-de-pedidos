import React from 'react';
import { Product, SiteSettings } from '../types';
import { Minus, Plus, Info, Sparkles, Activity, ChevronRight } from 'lucide-react';

interface IsolatedProductCardProps {
  product: Product;
  settings: SiteSettings;
  onAddToCart: (product: Product, quantity: number) => void;
  quantity: number;
}

export const IsolatedProductCard: React.FC<IsolatedProductCardProps> = ({ product, settings, onAddToCart, quantity }) => {
  const originalPrice = product.originalPrice || (product.price * 1.18);

  return (
    <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full relative group select-none transition-all hover:shadow-md">
      {product.isHighlighted && (
        <div className="absolute top-3 left-3 z-10">
          <span className="bg-[#059669] text-white text-[8px] font-black uppercase px-3 py-1.5 rounded-xl shadow-lg tracking-widest">Destaque</span>
        </div>
      )}
      <div className="relative aspect-square p-3 flex items-center justify-center overflow-hidden">
        <img src={product.image || 'https://via.placeholder.com/400?text=Produto'} className="max-w-full max-h-full object-contain pointer-events-none" alt={product.name} />
        {!product.inStock && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-gray-900 text-white px-4 py-1.5 rounded-full font-black uppercase text-[8px] tracking-widest">Esgotado</span>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col items-center text-center flex-grow pt-0">
        <h3 className="text-xs font-bold text-gray-800 leading-tight mb-2 h-8 line-clamp-2">{product.name}</h3>
        
        <div className="mb-4">
          <div className="flex flex-col items-center justify-center">
            <span className="text-gray-300 line-through text-[10px] font-medium">R$ {originalPrice.toFixed(2)}</span>
            <span className="text-[#1a202c] font-black text-lg tracking-tighter">R$ {product.price.toFixed(2)}</span>
          </div>
        </div>

        <div className="w-full mt-auto">
          {quantity > 0 ? (
            <div className="w-full flex items-center justify-between bg-gray-50 p-1 rounded-full border border-gray-100 shadow-inner">
              <button onClick={() => onAddToCart(product, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-full text-gray-400 hover:text-red-500 shadow-sm"><Minus className="h-4 w-4" /></button>
              <span className="text-sm font-black text-gray-900">{quantity}</span>
              <button onClick={() => onAddToCart(product, 1)} className="w-8 h-8 flex items-center justify-center text-white rounded-full shadow-lg" style={{ backgroundColor: settings.primaryColor }}><Plus className="h-4 w-4" /></button>
            </div>
          ) : (
            <button 
              onClick={() => onAddToCart(product, 1)} 
              disabled={!product.inStock} 
              className="w-full py-3 rounded-full font-black uppercase text-[10px] tracking-widest text-white shadow-xl transition-all active:scale-95 disabled:opacity-30" 
              style={{ backgroundColor: settings.primaryColor }}
            >
              Comprar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};