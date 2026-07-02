'use client';
import { useEffect, useRef, useState } from 'react';
import { Users, Wallet } from 'lucide-react';

function CountUp({ end, duration = 2000, trigger, suffix = '', formatter }: { end: number; duration?: number; trigger: boolean; suffix?: string; formatter?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.floor(eased * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, end, duration]);
  return <>{formatter ? formatter(n) : n.toLocaleString()}{suffix}</>;
}

type Currency = {
  code: string;
  label: string;
  logo: string;
};

const FIAT: Record<string, Currency> = {
  INR: { code: 'INR', label: '₹', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Indian_Rupee_symbol.svg/240px-Indian_Rupee_symbol.svg.png' },
  USD: { code: 'USD', label: '$', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Dollar_Sign.svg/240px-Dollar_Sign.svg.png' },
  EUR: { code: 'EUR', label: '€', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Euro_symbol_black.svg/240px-Euro_symbol_black.svg.png' },
  GBP: { code: 'GBP', label: '£', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Pound_sterling_symbol.svg/240px-Pound_sterling_symbol.svg.png' },
  JPY: { code: 'JPY', label: '¥', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Yen_symbol.svg/240px-Yen_symbol.svg.png' },
};

const CRYPTO: Record<string, Currency> = {
  USDT: { code: 'USDT', label: 'USDT', logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/usdt.svg' },
  USDC: { code: 'USDC', label: 'USDC', logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/usdc.svg' },
  BTC:  { code: 'BTC',  label: 'BTC',  logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/btc.svg' },
  ETH:  { code: 'ETH',  label: 'ETH',  logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/eth.svg' },
  SOL:  { code: 'SOL',  label: 'SOL',  logo: 'https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons/svg/color/sol.svg' },
};

type Particle = {
  top: number;
  size: number;
  delay: number;
  duration: number;
  fiat: keyof typeof FIAT;
  crypto: keyof typeof CRYPTO;
  dir: 'ltr' | 'rtl';
};

const particles: Particle[] = [
  { top: 10, size: 52, delay: 0.0, duration: 7.0, fiat: 'INR', crypto: 'USDT', dir: 'ltr' },
  { top: 24, size: 46, delay: 1.4, duration: 7.6, fiat: 'USD', crypto: 'BTC',  dir: 'rtl' },
  { top: 38, size: 56, delay: 0.6, duration: 6.6, fiat: 'EUR', crypto: 'USDC', dir: 'ltr' },
  { top: 52, size: 48, delay: 2.2, duration: 7.8, fiat: 'GBP', crypto: 'ETH',  dir: 'rtl' },
  { top: 66, size: 50, delay: 1.0, duration: 6.8, fiat: 'JPY', crypto: 'SOL',  dir: 'ltr' },
  { top: 80, size: 48, delay: 3.0, duration: 7.4, fiat: 'USD', crypto: 'USDT', dir: 'rtl' },
  { top: 18, size: 42, delay: 3.6, duration: 6.4, fiat: 'INR', crypto: 'BTC',  dir: 'ltr' },
  { top: 60, size: 44, delay: 2.6, duration: 7.0, fiat: 'EUR', crypto: 'USDC', dir: 'rtl' },
];

function FiatChip({ size, currency }: { size: number; currency: Currency }) {
  return (
    <div
      className="rounded-full bg-white border-2 border-purple/60 shadow-[0_0_18px_rgba(123,47,247,0.55)] flex items-center justify-center overflow-hidden"
      style={{ width: size * 1.3, height: size * 1.3 }}
      title={currency.code}
    >
      <span className="font-bold text-purple select-none" style={{ fontSize: size * 0.55 }}>
        {currency.label}
      </span>
    </div>
  );
}

function CryptoChip({ size, currency }: { size: number; currency: Currency }) {
  return (
    <div
      className="rounded-full bg-black/40 border-2 border-purple/70 shadow-[0_0_22px_rgba(123,47,247,0.7)] flex items-center justify-center overflow-hidden backdrop-blur-sm"
      style={{ width: size * 1.4, height: size * 1.4 }}
      title={currency.code}
    >
      <img
        src={currency.logo}
        alt={currency.code}
        className="object-contain"
        style={{ width: '78%', height: '78%' }}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}

export default function FiatOnboarding() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative z-10 bg-black py-20 md:py-28 px-4 overflow-hidden">
      <div className="max-w-[1280px] mx-auto">
        <div className={`max-w-3xl transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="font-heading font-bold text-white leading-[1.05] tracking-tight"
              style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
            Decentralized Fiat<br />Onboarding
          </h2>
          <p className="mt-5 text-base md:text-lg text-text-secondary max-w-2xl leading-relaxed">
            SRD bridges Fiat and Stablecoins — enabling instant fiat onboarding while routing trades through decentralized, multi-liquidity infrastructure.
          </p>
        </div>

        <div className="mt-10 md:mt-14 grid lg:grid-cols-[1.6fr_1fr] gap-6">
          <div className={`relative rounded-2xl bg-dark-card/70 border border-bordercolor-subtle backdrop-blur-sm overflow-hidden h-[320px] md:h-[400px] transition-all duration-1000 delay-200 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="absolute top-3 left-4 text-[10px] md:text-xs font-semibold tracking-[0.2em] text-text-tertiary uppercase">Fiat</div>
            <div className="absolute top-3 right-4 text-[10px] md:text-xs font-semibold tracking-[0.2em] text-text-tertiary uppercase">Crypto</div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-[78%] bg-gradient-to-b from-transparent via-purple to-transparent rounded-full shadow-[0_0_25px_rgba(123,47,247,0.85)] z-10">
              <div className="absolute inset-0 bg-purple blur-md opacity-70" />
              <div className="absolute inset-0 bg-white/40 blur-[2px] opacity-60 animate-pulse" />
            </div>

            {inView && particles.map((p, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  top: `${p.top}%`,
                  left: 0,
                  right: 0,
                  height: 0,
                }}
              >
                <div
                  className="absolute -translate-y-1/2"
                  style={{
                    animation: `${p.dir === 'ltr' ? 'travel-ltr' : 'travel-rtl'} ${p.duration}s linear ${p.delay}s infinite`,
                  }}
                >
                  <div
                    className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      animation: `${p.dir === 'ltr' ? 'morph-out' : 'morph-in'} ${p.duration}s linear ${p.delay}s infinite`,
                    }}
                  >
                    <FiatChip size={p.size} currency={FIAT[p.fiat]} />
                  </div>
                  <div
                    className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      animation: `${p.dir === 'ltr' ? 'morph-in' : 'morph-out'} ${p.duration}s linear ${p.delay}s infinite`,
                    }}
                  >
                    <CryptoChip size={p.size} currency={CRYPTO[p.crypto]} />
                  </div>
                </div>
              </div>
            ))}

            {inView && [0, 1, 2].map(i => (
              <span
                key={i}
                className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)] z-20"
                style={{ top: `${20 + i * 30}%`, animation: `divider-pulse 2s ease-in-out ${i * 0.6}s infinite` }}
              />
            ))}
          </div>

          <div className={`relative rounded-2xl bg-dark-card/70 border border-bordercolor-subtle backdrop-blur-sm p-8 md:p-10 transition-all duration-1000 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="absolute left-0 top-8 bottom-8 w-px bg-gradient-to-b from-transparent via-white/30 to-transparent" />

            <div className="flex flex-col h-full justify-around gap-8 pl-4">
              <div>
                <div className="flex items-center gap-4">
                  <Users className="w-9 h-9 md:w-10 md:h-10 text-white/90" strokeWidth={1.4} />
                  <span className="font-heading font-bold leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
                        style={{ fontSize: 'clamp(40px, 5vw, 60px)' }}>
                    <CountUp end={300} trigger={inView} suffix="+" />
                  </span>
                </div>
                <p className="mt-3 text-lg md:text-xl text-text-secondary">Visitors weekly</p>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              <div>
                <div className="flex items-center gap-4">
                  <Wallet className="w-9 h-9 md:w-10 md:h-10 text-white/90" strokeWidth={1.4} />
                  <span className="font-heading font-bold leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent"
                        style={{ fontSize: 'clamp(40px, 5vw, 60px)' }}>
                    <CountUp end={20000} trigger={inView} formatter={(n) => n.toLocaleString()} suffix=" $" />
                  </span>
                </div>
                <p className="mt-3 text-lg md:text-xl text-text-secondary">Monthly transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes travel-ltr {
          0%   { left: -6%;  opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: 106%; opacity: 0; }
        }
        @keyframes travel-rtl {
          0%   { left: 106%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { left: -6%;  opacity: 0; }
        }
        @keyframes morph-out {
          0%, 45%   { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
          50%       { opacity: 0; transform: translate(-50%, -50%) scale(0.6); filter: blur(6px); }
          100%      { opacity: 0; transform: translate(-50%, -50%) scale(0.6); filter: blur(6px); }
        }
        @keyframes morph-in {
          0%, 50%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); filter: blur(6px); }
          55%       { opacity: 1; transform: translate(-50%, -50%) scale(1.05); filter: blur(0); }
          100%      { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); }
        }
        @keyframes divider-pulse {
          0%, 100% { opacity: 0.3; transform: translate(-50%, 0) scale(0.8); }
          50%      { opacity: 1;   transform: translate(-50%, 0) scale(1.4); }
        }
      `}</style>
    </section>
  );
}
