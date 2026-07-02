'use client';
import { useState, useEffect } from 'react';
import { CandlestickChart } from 'lucide-react';
import TerminalDecode from '../TerminalDecode';
import ExchangeRow from '../ExchangeRow';
import { BinanceIcon, HyperliquidIcon, AsterIcon, MexcIcon } from '../ExchangeIcons';
import { useSignInModal, SignInModalWrapper } from '../hooks/useSignInModal';

type ActiveTab = 'futures' | 'fiat';

const exchangesBTC = [
  {
    name: 'Binance',
    icon: <BinanceIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '150X', '$59,471.66'],
    sparklineData: [40, 60, 35, 70, 50, 65, 45, 55],
  },
  {
    name: 'HYPERLIQUID',
    icon: <HyperliquidIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.045%', '40X', '$59,509.09'],
    sparklineData: [55, 50, 60, 55, 65, 60, 70, 60],
  },
  {
    name: 'ASTER',
    icon: <AsterIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '200X', '$59,438.44'],
    sparklineData: [30, 45, 25, 55, 35, 50, 30, 40],
  },
  {
    name: 'MEXC',
    icon: <MexcIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.02%', '500X', '$59,440.30'],
    sparklineData: [50, 45, 40, 35, 30, 35, 25, 30],
  },
  {
    name: 'More...',
    icon: <img src="/assets/bybit.png" alt="Bybit" className="w-6 h-6 object-contain" />,
    stats: ['Fee : 0.055%', '125X', '$59,463.02'],
    sparklineData: [35, 40, 30, 45, 35, 40, 30, 35],
    isDimmed: true,
  },
];

const exchangesETH = [
  {
    name: 'Binance',
    icon: <BinanceIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '100X', '$1,590.07'],
    sparklineData: [40, 60, 35, 70, 50, 65, 45, 55],
  },
  {
    name: 'HYPERLIQUID',
    icon: <HyperliquidIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.045%', '25X', '$1,592.97'],
    sparklineData: [55, 50, 60, 55, 65, 60, 70, 60],
  },
  {
    name: 'ASTER',
    icon: <AsterIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '200X', '$1,589.44'],
    sparklineData: [30, 45, 25, 55, 35, 50, 30, 40],
  },
  {
    name: 'MEXC',
    icon: <MexcIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.02%', '500X', '$1,589.43'],
    sparklineData: [50, 45, 40, 35, 30, 35, 25, 30],
  },
  {
    name: 'More...',
    icon: <img src="/assets/bybit.png" alt="Bybit" className="w-6 h-6 object-contain" />,
    stats: ['Fee : 0.055%', '100X', '$1,589.02'],
    sparklineData: [35, 40, 30, 45, 35, 40, 30, 35],
    isDimmed: true,
  },
];

