'use client';
import { useEffect, useRef, useState } from 'react';
import { Ban, Zap, ChevronDown, ArrowDownUp, Check, Sparkles } from 'lucide-react';

const chains = [
  { name: 'BNB Chain', color: '#F3BA2F', icon: (
    <div className="w-12 h-12 rounded-full bg-[#F3BA2F] flex items-center justify-center text-black font-bold text-lg">
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="currentColor"><path d="M12.116 14.404L16 10.52l3.886 3.886L21.8 12.49l-5.8-5.8-5.8 5.8 1.916 1.914zM6.49 16l1.914-1.914L10.318 16l-1.914 1.914L6.49 16zm5.626 1.596L16 21.48l3.886-3.886 1.916 1.914L16 25.31l-5.8-5.8 1.916-1.914zm9.566-1.596l1.914-1.914L25.51 16l-1.914 1.914L21.682 16zM16 13.57L14.086 15.486 16 17.4l1.914-1.914L16 13.57z"/></svg>
    </div>
  )},
  { name: 'Ethereum', color: '#627EEA', icon: (
    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white">
      <img src="/assets/ethereum.svg" alt="Ethereum" className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
    </div>
  )},
  { name: 'Base', color: '#0052FF', icon: (
    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
      <img src="/assets/base.jpeg" alt="Base" className="w-12 h-12 object-cover" loading="lazy" decoding="async" />
    </div>
  )},
  { name: 'Arbitrum', color: '#2D374B', icon: (
    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
      <img src="/assets/arbitrum.svg" alt="Arbitrum" className="w-12 h-12 object-contain" loading="lazy" decoding="async" />
    </div>
  )},
  { name: 'Optimism', color: '#FF0420', icon: (
    <div className="w-12 h-12 rounded-full bg-[#FF0420] flex items-center justify-center text-white font-bold italic text-sm">OP</div>
  )},
  { name: 'Polygon', color: '#8247E5', icon: (
    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
      <img src="/assets/polygon.svg" alt="Polygon" className="w-12 h-12 object-contain" loading="lazy" decoding="async" />
    </div>
  )},
  { name: 'Avalanche', color: '#E84142', icon: (
    <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center">
      <img src="/assets/avalanche.jpeg" alt="Avalanche" className="w-12 h-12 object-cover" loading="lazy" decoding="async" />
    </div>
  )},
  { name: 'Solana', color: '#9945FF', icon: (
    <div className="w-12 h-12 rounded-full bg-[#1a1a2e] flex items-center justify-center">
      <svg viewBox="0 0 32 32" className="w-7 h-7"><defs><linearGradient id="sol" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs><path fill="url(#sol)" d="M7 22l4-4h14l-4 4H7zm0-6l4-4h14l-4 4H7zm0-6l4-4h14l-4 4H7z"/></svg>
    </div>
  )},
];

const loopChains = [...chains, ...chains];

