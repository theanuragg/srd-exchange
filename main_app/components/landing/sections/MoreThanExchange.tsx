'use client';
import { useEffect, useRef, useState } from 'react';

function StackedEllipse() {
  return (
    <div className="relative w-7 h-7 md:w-8 md:h-8">
      <img src="/assets/ic-ellipse-bottom.svg" alt="" aria-hidden className="absolute left-0 top-1 w-5 md:w-6" loading="lazy" decoding="async" />
      <img src="/assets/ic-ellipse-top.svg" alt="" aria-hidden className="absolute right-0 bottom-0 w-5 md:w-6" loading="lazy" decoding="async" />
    </div>
  );
}

function BigQr() {
  return (
    <div className="w-full aspect-square">
      <img src="/assets/qr-code.svg" alt="QR code" className="w-full h-full object-contain" loading="lazy" decoding="async" />
    </div>
  );
}

export default function MoreThanExchange() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible(true),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="why-us"
      className="relative z-10 w-full bg-black overflow-hidden"
    >
      <div className="pointer-events-none absolute top-0 left-0 w-[55%] h-[120px]"
        style={{
          background:
            'linear-gradient(135deg, rgba(123,47,247,0.35) 0%, rgba(123,47,247,0.08) 40%, transparent 70%)',
          clipPath: 'polygon(0 0, 100% 0, 85% 100%, 0 100%)',
        }}
      />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[55%] h-[120px]"
        style={{
          background:
            'linear-gradient(315deg, rgba(123,47,247,0.35) 0%, rgba(123,47,247,0.08) 40%, transparent 70%)',
          clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 0 100%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div
            className={`transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <h2
              className="font-heading font-bold text-text-primary leading-[1.1] tracking-[-0.02em]"
              style={{ fontSize: 'clamp(34px, 5vw, 60px)' }}
            >
              More than an exchange.
              <br />
              A decentralized trading gateway.
            </h2>
          </div>

          <div
            className={`transition-all duration-700 delay-150 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <div className="flex flex-col items-center gap-5 md:gap-7 mx-auto w-[180px] sm:w-[220px] md:w-[260px]">
              <div className="grid grid-cols-3 gap-2 md:gap-3 w-full -mt-6 md:-mt-10">
                {[
                  <img key="c" src="/assets/ic-connect.svg" alt="" aria-hidden className="w-7 h-7 md:w-8 md:h-8 object-contain" loading="lazy" decoding="async" />,
                  <img key="p" src="/assets/ic-paypal.svg" alt="" aria-hidden className="w-6 h-7 md:w-7 md:h-8 object-contain" loading="lazy" decoding="async" />,
                  <StackedEllipse key="e" />,
                ].map((icon, i) => (
                  <div
                    key={i}
                    className="relative h-[120px] md:h-[160px] flex items-end justify-center pb-4 md:pb-5"
                  >
                    <img
                      src="/assets/rect-top.svg"
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      loading="lazy" decoding="async" />
                    <div className="relative flex items-center justify-center">
                      {icon}
                    </div>
                  </div>
                ))}
              </div>

              <BigQr />

              <div className="grid grid-cols-3 gap-2 md:gap-3 w-full -mb-6 md:-mb-10">
                {['/assets/ic-usdt.svg', '/assets/ic-doge.svg', '/assets/ic-bsv.svg'].map((ic, i) => (
                  <div
                    key={i}
                    className="relative h-[120px] md:h-[160px] flex items-start justify-center pt-4 md:pt-5"
                  >
                    <img
                      src="/assets/rect-bottom.svg"
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                      loading="lazy" decoding="async" />
                    <img
                      src={ic}
                      alt=""
                      aria-hidden
                      className="relative w-8 h-8 md:w-10 md:h-10 object-contain"
                      loading="lazy" decoding="async" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
