"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useIsSignedIn } from '@coinbase/cdp-hooks';
import { SignInModal, SignInModalContent } from '@coinbase/cdp-react';

export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { isSignedIn } = useIsSignedIn();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isSignedIn) {
      router.push('/fiat');
    }
  }, [isSignedIn, router]);

  const handleTradeNow = () => {
    if (isSignedIn) {
      router.push('/fiat');
    } else {
      setWalletModalOpen(true);
    }
  };

  const iconVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 260,
        damping: 20
      }
    }
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Two Purple Background Elements - One left, one right */}
      <motion.div
        className="absolute top-1/2 left-5/12 transform -translate-y-1/2 -translate-x-102 w-148 h-148 bg-purple-600/20 rounded-full blur-3xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-5/12 transform -translate-y-1/2 translate-x-0 w-148 h-148 bg-purple-700/30 rounded-full blur-3xl"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, delay: 0.3, ease: "easeOut" }}
      />

      <div className="relative z-10 flex flex-col items-center min-h-screen px-8 py-4">
        <motion.div
          className="text-center max-w-4xl mx-auto mb-6"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.h1
            className="text-3xl md:text-4xl lg:text-6xl font-bold leading-tight"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Unlock India's Easiest
          </motion.h1>
          <motion.div
            className="text-3xl md:text-5xl lg:text-6xl font-bold leading-tight"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <motion.span
              className="text-[#187C58]"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              USDT
            </motion.span>
            <span className="text-white"> - </span>
            <motion.span
              className="text-lime-400"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              INR
            </motion.span>
            <span className="text-white"> Trading.</span>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="pt-2 text-md md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
          >
            Trade USDT easily in India. Use UPI and Cash Deposit

            with our secure P2P platform.
          </motion.p>
        </motion.div>

        {/* Icons and Central SVG Container */}
        <div className="relative w-full max-w-3xl mx-auto mb-12">
          {/* Top Left Icon */}
          <motion.div
            className="absolute top-8 left-20 md:w-16 md:h-16 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 1.2 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <motion.img
              src="/meta-mask.svg"
              alt="meta-mask"
              animate={floatingAnimation}
            />
          </motion.div>

          {/* Top Right Icon */}
          <motion.div
            className="absolute top-8 right-20 md:w-16 md:h-16 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 1.4 }}
            whileHover={{ scale: 1.1, rotate: -5 }}
          >
            <motion.img
              src="/google.svg"
              alt=""
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 0.5 }
              }}
            />
          </motion.div>

          {/* Middle Left Icon */}
          <motion.div
            className="absolute top-1/2 md:left-8 transform -translate-y-1/2 md:w-16 md:h-16 h-8 w-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 1.6 }}
            whileHover={{ scale: 1.1, rotate: 10 }}
          >
            <motion.img
              src="/wallet.svg"
              alt=""
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 1 }
              }}
            />
          </motion.div>

          {/* Middle Right Icon */}
          <motion.div
            className="absolute top-1/2 right-8 transform -translate-y-1/2 md:w-16 md:h-16 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 1.8 }}
            whileHover={{ scale: 1.1, rotate: -10 }}
          >
            <motion.img
              src="/bank.svg"
              alt=""
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 1.5 }
              }}
            />
          </motion.div>

          {/* Bottom Left Icon */}
          <motion.div
            className="absolute bottom-8 left-20 md:w-16 md:h-16 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 2 }}
            whileHover={{ scale: 1.1, rotate: 15 }}
          >
            <motion.img
              src="/bsc-wallet.svg"
              alt=""
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 2 }
              }}
            />
          </motion.div>

          {/* Bottom Right Icon */}
          <motion.div
            className="absolute bottom-8 right-20 md:w-16 md:h-16 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
            variants={iconVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 2.2 }}
            whileHover={{ scale: 1.1, rotate: -15 }}
          >
            <motion.img
              src="/phone-pay.svg"
              alt=""
              animate={{
                ...floatingAnimation,
                transition: { ...floatingAnimation.transition, delay: 2.5 }
              }}
            />
          </motion.div>

          {/* Center Image */}
          <motion.div
            className="flex justify-center items-center h-96"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
          >
            <motion.div
              className="md:w-96 md:h-96 h-64 w-64 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <motion.img
                src="/hero-landing.svg"
                alt=""
                className="w-full h-full object-contain"
                animate={{
                  y: [-5, 5, -5],
                  rotate: [-2, 2, -2]
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Updated Trade Now Button */}
        <SignInModal open={walletModalOpen} setIsOpen={setWalletModalOpen}>
          <motion.button
            onClick={handleTradeNow}
            className="bg-[#622DBF] text-white md:text-xl text-lg font-semibold md:px-12 md:py-4 px-6 py-2 rounded-sm transition-all duration-200 flex items-center space-x-3 shadow-xl hover:shadow-purple-500/25 transform hover:scale-105"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 2.4 }}
            whileHover={{
              scale: 1.05,
              boxShadow: "0 20px 40px rgba(98, 45, 191, 0.4)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Trade Now !</span>
            <motion.svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <path
                d="M7 7H17V17"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 17L17 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.button>
          <SignInModalContent />
        </SignInModal>
      </div>
    </div>
  );
}
