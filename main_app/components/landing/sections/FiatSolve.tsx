'use client';
import { useEffect, useRef, useState } from 'react';
import { Bug, Wrench } from 'lucide-react';

const PURPLE = '#a06fff';

function HazardIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="52" height="52" rx="4" />
      {[0,1,2,3,4,5].map(i => <line key={`t${i}`} x1={6+i*9} y1="6" x2={6+i*9-6} y2="12" opacity="0.6" />)}
      {[0,1,2,3,4,5].map(i => <line key={`b${i}`} x1={6+i*9} y1="52" x2={6+i*9-6} y2="58" opacity="0.6" />)}
      <path d="M32 20 L44 42 L20 42 Z" />
      <line x1="32" y1="27" x2="32" y2="34" />
      <circle cx="32" cy="38" r="1" fill={PURPLE} />
    </svg>
  );
}

function MazeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12 L20 12 L20 24 L32 24 L32 12 L44 12" />
      <path d="M44 12 L44 28 L52 28" />
      <path d="M8 28 L14 28 L14 40 L26 40" />
      <path d="M26 40 L26 52 L40 52" />
      <path d="M40 52 L40 36 L52 36 L52 52" />
      <path d="M44 12 L40 9 M44 12 L40 15" />
      <path d="M52 28 L48 25 M52 28 L48 31" />
      <path d="M40 52 L36 49 M40 52 L36 55" />
      <path d="M52 52 L48 49 M52 52 L48 55" />
    </svg>
  );
}

function VaultIcon({ snow = false }: { snow?: boolean }) {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="14" width="44" height="36" rx="3" />
      <circle cx="32" cy="32" r="10" />
      <circle cx="32" cy="32" r="2.5" fill={PURPLE} />
      {[0,45,90,135,180,225,270,315].map(a => {
        const rad = (a * Math.PI) / 180;
        return <line key={a} x1={32+Math.cos(rad)*10.5} y1={32+Math.sin(rad)*10.5} x2={32+Math.cos(rad)*13} y2={32+Math.sin(rad)*13} />;
      })}
      <line x1="10" y1="50" x2="14" y2="56" />
      <line x1="54" y1="50" x2="50" y2="56" />
      {snow && (
        <g opacity="0.85" fill={PURPLE} stroke="none">
          <text x="16" y="22" fontSize="6">❋</text>
          <text x="46" y="22" fontSize="6">❋</text>
          <text x="50" y="44" fontSize="5">❋</text>
          <text x="14" y="44" fontSize="5">❋</text>
        </g>
      )}
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="14" width="44" height="36" rx="3" />
      <path d="M10 20 L10 14 L16 14" />
      <path d="M54 20 L54 14 L48 14" />
      <path d="M10 44 L10 50 L16 50" />
      <path d="M54 44 L54 50 L48 50" />
      <circle cx="32" cy="32" r="10" fill={`${PURPLE}40`} stroke={PURPLE} />
      <line x1="32" y1="26" x2="32" y2="33" strokeWidth="2.2" />
      <path d="M27 30 A 6 6 0 1 0 37 30" strokeWidth="2.2" />
    </svg>
  );
}

function ArrowStackIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none" stroke={PURPLE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 18 L46 18 M40 12 L48 18 L40 24" />
      <path d="M14 32 L50 32 M44 26 L52 32 L44 38" />
      <path d="M10 46 L44 46 M38 40 L46 46 L38 52" />
    </svg>
  );
}

function IndiaChipIcon() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <img src="/assets/india-map.png" alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
      <svg viewBox="0 0 40 30" className="absolute w-8 h-6" fill="none" stroke={PURPLE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="8" width="24" height="16" rx="2" fill={`${PURPLE}66`} />
        <line x1="8" y1="13" x2="4" y2="13" />
        <line x1="8" y1="19" x2="4" y2="19" />
        <line x1="32" y1="13" x2="36" y2="13" />
        <line x1="32" y1="19" x2="36" y2="19" />
        <line x1="14" y1="8" x2="14" y2="4" />
        <line x1="20" y1="8" x2="20" y2="4" />
        <line x1="26" y1="8" x2="26" y2="4" />
        <line x1="14" y1="24" x2="14" y2="28" />
        <line x1="20" y1="24" x2="20" y2="28" />
        <line x1="26" y1="24" x2="26" y2="28" />
      </svg>
    </div>
  );
}

