'use client';
import { useEffect, useRef, useState } from 'react';
import { Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import {
  BinanceIcon,
  HyperliquidIcon,
  AsterIcon,
  MexcIcon,
} from '../ExchangeIcons';

type Coin = { sym: string; fee: string; lev: string; price: string; color: string };

const COINS: Coin[] = [
  { sym: 'BTC',  fee: 'Fee : 0.03%', lev: '125X', price: '$59,405.76', color: '#F7931A' },
  { sym: 'ETH',  fee: 'Fee : 0.04%', lev: '100X', price: '$1,590.19',  color: '#627EEA' },
  { sym: 'SOL',  fee: 'Fee : 0.05%', lev: '75X',  price: '$70.97',     color: '#14F195' },
  { sym: 'BNB',  fee: 'Fee : 0.03%', lev: '50X',  price: '$551.43',    color: '#F3BA2F' },
  { sym: 'XRP',  fee: 'Fee : 0.06%', lev: '75X',  price: '$1.05',      color: '#00AAE4' },
  { sym: 'DOGE', fee: 'Fee : 0.05%', lev: '50X',  price: '$0.0737',    color: '#C2A633' },
  { sym: 'ADA',  fee: 'Fee : 0.04%', lev: '50X',  price: '$0.5932',    color: '#0033AD' },
  { sym: 'AVAX', fee: 'Fee : 0.05%', lev: '50X',  price: '$18.41',     color: '#E84142' },
  { sym: 'LINK', fee: 'Fee : 0.03%', lev: '100X', price: '$13.52',     color: '#2A5ADA' },
  { sym: 'DOT',  fee: 'Fee : 0.06%', lev: '50X',  price: '$3.74',      color: '#E6007A' },
  { sym: 'TRX',  fee: 'Fee : 0.02%', lev: '25X',  price: '$0.3218',    color: '#EF0027' },
  { sym: 'TON',  fee: 'Fee : 0.05%', lev: '50X',  price: '$2.98',      color: '#0098EA' },
  { sym: 'SHIB', fee: 'Fee : 0.08%', lev: '25X',  price: '$0.0000118', color: '#FFA409' },
  { sym: 'NEAR', fee: 'Fee : 0.05%', lev: '50X',  price: '$2.08',      color: '#00C08B' },
  { sym: 'ARB',  fee: 'Fee : 0.04%', lev: '50X',  price: '$0.36',      color: '#28A0F0' },
  { sym: 'OP',   fee: 'Fee : 0.05%', lev: '50X',  price: '$0.58',      color: '#FF0420' },
  { sym: 'SUI',  fee: 'Fee : 0.06%', lev: '75X',  price: '$2.61',      color: '#4DA2FF' },
  { sym: 'APT',  fee: 'Fee : 0.04%', lev: '50X',  price: '$4.48',      color: '#00D4B5' },
  { sym: 'PEPE', fee: 'Fee : 0.08%', lev: '25X',  price: '$0.0000086', color: '#3A9B3F' },
  { sym: 'HYPE', fee: 'Fee : 0.03%', lev: '50X',  price: '$62.40',     color: '#7B2FF7' },
];

function useTypewriter(text: string, speed = 18, disabled = false) {
  const [out, setOut] = useState(disabled ? text : '');
  useEffect(() => {
    if (disabled) {
      setOut(text);
      return;
    }
    setOut('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, disabled]);
  return out;
}

function CoinLogo({ coin }: { coin: Coin }) {
  return (
    <span
      className="text-[11px] md:text-[13px] font-bold tracking-tight flex-shrink-0"
      style={{ color: coin.color }}
    >
      ${coin.sym}
    </span>
  );
}

function CoinSlot({ offset = 0 }: { offset?: number }) {
  const isMobile = useIsMobile();
  const [idx, setIdx] = useState(offset % COINS.length);
  useEffect(() => {
    if (isMobile) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % COINS.length), 3000);
    return () => clearInterval(id);
  }, [isMobile]);
  const coin = COINS[idx];
  const fee = useTypewriter(coin.fee, 18, isMobile);
  const lev = useTypewriter(coin.lev, 18, isMobile);
  const price = useTypewriter(coin.price, 18, isMobile);
  return (
    <div className="flex items-center gap-1.5 md:gap-1.5 flex-1 min-w-0 justify-end">
      <CoinLogo coin={coin} />
      <span className="px-1.5 py-0.5 text-[9px] md:text-[10px] font-mono text-text-secondary/80 bg-white/[0.03] border border-white/[0.04] rounded whitespace-nowrap">
        {fee}
      </span>
      <span className="px-1.5 py-0.5 text-[9px] md:text-[10px] font-mono text-text-secondary/80 bg-white/[0.03] border border-white/[0.04] rounded whitespace-nowrap">
        {lev}
      </span>
      <span className="px-1.5 py-0.5 text-[9px] md:text-[10px] font-mono text-purple/90 bg-purple/[0.08] border border-purple/20 rounded whitespace-nowrap">
        {price}
      </span>
    </div>
  );
}

function GateioIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 16a6 6 0 1 1-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="16" y="14" width="6" height="2.2" rx="1" fill="currentColor" />
    </svg>
  );
}

