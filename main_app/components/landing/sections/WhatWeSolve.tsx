'use client';
import { useEffect, useRef, useState } from 'react';

function DotMatrixIllustration() {
  return (
    <img
      src="/assets/under-competitive.svg"
      alt="Under-competitive futures market"
      className="w-full h-full object-contain"
     loading="lazy" decoding="async" />
  );
}

function QRTradeIllustration() {
  return (
    <svg viewBox="0 0 220 180" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="qrGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7B2FF7" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <g transform="translate(60 30)">
        <rect x="0" y="0" width="22" height="22" fill="none" stroke="url(#qrGrad)" strokeWidth="3" />
        <rect x="6" y="6" width="10" height="10" fill="url(#qrGrad)" />
        <rect x="78" y="0" width="22" height="22" fill="none" stroke="url(#qrGrad)" strokeWidth="3" />
        <rect x="84" y="6" width="10" height="10" fill="url(#qrGrad)" />
        <rect x="0" y="78" width="22" height="22" fill="none" stroke="url(#qrGrad)" strokeWidth="3" />
        <rect x="6" y="84" width="10" height="10" fill="url(#qrGrad)" />
        {[
          [30, 4], [38, 4], [46, 4], [62, 4],
          [30, 12], [54, 12], [70, 12],
          [4, 30], [12, 30], [28, 30], [44, 30], [60, 30], [76, 30], [92, 30],
          [4, 38], [20, 38], [36, 38], [52, 38], [68, 38], [84, 38],
          [12, 46], [28, 46], [44, 46], [60, 46], [76, 46], [92, 46],
          [4, 54], [20, 54], [36, 54], [68, 54], [84, 54],
          [12, 62], [28, 62], [44, 62], [60, 62], [76, 62], [92, 62],
          [30, 70], [46, 70], [62, 70], [78, 70],
          [30, 78], [38, 86], [46, 78], [54, 86], [62, 78], [70, 86], [78, 78], [86, 86],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="6" height="6" fill="url(#qrGrad)" opacity={0.7 + (i % 3) * 0.1} />
        ))}
      </g>
      <g transform="translate(78 8)">
        <rect width="40" height="16" rx="3" fill="#3D1A73" />
        <text x="20" y="11" textAnchor="middle" fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="700">SELL</text>
      </g>
      <g transform="translate(78 150)">
        <rect width="40" height="16" rx="3" fill="#3D1A73" />
        <text x="20" y="11" textAnchor="middle" fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="700">BUY</text>
      </g>
    </svg>
  );
}

function ChainedLockIllustration() {
  return (
    <img
      src="/assets/no-asset-mobility.svg"
      alt="No asset mobility or true ownership"
      className="w-full h-full object-contain"
     loading="lazy" decoding="async" />
  );
}

function LimitedPairsIllustration() {
  return (
    <svg viewBox="0 0 220 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="rowGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="50%" stopColor="#2a1a3a" />
          <stop offset="100%" stopColor="#1a1a1a" />
        </linearGradient>
      </defs>
      <rect x="40" y="35" width="140" height="22" rx="4" fill="url(#rowGrad)" stroke="#3D1A73" strokeWidth="0.5" />
      <rect x="130" y="40" width="18" height="12" rx="2" fill="#3D1A73" />
      <text x="139" y="49" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">B</text>
      <rect x="152" y="40" width="18" height="12" rx="2" fill="#3D1A73" />
      <text x="161" y="49" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">◆</text>
      <rect x="40" y="68" width="140" height="22" rx="4" fill="url(#rowGrad)" stroke="#3D1A73" strokeWidth="0.5" />
      <rect x="40" y="101" width="140" height="22" rx="4" fill="url(#rowGrad)" stroke="#3D1A73" strokeWidth="0.5" />
      <rect x="152" y="106" width="18" height="12" rx="2" fill="#3D1A73" />
      <text x="161" y="115" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="700">D</text>
    </svg>
  );
}

function WalletIllustration() {
  return (
    <svg viewBox="0 0 220 160" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
      </defs>
      <rect x="35" y="40" width="150" height="90" rx="10" fill="none" stroke="url(#wGrad)" strokeWidth="2.5" />
      <rect x="35" y="60" width="150" height="50" rx="2" fill="none" stroke="url(#wGrad)" strokeWidth="2" />
      <circle cx="135" cy="85" r="8" fill="none" stroke="url(#wGrad)" strokeWidth="2.5" />
      <circle cx="135" cy="85" r="3" fill="url(#wGrad)" />
      <rect x="155" y="78" width="14" height="14" rx="2" fill="none" stroke="url(#wGrad)" strokeWidth="2" />
    </svg>
  );
}

function TokenGridIllustration() {
  return (
    <img
      src="/assets/frame-4532.svg"
      alt="Broad futures market coverage tokens"
      className="w-full h-full object-contain"
     loading="lazy" decoding="async" />
  );
}

