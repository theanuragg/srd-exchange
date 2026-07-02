'use client';
import { useEffect, useRef, useState } from 'react';

const slides = [
  {
    key: 'social',
    image: '/assets/kyc-social-new.svg',
    titleA: 'Meet ',
    titleB: 'AI-Driven Social KYC',
    titleBClass: 'bg-gradient-to-r from-[#7B2FF7] to-[#a06fff] bg-clip-text text-transparent',
    body: 'A smarter, privacy-first verification system that uses social trust and behavior signals instead of exposing your identity — fast, secure, and decentralized.',
  },
  {
    key: 'traditional',
    image: '/assets/kyc-traditional-new.svg',
    titleA: 'Still Stuck With ',
    titleB: 'Traditional KYC?',
    titleBClass: 'text-[#e8862a]',
    body: 'Traditional KYC is slow, invasive, and frustrating, especially for crypto users who value privacy.',
  },
];

export default function SocialKyc() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <section ref={ref} className="relative z-10 bg-black py-16 md:py-24 px-4 overflow-hidden">
      <div className="relative max-w-[1200px] mx-auto flex flex-col items-center text-center">
        <div className="relative w-full flex items-center justify-center min-h-[64px] md:min-h-[88px]">
          {slides.map((sl, i) => (
            <h2
              key={sl.key}
              className={`absolute font-heading font-bold text-white leading-[1.1] tracking-tight px-4 transition-all duration-700 ${
                i === idx ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'
              } ${inView ? '' : 'opacity-0'}`}
              style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}
            >
              {sl.titleA}
              <span className={sl.titleBClass}>{sl.titleB}</span>
            </h2>
          ))}
        </div>

        <div className="relative mt-6 md:mt-10 w-full max-w-[1100px] aspect-[1205/636] flex items-center justify-center">
          {slides.map((sl, i) => (
            <img
              key={sl.key}
              src={sl.image}
              alt={sl.key}
              className={`absolute inset-0 w-full h-full object-contain transition-all duration-1000 ${
                i === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
              } ${sl.key === 'social' ? 'rounded-[32px] md:rounded-[48px]' : ''}`}
              style={{
                ...(sl.key === 'social' && {
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
                }),
              }}
             loading="lazy" decoding="async" />
          ))}
        </div>

        <div className="relative mt-6 md:mt-8 w-full max-w-[680px] px-4 grid">
          {slides.map((sl, i) => (
            <p
              key={sl.key}
              className={`[grid-area:1/1] px-4 text-sm md:text-base text-white/80 leading-relaxed transition-all duration-700 ${
                i === idx ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
              }`}
            >
              {sl.body}
            </p>
          ))}
        </div>

        <div className="relative mt-10 flex gap-2">
          {slides.map((sl, i) => (
            <button
              key={sl.key}
              onClick={() => setIdx(i)}
              aria-label={`Show ${sl.key}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === idx ? 'w-8 bg-[#a06fff]' : 'w-3 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