function SignalStrength({ level }: { level: number }) {
  const Icon = level >= 4 ? Signal : level === 3 ? SignalHigh : level === 2 ? SignalMedium : SignalLow;
  return (
    <Icon
      className="signal-glow flex-shrink-0 text-purple"
      width={28}
      height={22}
      strokeWidth={2.2}
    />
  );
}

interface Row {
  name: string;
  Icon: React.ComponentType<{ className?: string }>;
  stats: string[];
  bars: number[];
  highlight?: number;
}

function ExchangeList({ rows, delayBase = 0 }: { rows: Row[]; delayBase?: number }) {
  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {rows.map((r, i) => (
        <div
          key={r.name + i}
          className="grid grid-cols-[auto_1fr_auto] sm:flex sm:items-center gap-x-2 gap-y-2 md:gap-4 px-3 md:px-4 py-2.5 md:py-3 rounded-xl bg-[#0c0c10]/90 border border-white/[0.06] hover:border-purple/40 transition-colors"
          style={{
            animation: `slide-in 0.7s ${delayBase + i * 90}ms cubic-bezier(0.16,1,0.3,1) both`,
          }}
        >
          <div className="row-start-1 col-start-1 w-7 h-7 rounded-full bg-black/60 border border-white/10 flex items-center justify-center shrink-0 text-white">
            <r.Icon className="w-4 h-4" />
          </div>
          <span className="row-start-1 col-start-2 text-[10px] md:text-[11px] font-semibold tracking-[0.12em] text-text-secondary truncate min-w-0 sm:whitespace-nowrap sm:min-w-[82px]">
            {r.name}
          </span>
          <div className="row-start-2 col-span-3 sm:contents min-w-0">
            <CoinSlot offset={(delayBase / 300) + i * 2} />
          </div>
          <div className="row-start-1 col-start-3 sm:contents shrink-0">
            <SignalStrength level={Math.min(4, Math.max(1, (r.highlight ?? 2) + 1))} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CenterFlame() {
  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <svg
        viewBox="0 0 280 420"
        className="w-full h-full max-w-[320px]"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="flameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3D1A73" />
            <stop offset="45%" stopColor="#7B2FF7" />
            <stop offset="100%" stopColor="#4C1D95" />
          </linearGradient>
          <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7B2FF7" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#7B2FF7" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="140" cy="210" rx="130" ry="170" fill="url(#flameGlow)" />

        <g
          fill="url(#flameGrad)"
          className="multi-api-flame-breathe"
          style={{ transformOrigin: '140px 210px' }}
        >
          <path d="M140 30
                   C 120 80, 60 110, 80 170
                   C 95 210, 140 200, 140 210
                   C 140 200, 185 210, 200 170
                   C 220 110, 160 80, 140 30 Z" />
          <path d="M140 390
                   C 120 340, 60 310, 80 250
                   C 95 210, 140 220, 140 210
                   C 140 220, 185 210, 200 250
                   C 220 310, 160 340, 140 390 Z" />
          <path d="M40 210 C 70 195, 110 205, 140 210 C 110 215, 70 225, 40 210 Z" opacity="0.85" />
          <path d="M240 210 C 210 195, 170 205, 140 210 C 170 215, 210 225, 240 210 Z" opacity="0.85" />
          <path d="M55 160 C 90 170, 120 195, 140 210 C 110 205, 80 200, 55 160 Z" opacity="0.55" />
          <path d="M225 260 C 190 250, 160 225, 140 210 C 170 215, 200 220, 225 260 Z" opacity="0.55" />
          <path d="M55 260 C 90 250, 120 225, 140 210 C 110 215, 80 220, 55 260 Z" opacity="0.45" />
          <path d="M225 160 C 190 170, 160 195, 140 210 C 170 205, 200 200, 225 160 Z" opacity="0.45" />
        </g>

        <circle cx="140" cy="210" r="6" fill="#fff" opacity="0.85" />
        <circle cx="140" cy="210" r="14" fill="#7B2FF7" opacity="0.5" />
      </svg>
    </div>
  );
}

export default function MultiChooseApi() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const leftRows: Row[] = [
    { name: 'Binance', Icon: BinanceIcon, stats: ['Fee : 0.04%', '150X', '$59,471.66'], bars: [3, 5, 4, 6, 7], highlight: 4 },
    { name: 'HYPERLIQUID', Icon: HyperliquidIcon, stats: ['Fee : 0.045%', '40X', '$59,509.09'], bars: [4, 3, 5, 4, 6], highlight: 4 },
    { name: 'ASTER', Icon: AsterIcon, stats: ['Fee : 0.04%', '200X', '$59,438.44'], bars: [3, 4, 5, 6, 5], highlight: 3 },
    { name: 'MEXC', Icon: MexcIcon, stats: ['Fee : 0.02%', '500X', '$59,440.30'], bars: [3, 4, 4, 5, 6], highlight: 4 },
  ];

  const rightRows: Row[] = [
    { name: 'Binance', Icon: BinanceIcon, stats: ['Fee : 0.04%', '150X', '$59,471.66'], bars: [3, 4, 5, 6, 7], highlight: 4 },
    { name: 'HYPERLIQUID', Icon: HyperliquidIcon, stats: ['Fee : 0.045%', '40X', '$59,509.09'], bars: [3, 4, 5, 5, 6], highlight: 4 },
    { name: 'ASTER', Icon: AsterIcon, stats: ['Fee : 0.04%', '200X', '$59,438.44'], bars: [3, 4, 4, 5, 6], highlight: 4 },
    { name: 'MEXC', Icon: MexcIcon, stats: ['Fee : 0.02%', '500X', '$59,440.30'], bars: [3, 4, 5, 6, 7], highlight: 4 },
    { name: 'More...', Icon: GateioIcon, stats: ['Fee : 0.055%', '125X', '$59,463.02'], bars: [4, 5, 4, 6, 5], highlight: 3 },
  ];

  return (
    <section
      ref={ref}
      id="multi-choose-api"
      className="relative z-10 w-full overflow-hidden"
    >
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes flame-breathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(123,47,247,0.35)); }
          50% { transform: scale(1.04); filter: drop-shadow(0 0 38px rgba(123,47,247,0.55)); }
        }
        @keyframes badge-shine {
          0% { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        .signal-glow { filter: drop-shadow(0 0 6px rgba(123,47,247,0.55)); }
        .multi-api-flame-breathe { animation: flame-breathe 6s ease-in-out infinite; }
        .multi-api-badge-shine { animation: badge-shine 4s ease-in-out infinite; }
        @media (max-width: 640px) {
          .signal-glow,
          .multi-api-flame-breathe { filter: none !important; }
          .multi-api-flame-breathe,
          .multi-api-badge-shine { animation: none !important; }
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <div
          className={`transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <div
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md border border-[#3d2a18] bg-gradient-to-r from-[#1a1308] via-[#221a0c] to-[#1a1308] relative overflow-hidden"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(255,200,90,0.06)' }}
          >
            <span className="text-base">🎉</span>
            <span className="text-[12px] md:text-[13px] font-medium text-[#e9c98a] tracking-wide">
              First in the Web3 space
            </span>
            <span
              className="multi-api-badge-shine absolute inset-0 pointer-events-none"
              style={{
                background:
                  'linear-gradient(110deg, transparent 30%, rgba(255,210,120,0.15) 50%, transparent 70%)',
                backgroundSize: '200% 100%',
              }}
            />
          </div>
        </div>

        <h2
          className={`mt-6 md:mt-8 font-heading font-bold text-text-primary leading-[1.1] tracking-[-0.02em] transition-all duration-700 delay-100 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}
        >
          Multi-API Choose on the
          <br />
          Same Pair
        </h2>

        <div className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 md:gap-4 lg:gap-6 items-center">
          <div
            className={`transition-all duration-700 delay-150 ${
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
            }`}
          >
            <ExchangeList rows={leftRows} delayBase={300} />
          </div>

          <div
            className={`h-[280px] lg:h-[460px] lg:w-[280px] transition-all duration-1000 delay-200 ${
              visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <CenterFlame />
          </div>

          <div
            className={`transition-all duration-700 delay-150 ${
              visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
            }`}
          >
            <ExchangeList rows={rightRows} delayBase={600} />
          </div>
        </div>
      </div>
    </section>
  );
}