const exchangesSOL = [
  {
    name: 'Binance',
    icon: <BinanceIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '75X', '$74.07'],
    sparklineData: [40, 60, 35, 70, 50, 65, 45, 55],
  },
  {
    name: 'HYPERLIQUID',
    icon: <HyperliquidIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.045%', '20X', '$74.19'],
    sparklineData: [55, 50, 60, 55, 65, 60, 70, 60],
  },
  {
    name: 'ASTER',
    icon: <AsterIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.04%', '100X', '$73.97'],
    sparklineData: [30, 45, 25, 55, 35, 50, 30, 40],
  },
  {
    name: 'MEXC',
    icon: <MexcIcon className="w-6 h-6 text-text-primary" />,
    stats: ['Fee : 0.02%', '500X', '$47.06'],
    sparklineData: [50, 45, 40, 35, 30, 35, 25, 30],
  },
  {
    name: 'More...',
    icon: <img src="/assets/bybit.png" alt="Bybit" className="w-6 h-6 object-contain" />,
    stats: ['Fee : 0.055%', '100X', '$74.05'],
    sparklineData: [35, 40, 30, 45, 35, 40, 30, 35],
    isDimmed: true,
  },
];

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('futures');
  const [showDecode, setShowDecode] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSideCards, setShowSideCards] = useState(false);
  const { walletModalOpen, setWalletModalOpen, handleCtaClick } = useSignInModal();

  useEffect(() => {
    const t1 = setTimeout(() => setShowDecode(true), 500);
    const t2 = setTimeout(() => setShowButtons(true), 800);
    const t3 = setTimeout(() => setShowDashboard(true), 1000);
    const t4 = setTimeout(() => setShowSideCards(true), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const [coinMode, setCoinMode] = useState<'btc' | 'eth' | 'sol'>('btc');
  useEffect(() => {
    const id = setInterval(
      () => setCoinMode((m) => (m === 'btc' ? 'eth' : m === 'eth' ? 'sol' : 'btc')),
      10000,
    );
    return () => clearInterval(id);
  }, []);

  const exchanges = coinMode === 'btc' ? exchangesBTC : coinMode === 'eth' ? exchangesETH : exchangesSOL;
  const coinIconUrl = coinMode === 'btc' ? '/assets/bitcoin.png' : coinMode === 'eth' ? '/assets/ethereum.png' : '/assets/solana.png';

  return (
    <section className="relative z-10 min-h-screen flex flex-col items-center pt-[72px] overflow-hidden">
      <div className="h-20" />

      <div
        className={`flex items-center gap-2 mb-4 transition-opacity duration-500 ${
          showDecode ? 'opacity-70' : 'opacity-0'
        }`}
      >
        <span
          className="font-heading text-xl font-semibold text-white glitch"
          data-text="All in One Dex!"
        >
          All in One Dex!
        </span>
      </div>

      <h1 className="text-center px-4">
        <div className="font-heading font-bold text-white leading-[1.05] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          <TerminalDecode text="World's 1st Multi-Liquidity" trigger={showDecode} />
        </div>
        <div className="font-heading font-bold text-white leading-[1.05] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(48px, 8vw, 96px)' }}>
          <TerminalDecode text="Futures Trading" trigger={showDecode} staggerDelay={30} />
        </div>
      </h1>

      <div
        className={`mt-8 transition-all duration-600 ${
          showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex rounded-lg overflow-hidden bg-dark-card border border-bordercolor-subtle">
          <button
            onClick={() => {
              setActiveTab('futures');
              handleCtaClick();
            }}
            className={`flex items-center gap-2 px-7 py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'futures'
                ? 'bg-purple text-white shadow-[0_0_15px_rgba(123,47,247,0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CandlestickChart className="w-4 h-4" />
            Futures
          </button>

          <div className="w-px bg-bordercolor-subtle" />

          <button
            onClick={() => {
              setActiveTab('fiat');
              handleCtaClick();
            }}
            className={`flex items-center gap-2 px-7 py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
              activeTab === 'fiat'
                ? 'bg-purple text-white shadow-[0_0_15px_rgba(123,47,247,0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <img src="/assets/fiat-hero-icon.png" alt="" className="w-4 h-4 object-contain" />
            Fiat
          </button>
        </div>
      </div>

      <div className="h-16" />

      <div className="relative w-full max-w-[900px] px-4 md:px-0">
        <div
          className={`hidden lg:block absolute left-[-140px] top-1/2 -translate-y-1/2 transition-all duration-600 ${
            showSideCards ? 'opacity-60' : 'opacity-0'
          }`}
        >
          <div className="w-[170px] bg-dark-card/80 border border-bordercolor-subtle rounded-xl p-4 backdrop-blur-sm scale-90">
            <div className="flex items-center gap-2 mb-3">
              <AsterIcon className="w-4 h-4 text-text-primary" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">ASTER</span>
              <img src="/assets/bitcoin.png" alt="BTC" className="w-3.5 h-3.5 object-contain invert opacity-70 ml-auto" />
            </div>
            <div className="flex items-end gap-1 h-12 mb-3">
              {[35, 55, 25, 65, 40, 50, 30, 60].map((h, i) => (
                <div key={i} className="flex-1 bg-purple/40 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex gap-1.5">
              {['17%', '35%', '10%', '27%'].map((s, i) => (
                <span key={i} className="text-[8px] font-mono text-text-tertiary bg-purple/10 rounded px-1 py-0.5">{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`hidden lg:block absolute right-[-140px] top-1/2 -translate-y-1/2 transition-all duration-600 ${
            showSideCards ? 'opacity-60' : 'opacity-0'
          }`}
        >
          <div className="w-[170px] bg-dark-card/80 border border-bordercolor-subtle rounded-xl p-4 backdrop-blur-sm scale-90">
            <div className="flex items-center gap-2 mb-3">
              <HyperliquidIcon className="w-4 h-4 text-text-primary" />
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">HYPERLIQUID</span>
              <img src="/assets/bitcoin.png" alt="BTC" className="w-3.5 h-3.5 object-contain invert opacity-70 ml-auto" />
            </div>
            <div className="flex items-end gap-1 h-12 mb-3">
              {[50, 45, 60, 55, 65, 50, 70, 55].map((h, i) => (
                <div key={i} className="flex-1 bg-purple/40 rounded-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
              <span className="text-[9px] text-text-tertiary">AST</span>
            </div>
          </div>
        </div>

        <div
          className={`relative bg-dark-card/80 backdrop-blur-xl border border-bordercolor-subtle rounded-2xl overflow-hidden shadow-glow-purple-lg transition-all duration-700 hover:border-purple/30 ${
            showDashboard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div className="relative bg-[#0F0F0F]/90 border-b border-bordercolor-subtle">
            <div className="relative w-full overflow-hidden">
              <video
                src="/assets/hero-chart-loop.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                aria-hidden="true"
                className="block w-full h-auto aspect-[16/5] sm:aspect-[16/4] object-cover mix-blend-screen opacity-95"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple/5 via-transparent to-black/40" />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-purple/10" />
            </div>
          </div>

          <div key={coinMode} className="divide-y divide-white/[0.03] animate-fade-in">
            {exchanges.map((exchange, index) => (
              <ExchangeRow
                key={`${coinMode}-${exchange.name}-${index}`}
                name={exchange.name}
                icon={exchange.icon}
                stats={exchange.stats}
                sparklineData={exchange.sparklineData}
                isDimmed={exchange.isDimmed}
                coinIconUrl={coinIconUrl}
                isBitcoin={coinMode === 'btc'}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="h-20" />

      <SignInModalWrapper open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <div />
      </SignInModalWrapper>
    </section>
  );
}
