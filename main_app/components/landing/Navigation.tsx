'use client';
import { useState, useEffect } from 'react';
import type { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { CandlestickChart, Mail, HelpCircle, Menu, X, Rocket } from 'lucide-react';
import { useSignInModal, SignInModalWrapper } from './hooks/useSignInModal';
import { useWalletManager } from '@/hooks/useWalletManager';
import { useSidebar } from '@/context/SidebarContext';

const isExternalLink = (href: string) => href.startsWith('http') || href.startsWith('mailto:');

type NavItem = {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  iconSrc?: string;
};

const navItems: NavItem[] = [
  { label: 'Contact', icon: Mail, href: 'mailto:info@srd.exchange' },
  { label: 'Why us?', icon: HelpCircle, href: '/#what-we-solve' },
  { label: 'Futures', icon: CandlestickChart, href: '/trade' },
  { label: 'Swap', iconSrc: '/assets/swap-icon.png', href: '/swap' },
  { label: 'Fiat', iconSrc: '/assets/fiat-icon.png', href: '/fiat' },
];

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function YouTubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const socialLinks = [
  { icon: XIcon, href: 'https://x.com/SrdExchange', label: 'X (Twitter)' },
  { icon: TelegramIcon, href: 'https://t.me/SrdExchangeGlobal', label: 'Telegram' },
  { icon: YouTubeIcon, href: 'https://www.youtube.com/@srd.exchange', label: 'YouTube' },
];

export default function Navigation() {
  const pathname = usePathname();
  const isAppPage = pathname !== '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { walletModalOpen, setWalletModalOpen, handleCtaClick } = useSignInModal();
  const { address, isSmartAccountReady } = useWalletManager();
  const { openSidebar } = useSidebar();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-200 backdrop-blur-xl backdrop-saturate-150 border-b ${
          scrolled
            ? 'bg-[#050505]/95 border-purple/30 shadow-[0_4px_30px_rgba(123,47,247,0.15)]'
            : 'bg-black/30 border-purple/15'
        }`}
      >
        <div className="h-full w-full flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-14">
          <a
            href="https://www.srd.exchange"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:scale-[1.02] transition-transform duration-200"
          >
            <img src="/assets/srd-logo.png" alt="Srd.Exchange logo" className="h-10 w-auto object-contain" />
            <span className="font-heading text-lg font-bold tracking-tight text-white leading-none mt-0.5">
              Srd.Exchange
            </span>
          </a>

          <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target={isExternalLink(item.href) ? '_blank' : undefined}
                  rel={isExternalLink(item.href) ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-primary hover:text-purple transition-colors duration-200"
                >
                  {item.icon ? (
                    <item.icon className="w-4 h-4" />
                  ) : (
                    <img src={item.iconSrc} alt="" className="w-4 h-4 object-contain" />
                  )}
                  <span>{item.label}</span>
                </a>
              ))}

              {isAppPage ? (
                <button
                  onClick={openSidebar}
                  className="ml-2 flex items-center gap-2 px-4 py-2 border border-[#622DBF] rounded-lg bg-[#622DBF]/5 hover:bg-[#622DBF]/15 transition-all group shadow-[0_0_15px_rgba(123,47,247,0.15)]"
                >
                  <img src="/assets/wallet-icon.svg" alt="Wallet" className="w-4 h-4 shrink-0 brightness-0 invert" />
                  {address && isSmartAccountReady ? (
                    <span className="text-sm font-mono text-white">wallet</span>
                  ) : (
                    <span className="text-sm font-medium text-white">Wallet</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCtaClick}
                  className="ml-2 flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold text-white bg-purple rounded-lg border border-transparent shadow-[0_0_15px_rgba(123,47,247,0.3)] hover:bg-purple-hover hover:shadow-[0_0_25px_rgba(123,47,247,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Launch</span>
                </button>
              )}

              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-bordercolor-subtle">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="text-text-secondary hover:text-purple transition-colors duration-200 hover:scale-110"
                  >
                    <social.icon className="w-[18px] h-[18px]" />
                  </a>
                ))}
              </div>
            </div>

            <button
              className="md:hidden text-white p-2 ml-auto"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 mobile-nav-glass bg-black/40 backdrop-blur-2xl transition-all duration-300 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-6">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={isExternalLink(item.href) ? '_blank' : undefined}
              rel={isExternalLink(item.href) ? 'noopener noreferrer' : undefined}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 text-xl font-medium text-text-primary hover:text-purple transition-colors duration-200"
            >
              {item.icon ? (
                <item.icon className="w-5 h-5" />
              ) : (
                <img src={item.iconSrc} alt="" className="w-5 h-5 object-contain" />
              )}
              <span>{item.label}</span>
            </a>
          ))}

          {isAppPage ? (
            <button
              onClick={() => {
                setMobileOpen(false);
                openSidebar();
              }}
              className="flex items-center gap-2 px-8 py-3 text-lg font-semibold text-white border border-[#622DBF] bg-[#622DBF]/5 rounded-lg shadow-[0_0_15px_rgba(123,47,247,0.15)] hover:bg-[#622DBF]/15 transition-all duration-200 mt-2"
            >
              <img src="/assets/wallet-icon.svg" alt="Wallet" className="w-5 h-5 shrink-0 brightness-0 invert" />
              {address && isSmartAccountReady ? (
                <span className="font-mono">wallet</span>
              ) : (
                <span>Wallet</span>
              )}
            </button>
          ) : (
            <button
              onClick={() => {
                setMobileOpen(false);
                handleCtaClick();
              }}
              className="flex items-center gap-2 px-8 py-3 text-lg font-semibold text-white bg-purple rounded-lg shadow-[0_0_15px_rgba(123,47,247,0.3)] hover:bg-purple-hover hover:shadow-[0_0_25px_rgba(123,47,247,0.5)] transition-all duration-200 mt-2"
            >
              <Rocket className="w-5 h-5" />
              <span>Launch</span>
            </button>
          )}

          <div className="flex items-center gap-6 mt-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileOpen(false)}
                aria-label={social.label}
                className="text-text-secondary hover:text-purple transition-colors duration-200 hover:scale-110"
              >
                <social.icon className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>
      </div>

      <SignInModalWrapper open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <div />
      </SignInModalWrapper>
    </>
  );
}