interface CardItem {
  illustration: React.ReactNode;
  title: string;
  subtitle?: string;
  accent: 'purple' | 'green';
}

function ProblemCard({ item, delay }: { item: CardItem; delay: number }) {
  return (
    <div
      className="flex flex-col items-center text-center px-2 md:px-4"
      style={{ animation: `fade-up 0.7s ${delay}ms cubic-bezier(0.16,1,0.3,1) both` }}
    >
      <div className="w-full h-[150px] md:h-[170px] flex items-center justify-center mb-4">
        {item.illustration}
      </div>
      <h3 className="text-[14px] md:text-[15px] font-semibold text-text-primary leading-snug">
        {item.title}
      </h3>
      {item.subtitle && (
        <p className="text-[13px] md:text-[14px] text-text-tertiary mt-0.5">{item.subtitle}</p>
      )}
    </div>
  );
}

export default function WhatWeSolve() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const problems: CardItem[] = [
    { illustration: <DotMatrixIllustration />, title: 'Under-Competitive', subtitle: 'Futures Market', accent: 'purple' },
    { illustration: <QRTradeIllustration />, title: 'Low Liquidity & Poor Trade', subtitle: 'Execution', accent: 'purple' },
    { illustration: <ChainedLockIllustration />, title: 'No Asset Mobility or', subtitle: 'True Ownership', accent: 'purple' },
    { illustration: <LimitedPairsIllustration />, title: 'Limited Trading Pairs &', subtitle: 'Missed Opportunities', accent: 'purple' },
  ];

  const fixes: CardItem[] = [
    { illustration: <DotMatrixIllustration />, title: 'Open competition through', subtitle: 'global-grade infrastructure', accent: 'green' },
    { illustration: <QRTradeIllustration />, title: 'Aggregate liquidity from', subtitle: 'multiple global providers', accent: 'green' },
    { illustration: <WalletIllustration />, title: 'Self-Custody wallet First', subtitle: 'Trading Architecture', accent: 'green' },
    { illustration: <TokenGridIllustration />, title: 'Broad Futures Market', subtitle: 'Coverage Across Assets', accent: 'green' },
  ];

  return (
    <section ref={ref} id="what-we-solve" className="relative z-10 w-full bg-black overflow-hidden">
      <style>{`
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes badge-pulse-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(234,140,40,0); }
          50% { box-shadow: 0 0 24px 2px rgba(234,140,40,0.25); }
        }
        @keyframes badge-pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
          50% { box-shadow: 0 0 24px 2px rgba(34,197,94,0.3); }
        }
      `}</style>

      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <h2
          className={`font-heading font-bold text-text-primary leading-[1.1] tracking-[-0.02em] transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ fontSize: 'clamp(32px, 4.5vw, 54px)' }}
        >
          What we are solving in
          <br />
          futures?
        </h2>

        <div className="flex justify-center mt-10 md:mt-12 relative z-20">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#5a3a18] bg-gradient-to-r from-red-900/50 via-red-950/80 to-red-900/50 transition-all duration-700 delay-100 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ animation: visible ? 'badge-pulse-orange 3s ease-in-out infinite' : undefined }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea8c28" strokeWidth="2">
              <path d="M8 2v4M16 2v4M12 14v4M5 8h14a2 2 0 0 1 2 2v3a9 9 0 1 1-18 0v-3a2 2 0 0 1 2-2zM3 12h2M19 12h2" strokeLinecap="round" />
            </svg>
            <span className="text-[12px] md:text-[13px] font-medium text-[#ea8c28] tracking-wide">
              The problem in the market
            </span>
          </div>
        </div>

        <div
          className={`mt-[-18px] rounded-xl border border-[#5a3a18]/70 bg-gradient-to-b from-red-950/40 via-black/70 to-black/70 backdrop-blur-sm p-6 md:p-10 transition-all duration-700 delay-150 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 pt-4">
            {problems.map((p, i) => (
              <ProblemCard key={i} item={p} delay={300 + i * 120} />
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-14 md:mt-16 relative z-20">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#1f5a32] bg-gradient-to-r from-green-900/50 via-green-950/80 to-green-900/50 transition-all duration-700 delay-200 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
            }`}
            style={{ animation: visible ? 'badge-pulse-green 3s ease-in-out infinite' : undefined }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6 6 2 2 6-6a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] md:text-[13px] font-medium text-[#22c55e] tracking-wide">
              How SRD fixes this
            </span>
          </div>
        </div>

        <div
          className={`mt-[-18px] rounded-xl border border-[#1f5a32]/70 bg-gradient-to-b from-green-950/40 via-black/70 to-black/70 backdrop-blur-sm p-6 md:p-10 transition-all duration-700 delay-300 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 pt-4">
            {fixes.map((f, i) => (
              <ProblemCard key={i} item={f} delay={500 + i * 120} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
