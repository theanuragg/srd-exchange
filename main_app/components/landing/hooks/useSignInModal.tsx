'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { SignInModal, SignInModalContent } from '@coinbase/cdp-react';

export function useSignInModal() {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { isSignedIn } = useIsSignedIn();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isSignedIn && pathname === '/') {
      router.push('/fiat');
    }
  }, [isSignedIn, router, pathname]);

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