function IndiaQRIcon() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <img src="/assets/india-map.png" alt="" className="w-full h-full object-contain" loading="lazy" decoding="async" />
      <svg viewBox="0 0 22 22" className="absolute w-7 h-7" shapeRendering="crispEdges">
        <rect width="22" height="22" fill="#fff" />
        <rect x="1" y="1" width="6" height="6" fill="#000" />
        <rect x="2" y="2" width="4" height="4" fill="#fff" />
        <rect x="3" y="3" width="2" height="2" fill="#000" />
        <rect x="15" y="1" width="6" height="6" fill="#000" />
        <rect x="16" y="2" width="4" height="4" fill="#fff" />
        <rect x="17" y="3" width="2" height="2" fill="#000" />
        <rect x="1" y="15" width="6" height="6" fill="#000" />
        <rect x="2" y="16" width="4" height="4" fill="#fff" />
        <rect x="3" y="17" width="2" height="2" fill="#000" />
        {[[9,1],[11,1],[13,1],[9,3],[13,3],[9,5],[11,5],
          [1,9],[3,9],[5,9],[9,9],[11,9],[15,9],[17,9],[19,9],
          [1,11],[5,11],[9,11],[13,11],[17,11],
          [1,13],[3,13],[7,13],[11,13],[15,13],[19,13],
          [9,15],[11,15],[13,15],[17,15],[19,15],
          [9,17],[15,17],[19,17],
          [9,19],[11,19],[13,19],[15,19],[19,19]].map(([x,y],i) => (
          <rect key={i} x={x} y={y} width="1" height="1" fill="#000" />
        ))}
      </svg>
    </div>
  );
}

const problems = [
  { Icon: HazardIcon, label: 'No safe & simple crypto entry' },
  { Icon: MazeIcon, label: 'Complex onboarding & KYC friction' },
  { Icon: () => <VaultIcon snow />, label: 'Bank account freeze risk' },
  { Icon: IndiaChipIcon, label: 'Limited Real-World Use of Crypto Payments in South Asia' },
];

const fixes = [
  { Icon: DeviceIcon, label: 'Direct INR → USDT via UPI/CDM — no P2P risk' },
  { Icon: ArrowStackIcon, label: 'AI-driven Social KYC — no Aadhaar or PAN' },
  { Icon: VaultIcon, label: 'No bank dependency, no scams, no account freezes' },
  { Icon: IndiaQRIcon, label: 'QR-First Crypto Payments Built for South Asia' },
];

function Tile({ Icon, label, delay, inView }: { Icon: any; label: string; delay: number; inView: boolean }) {
  return (
    <div
      className={`flex flex-col items-center text-center transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="relative w-[160px] h-[140px] md:w-[180px] md:h-[160px] transition-transform duration-300 hover:scale-105">
        <img src="/assets/tile-frame.png" alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" loading="lazy" decoding="async" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon />
        </div>
      </div>
      <p className="mt-4 text-xs md:text-sm text-white/85 font-medium leading-snug max-w-[180px]">{label}</p>
    </div>
  );
}

export default function FiatSolve() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={ref} className="relative z-10 py-20 md:py-28 px-4 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto">
        <h2
          className={`font-heading font-bold text-white leading-[1.05] tracking-tight max-w-2xl transition-all duration-1000 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ fontSize: 'clamp(36px, 5.5vw, 64px)' }}
        >
          What we are solving in fiat?
        </h2>

        <div className="mt-10 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border bg-gradient-to-r from-orange-900/40 via-orange-950/80 to-orange-900/40 transition-all duration-700 delay-100 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            style={{ borderColor: '#a85a1a88' }}
          >
            <Bug className="w-4 h-4" style={{ color: '#f0a050' }} />
            <span className="text-sm font-medium" style={{ color: '#f0a050' }}>The problem in the market</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {problems.map((p, i) => (
            <Tile key={i} Icon={p.Icon} label={p.label} delay={200 + i * 120} inView={inView} />
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <div
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border bg-gradient-to-r from-green-900/40 via-green-950/80 to-green-900/40 transition-all duration-700 delay-300 ${inView ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            style={{ borderColor: '#1f8a4c88' }}
          >
            <Wrench className="w-4 h-4" style={{ color: '#4ade80' }} />
            <span className="text-sm font-medium" style={{ color: '#4ade80' }}>How SRD fixes this</span>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 justify-items-center">
          {fixes.map((p, i) => (
            <Tile key={i} Icon={p.Icon} label={p.label} delay={400 + i * 120} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
