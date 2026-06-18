"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import {
  SignInModal,
  SignInModalContent,
} from '@coinbase/cdp-react';
import {
  X,
  Wallet,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWalletManager } from "@/hooks/useWalletManager";

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function WalletConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: WalletConnectModalProps) {
  const { isSignedIn } = useIsSignedIn();
  const { address, walletData, fetchWalletData } = useWalletManager();
  const router = useRouter();

  const [authStep, setAuthStep] = useState<"connect" | "authenticating" | "success">("connect");
  const [isMobile, setIsMobile] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isSignedIn && address) {
      handleWalletConnected();
    }
  }, [isSignedIn, address]);

  const handleWalletConnected = async () => {
    if (!address) return;
    setAuthStep("authenticating");

    try {
      const walletInfo = await fetchWalletData();

      const authRes = await fetch("/api/auth/wallet-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          walletData: walletInfo,
          action: "login",
        }),
      });

      const authData = await authRes.json();

      if (authData.requiresRegistration) {
        const registerRes = await fetch("/api/auth/wallet-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: address,
            walletData: walletInfo,
            action: "register",
          }),
        });

        const registerData = await registerRes.json();

        if (registerRes.ok) {
          setAuthStep("success");
          setTimeout(() => {
            router.push("/complete-profile");
            onClose();
          }, 1500);
        } else {
          throw new Error(registerData.error || "Registration failed");
        }
      } else if (authData.exists) {
        if (authData.user.role === "ADMIN") {
          setAuthStep("success");
          setTimeout(() => {
            router.push("/admin");
            onClose();
          }, 1500);
        } else if (!authData.user.profileCompleted) {
          setAuthStep("success");
          setTimeout(() => {
            router.push("/complete-profile");
            onClose();
          }, 1500);
        } else {
          setAuthStep("success");
          setTimeout(() => {
            router.push("/fiat");
            onClose();
          }, 1500);
        }
      }

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Authentication failed:", error);
      setAuthStep("connect");
    }
  };

  const handleSignInViaCdp = () => {
    if (!acceptTerms) {
      alert("Please accept the Terms and Conditions to continue.");
      return;
    }
    // CDP SignInModal handles the rest via its internal flow
  };

  // Loading states
  if (authStep === "authenticating") {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
            <motion.div className="bg-[#111010] rounded-xl p-8 max-w-lg w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-[#622DBF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h3 className="text-white text-xl font-semibold mb-2 font-montserrat">
                  Authenticating Wallet...
                </h3>
                <p className="text-gray-400 font-montserrat">
                  Verifying your wallet and fetching balances
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (authStep === "success") {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
            <motion.div className="bg-[#111010] rounded-xl p-8 max-w-lg w-full mx-4">
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-white text-xl font-semibold mb-2 font-montserrat">
                  Welcome to SRD Exchange!
                </h3>
                <p className="text-gray-400 font-montserrat">
                  Redirecting to your dashboard...
                </p>
                {walletData && (
                  <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm font-montserrat">
                      USDT Balance:{" "}
                      {parseFloat(walletData.balances.usdt.formatted).toFixed(
                        2
                      )}{" "}
                      USDT
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Desktop and Mobile animations
  const desktopVariants = {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  };

  const mobileVariants = {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[9998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className={`fixed bg-[#0A0A0A] z-[9999] overflow-y-auto border border-[#622DBF] ${isMobile
              ? "bottom-0 mx-2 left-0 right-0 h-[85vh] rounded-t-3xl"
              : "top-0 right-0 h-full w-full max-w-xl sm:max-w-2xl rounded-md"
              }`}
            initial={
              isMobile ? mobileVariants.initial : desktopVariants.initial
            }
            animate={
              isMobile ? mobileVariants.animate : desktopVariants.animate
            }
            exit={isMobile ? mobileVariants.exit : desktopVariants.exit}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* Mobile drag indicator */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
              </div>
            )}

            {/* Header */}
            <div
              className={`sticky top-0 bg-[#0A0A0A] border-b border-[#2A2A2A] z-10 ${isMobile ? "p-4" : "p-4 sm:p-5"
                }`}
            >
              <div className="flex items-center justify-between">
                <h2
                  className={`font-bold text-white font-montserrat ${isMobile ? "text-xl" : "text-2xl sm:text-3xl"
                    }`}
                >
                  Connect your wallet
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p
                className={`text-gray-400 mt-2 font-montserrat max-w-lg ${isMobile ? "text-sm" : "text-sm sm:text-base"
                  }`}
              >
                Securely link your crypto wallet to start trading <br />{" "}
                instantly — no sign-up, no hassle.
              </p>
            </div>

            {/* Content */}
            <div className={isMobile ? "p-4" : "p-4 sm:p-6"}>
              {/* CDP Sign In Modal */}
              <div className="w-full">
                <SignInModal open={isOpen} setIsOpen={(open) => { if (!open) onClose(); }}>
                  <SignInModalContent />
                </SignInModal>
              </div>

              {/* Terms and Conditions Checkbox */}
              <motion.div
                className="mt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                <motion.label
                  className="flex items-start space-x-3 cursor-pointer group"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.2 }}
                >
                  <motion.div
                    className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-all mt-0.5 ${acceptTerms
                      ? 'bg-[#622DBF] border-[#622DBF]'
                      : 'bg-[#1E1C1C] border-[#3E3E3E] group-hover:border-[#622DBF]/50'
                      }`}
                    onClick={() => setAcceptTerms(!acceptTerms)}
                    whileTap={{ scale: 0.9 }}
                  >
                    <AnimatePresence>
                      {acceptTerms && (
                        <motion.svg
                          className="w-3 h-3 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </motion.svg>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="flex-1">
                    <span
                      className={`font-medium font-montserrat transition-colors ${isMobile ? "text-sm" : "text-sm sm:text-base"
                        } ${acceptTerms ? "text-white" : "text-gray-300 group-hover:text-white"}`}
                    >
                      I accept the{" "}
                      <a

                        className="text-[#622DBF] hover:text-[#8B5CF6] underline transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open('/terms-and-conditions', '_blank');
                        }}
                      >
                        Terms and Conditions
                      </a>
                    </span>
                  </div>
                </motion.label>
              </motion.div>

              {/* Benefits Section */}
              <div
                className={`pt-6 sm:pt-8 border-t border-gray-800 ${isMobile ? "mt-6" : "mt-8 sm:mt-12"
                  }`}
              >
                <h3
                  className={`text-white font-medium font-montserrat ${isMobile
                    ? "text-base mb-4"
                    : "text-lg sm:text-xl mb-4 sm:mb-6"
                    }`}
                >
                  Why connect your wallet?
                </h3>
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <Shield
                      className={`text-green-400 mt-0.5 flex-shrink-0 ${isMobile ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        }`}
                    />
                    <span
                      className={`text-gray-400 font-montserrat leading-relaxed ${isMobile ? "text-sm" : "text-sm sm:text-base"
                        }`}
                    >
                      Trade directly from your wallet - no deposits needed
                    </span>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <CheckCircle2
                      className={`text-green-400 mt-0.5 flex-shrink-0 ${isMobile ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        }`}
                    />
                    <span
                      className={`text-gray-400 font-montserrat leading-relaxed ${isMobile ? "text-sm" : "text-sm sm:text-base"
                        }`}
                    >
                      Real-time balance updates and instant transactions
                    </span>
                  </div>
                  <div className="flex items-start space-x-3 sm:space-x-4">
                    <Wallet
                      className={`text-green-400 mt-0.5 flex-shrink-0 ${isMobile ? "w-5 h-5" : "w-5 h-5 sm:w-6 sm:h-6"
                        }`}
                    />
                    <span
                      className={`text-gray-400 font-montserrat leading-relaxed ${isMobile ? "text-sm" : "text-sm sm:text-base"
                        }`}
                    >
                      Full control of your funds at all times
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <motion.div
                className={`px-4 sm:px-4 flex justify-center rounded-lg ${isMobile ? "mt-8" : "mt-12 sm:mt-12"
                  }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p
                  className={`text-white font-montserrat ${isMobile ? "text-sm" : "text-sm sm:text-base"
                    }`}
                >
                  Having issues ?{" "}
                  <span className="underline text-[#622DBF]"> Connect us</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
