'use client';
import { useState } from 'react';
import { useSignInModal, SignInModalWrapper } from './hooks/useSignInModal';

export default function TradeButton() {
  const [showSoon, setShowSoon] = useState(false);
  const { walletModalOpen, setWalletModalOpen, handleCtaClick } = useSignInModal();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCtaClick();
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="relative overflow-hidden rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide text-white bg-gradient-to-r from-purple via-purple/80 to-white/90 shadow-[0_0_12px_rgba(123,47,247,0.4)] hover:shadow-[0_0_18px_rgba(123,47,247,0.6)] transition-all duration-200 min-w-[78px]"
      >
        <span className="inline-block animate-fade-in">Trade</span>
      </button>
      <SignInModalWrapper open={walletModalOpen} onOpenChange={setWalletModalOpen}>
        <div />
      </SignInModalWrapper>
    </>
  );
}
