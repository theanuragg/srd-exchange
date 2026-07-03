'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { SignInModal, SignInModalContent } from '@coinbase/cdp-react';

export function useSignInModal() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { isSignedIn } = useIsSignedIn();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push('/fiat');
    }
  }, [isSignedIn, router]);

  const handleCtaClick = () => {
    if (isSignedIn) {
      router.push('/fiat');
    } else {
      setWalletModalOpen(true);
    }
  };

  return {
    walletModalOpen,
    setWalletModalOpen,
    isSignedIn,
    handleCtaClick,
  };
}

export function SignInModalWrapper({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <SignInModal open={open} setIsOpen={onOpenChange}>
      {children}
      <SignInModalContent />
    </SignInModal>
  );
}
