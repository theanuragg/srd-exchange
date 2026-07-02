'use client';
import { useEffect, useState } from 'react';
import TradeButton from './TradeButton';
import { useIsMobile } from './hooks/use-mobile';

interface ExchangeRowProps {
  name: string;
  icon: React.ReactNode;
  stats: string[];
  sparklineData: number[];
  isDimmed?: boolean;
  coinIconUrl: string;
  isBitcoin?: boolean;
}

export default function ExchangeRow({ name, icon, stats, sparklineData, isDimmed = false, coinIconUrl, isBitcoin = false }: ExchangeRowProps) {
  const isMobile = useIsMobile();
  const slots = [...stats, '__trade__'];
  const [slotIndex, setSlotIndex] = useState(0);

  useEffect(() => {
    if (!isMobile) return;
    setSlotIndex(0);
    const id = setInterval(() => {
      setSlotIndex((i) => (i + 1) % slots.length);
    }, 4000);
    return () => clearInterval(id);
  }, [isMobile, stats.join('|')]);

  const currentSlot = slots[slotIndex];

  return (
    <div
      className={`flex items-center gap-4 px-6 py-4 border-b border-white/[0.03] transition-colors duration-200 hover:bg-purple/[0.05] ${
        isDimmed ? 'opacity-50' : ''
      }`}
    >
      <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>

      <span className="text-sm font-semibold text-text-primary font-body whitespace-nowrap min-w-[80px] sm:min-w-[100px]">
        {name}
      </span>

      <img key={coinIconUrl} src={coinIconUrl} alt="coin" className={`w-6 h-6 object-contain invert opacity-70 flex-shrink-0 ${isBitcoin ? 'animate-zoom-in-out' : 'animate-fade-in'}`} loading="lazy" decoding="async" />

      <div className="hidden sm:flex items-center gap-2 ml-auto flex-shrink-0">
        {stats.map((stat, i) => (
          <span
            key={i}
            className="px-2.5 py-1 text-xs font-mono font-medium text-text-secondary bg-purple/[0.08] rounded"
          >
            {stat}
          </span>
        ))}
      </div>

      <div className="flex sm:hidden items-center ml-auto flex-shrink-0 min-w-[92px] justify-end">
        {currentSlot === '__trade__' ? (
          <div key={`slot-${slotIndex}`} className="mobile-stat-slot">
            <TradeButton />
          </div>
        ) : (
          <span
            key={`slot-${slotIndex}`}
            className="mobile-stat-slot px-2.5 py-1 text-xs font-mono font-medium text-text-secondary bg-purple/[0.08] rounded whitespace-nowrap"
          >
            {currentSlot}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 ml-2 hidden sm:block">
        <TradeButton />
      </div>
    </div>
  );
}
