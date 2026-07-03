'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Mail, Send, Youtube, Linkedin } from 'lucide-react';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.844l-5.36-7.01L4.7 22H1.44l8.02-9.16L1 2h7.02l4.84 6.4L18.244 2Zm-1.2 18h1.86L7.02 4H5.06l11.984 16Z" />
    </svg>
  );
}

function MediumIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z" />
    </svg>
  );
}

export default function HomeFooter() {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <footer
      ref={ref}
      className="relative z-10 border-t border-[#5B2BD9]/60 bg-black overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-16 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-8">
          <div
            className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <h3 className="text-white font-bold tracking-wider text-sm md:text-base mb-5">ABOUT US</h3>
            <p className="text-[#cfcfd6] text-sm md:text-[15px] leading-relaxed max-w-md">
              srd.exchange is a multi-chain Web3 platform combining CEX simplicity with DEX self-custody. Sign up instantly via Gmail or mobile, trade gasless across Solana and 7 EVM chains, access futures via Multi-API routing, trade predictions, on/off-ramp fiat through P2P merchants, and spend crypto anywhere via QR Scan & Pay.
            </p>
          </div>

          <div
            className={`md:pl-8 lg:pl-24 transition-all duration-700 delay-150 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          >
            <h3 className="text-white font-bold tracking-wider text-sm md:text-base mb-5">CONTACT US</h3>
            <ul className="space-y-3 mb-8">
              {[
                { Icon: Mail, label: 'info@srd.exchange', href: 'mailto:info@srd.exchange' },
                { Icon: XIcon, label: '@SrdExchange', href: 'https://x.com/SrdExchange' },
                { Icon: Send, label: '@SrdExchange', href: 'https://t.me/SrdExchange' },
              ].map(({ Icon, label, href }, i) => (
                <li key={i}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-3 text-[#cfcfd6] text-sm hover:text-white transition-colors duration-300"
                  >
                    <Icon className="w-4 h-4 text-white" />
                    <span>{label}</span>
                  </a>
                </li>
              ))}
            </ul>

            <h4 className="text-white font-semibold text-base md:text-lg mb-4">Join the SRD Community today</h4>
            <div className="flex flex-wrap gap-4">
            {[
              { label: 'Telegram', Icon: Send, href: 'https://t.me/SrdExchange' },
              { label: 'X(Formerly Twitter)', Icon: XIcon, href: 'https://x.com/SrdExchange' },
              { label: 'Docs', Icon: BookOpen, href: 'https://docs.srd.exchange/' },
              { label: 'Medium', Icon: MediumIcon, href: 'https://medium.com/@srdexchange' },
              { label: 'LinkedIn', Icon: Linkedin, href: 'https://www.linkedin.com/company/srdexchange' },
              { label: 'YouTube', Icon: Youtube, href: 'https://www.youtube.com/@srd.exchange' },
            ].map(({ label, Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full border border-white/70 text-white text-sm hover:bg-white hover:text-black transition-all duration-300 hover:scale-105"
                >
                  <Icon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`mt-12 md:mt-16 transition-all duration-1000 delay-300 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <h2
            className="font-black leading-none select-none text-transparent text-center text-[18vw] md:text-[11vw] tracking-tight"
            style={{
              WebkitTextStroke: '1.5px #7B2FF7',
              fontFamily: 'Impact, "Arial Black", sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            SRD . EXCHANGE
          </h2>
        </div>

        <p className="text-center text-[#9a9aa3] text-[10px] md:text-xs max-w-3xl mx-auto leading-relaxed mt-6 mb-4">
          Risk Warning: virtual asset prices can be volatile. The value of your investment may go down or up and you may not get back the amount invested. You are solely responsible for your investment decisions and Srd.Exchange is not liable for any trading losses you may incur.
        </p>
        <p className="text-center text-[#9a9aa3] text-xs md:text-sm mt-6">
          © 2026 SRD Exchange All rights reserved
        </p>
      </div>
    </footer>
  );
}