export default function SwapSection() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [swapState, setSwapState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const handleSwap = () => {
    if (swapState !== 'idle') return;
    setSwapState('loading');
    setTimeout(() => setSwapState('done'), 1400);
    setTimeout(() => setSwapState('idle'), 3800);
  };

  return (
    <section ref={ref} className="relative z-10 py-24 px-4 overflow-hidden">
      <div className="max-w-[1280px] mx-auto">
        <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div>
            <h2 className="font-heading font-bold leading-none tracking-tight"
                style={{ fontSize: 'clamp(80px, 12vw, 180px)', background: 'linear-gradient(180deg, #ffffff 0%, #7B2FF7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Swap
            </h2>
            <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-md">
              Swap across 7+ chains in one click.<br />
              Fast, secure and <span className="text-purple font-semibold">gasless.</span>
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-dark-card/60 border border-purple/30 backdrop-blur-sm">
                <Ban className="w-4 h-4 text-purple" />
                <span className="text-sm font-semibold text-white">No Gas Fee</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-dark-card/60 border border-purple/30 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-purple" />
                <span className="text-sm font-semibold text-white">Simple like CEX</span>
              </div>
            </div>
          </div>

          <div className={`relative rounded-2xl bg-dark-card/80 border border-purple/40 backdrop-blur-xl p-6 shadow-glow-purple-lg transition-all duration-1000 delay-200 ${inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-bold text-white font-heading">Swap</h3>
            </div>

            <div className="rounded-xl bg-black/60 border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary">You Pay</span>
                <span className="text-xs text-text-tertiary">Balance: 1.2345</span>
              </div>
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card border border-white/10 hover:border-purple/40 transition">
                  <div className="w-6 h-6 rounded-full bg-[#F3BA2F] flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="w-4 h-4" fill="#000"><path d="M12.116 14.404L16 10.52l3.886 3.886L21.8 12.49l-5.8-5.8-5.8 5.8 1.916 1.914zM6.49 16l1.914-1.914L10.318 16l-1.914 1.914L6.49 16zm5.626 1.596L16 21.48l3.886-3.886 1.916 1.914L16 25.31l-5.8-5.8 1.916-1.914zm9.566-1.596l1.914-1.914L25.51 16l-1.914 1.914L21.682 16zM16 13.57L14.086 15.486 16 17.4l1.914-1.914L16 13.57z"/></svg>
                  </div>
                  <span className="text-white font-semibold">BNB</span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                </button>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">1.00</div>
                  <div className="text-xs text-text-tertiary">~$ 587.69</div>
                </div>
              </div>
            </div>

            <div className="flex justify-center -my-2 relative z-10">
              <button className="w-10 h-10 rounded-full bg-black border-2 border-purple/40 flex items-center justify-center hover:rotate-180 transition-transform duration-300">
                <ArrowDownUp className="w-4 h-4 text-purple" />
              </button>
            </div>

            <div className="rounded-xl bg-black/60 border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-tertiary">You Receive</span>
                <span className="text-xs text-text-tertiary">Balance: 0.000</span>
              </div>
              <div className="flex items-center justify-between">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-card border border-white/10 hover:border-purple/40 transition">
                  <div className="w-6 h-6 rounded-full bg-[#1a1a2e] flex items-center justify-center">
                    <svg viewBox="0 0 32 32" className="w-4 h-4"><path fill="#fff" d="M16 4v9l8 3.5z"/><path fill="#fff" fillOpacity=".7" d="M16 4L8 16.5 16 13z"/><path fill="#fff" d="M16 21v7l8-11z"/><path fill="#fff" fillOpacity=".7" d="M16 28v-7l-8-4z"/></svg>
                  </div>
                  <span className="text-white font-semibold">ETH</span>
                  <ChevronDown className="w-4 h-4 text-text-tertiary" />
                </button>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">0.3093</div>
                  <div className="text-xs text-text-tertiary">~$ 587.24</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSwap}
              disabled={swapState !== 'idle'}
              className="relative mt-5 w-full py-4 rounded-xl bg-gradient-to-r from-purple to-[#5b1fc9] text-white font-bold text-base hover:shadow-[0_0_25px_rgba(123,47,247,0.5)] transition-all overflow-hidden disabled:opacity-90"
            >
              <span className={`flex items-center justify-center gap-2 transition-all duration-300 ${swapState === 'idle' ? 'opacity-100' : 'opacity-0'}`}>
                Swap
              </span>
              {swapState === 'loading' && (
                <span className="absolute inset-0 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  <span>Swapping...</span>
                </span>
              )}
              {swapState === 'done' && (
                <span className="absolute inset-0 flex items-center justify-center gap-2 bg-gradient-to-r from-[#1f8a4c] to-[#0f5a30] animate-[fade-in_0.3s_ease-out]">
                  <Check className="w-5 h-5" strokeWidth={3} />
                  <span>Swap Done</span>
                </span>
              )}
            </button>

            {swapState === 'done' && (
              <div className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-20 backdrop-blur-sm bg-black/40 animate-[fade-in_0.3s_ease-out]">
                <div className="flex flex-col items-center gap-4 animate-[scale-in_0.4s_cubic-bezier(0.16,1,0.3,1)]">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-purple/40 blur-2xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-purple to-[#5b1fc9] flex items-center justify-center shadow-[0_0_40px_rgba(123,47,247,0.7)]">
                      <Check className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple/30 to-[#5b1fc9]/30 border border-purple/50 backdrop-blur-md shadow-glow-purple">
                    <Sparkles className="w-4 h-4 text-purple" />
                    <span className="text-sm font-bold text-white tracking-wide">No Gas Fee · Paid by Srd</span>
                    <Sparkles className="w-4 h-4 text-purple" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`mt-12 rounded-2xl bg-dark-card/60 border border-white/5 backdrop-blur-sm py-6 overflow-hidden transition-all duration-1000 delay-500 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex gap-12 animate-marquee whitespace-nowrap">
            {loopChains.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 min-w-[100px]">
                {c.icon}
                <span className="text-sm text-white font-medium">{c.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-purple" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
