import React, { useRef } from 'react';
import { PromoCategoryCard, SiteSettings } from '../types';
import { ChevronRight } from 'lucide-react';

interface PromoCategoryCarouselProps {
  cards: PromoCategoryCard[];
  settings: SiteSettings;
  onSelectPromo: (categories: string[], productIds?: string[]) => void;
  position: 'top' | 'middle' | 'bottom';
}

export const PromoCategoryCarousel: React.FC<PromoCategoryCarouselProps> = ({ cards, settings, onSelectPromo, position }) => {
  const filteredCards = cards.filter(c => c.isActive && c.position === position);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (filteredCards.length === 0) return null;

  const useDragScroll = () => {
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
      if (!scrollRef.current) return;
      isDown.current = true;
      scrollRef.current.classList.add('active');
      startX.current = e.pageX - scrollRef.current.offsetLeft;
      scrollLeft.current = scrollRef.current.scrollLeft;
    };

    const onMouseLeave = () => {
      isDown.current = false;
    };

    const onMouseUp = () => {
      isDown.current = false;
    };

    const onMouseMove = (e: React.MouseEvent) => {
      if (!isDown.current || !scrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current.offsetLeft;
      const walk = (x - startX.current) * 2;
      scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    return { onMouseDown, onMouseLeave, onMouseUp, onMouseMove };
  };

  const dragProps = useDragScroll();

  return (
    <div className="w-full mb-12 animate-in fade-in duration-700">
      <div 
        ref={scrollRef}
        {...dragProps}
        className="flex overflow-x-auto gap-4 md:gap-6 pb-6 px-4 sm:px-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing scroll-smooth"
      >
        {filteredCards.map((card) => (
          <div 
            key={card.id}
            onClick={() => onSelectPromo(card.categories, card.productIds)}
            className="min-w-[280px] md:min-w-[420px] aspect-[21/9] md:aspect-[21/7] flex-shrink-0 snap-start group relative overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <img 
              src={card.imageUrl} 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
              alt={card.title} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
              <h4 className="text-white font-black text-xl md:text-2xl uppercase tracking-tighter drop-shadow-lg mb-1">{card.title}</h4>
              <div className="flex items-center gap-2 text-white/90 text-[10px] font-black uppercase tracking-widest">
                <span>Ver Produtos</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};