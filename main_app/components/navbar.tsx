"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useIsSignedIn, useSignOut } from '@coinbase/cdp-hooks';
import { SignInModal, SignInModalContent } from '@coinbase/cdp-react';
import { useWalletManager } from '@/hooks/useWalletManager';
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const { isSignedIn } = useIsSignedIn();
  const { address } = useWalletManager();
  const { signOut } = useSignOut();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80;
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const handleConnectWallet = () => {
    if (!isSignedIn) {
      const hasAcceptedTerms = localStorage.getItem('terms_accepted_global');
      
      if (!hasAcceptedTerms) {
        setShowTermsModal(true);
      } else {
        setWalletModalOpen(true);
      }
    }
  };

  const handleAcceptTerms = () => {
    localStorage.setItem('terms_accepted_global', 'true');
    setShowTermsModal(false);
    setWalletModalOpen(true);
  };

  const handleDisconnect = () => {
    signOut();
    setShowUserMenu(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const navLinks = [
    { name: "Future Tradings", type: "route", path: "/future-tradings" },
    { name: "FAQ", type: "scroll", id: "faq" },
    { name: "Contact us", type: "scroll", id: "contact" }
  ];

  const handleNavClick = (link: { name: string; type: string; path?: string; id?: string }) => {
    if (link.type === "route" && link.path) {
      router.push(link.path);
    } else if (link.type === "scroll") {
      if (link.name === "Contact us") {
        const footer = document.querySelector('footer');
        if (footer) {
          footer.scrollIntoView({ behavior: 'smooth' });
        }
      } else if (link.id) {
        scrollToSection(link.id);
      }
    }

    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      <motion.nav
        className="w-full bg-black text-white px-4 sm:px-8 py-2 border-b border-gray-800 z-40 font-montserrat relative top-0 left-0 right-0"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between w-full">
          <motion.div
            className="flex items-center space-x-2 cursor-pointer"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => {
              if (window.location.pathname === '/') {
                scrollToSection('home');
              } else {
                router.push('/');
              }
            }}
          >
            <div>
              <Image
                src="/srd_final.svg"
                alt="SRD Exchange Logo"
                width={44}
                height={44}
                className="w-20 h-20 sm:w-20 sm:h-20 object-contain"
              />
            </div>
            <motion.span
              className="pt-4 text-lg sm:text-2xl font-bold tracking-tight font-montserrat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              SRD Exchange
            </motion.span>
          </motion.div>

          <motion.div
            className="hidden lg:flex items-center space-x-6"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center space-x-8">
              {navLinks.map((link, index) => (
                <motion.button
                  key={link.name}
                  onClick={() => handleNavClick(link)}
                  className="text-base font-medium text-gray-300 hover:text-white transition-colors duration-200 relative group font-montserrat cursor-pointer"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  whileHover={{ y: -2 }}
                >
                  {link.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-200 group-hover:w-full"></span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="flex lg:hidden items-center space-x-3"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <a
                href="https://x.com/SrdExchange"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center transition-all duration-200"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://telegram.me/SrdExchangeGlobal"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              >
                <img src="/telegram.svg" alt="" className="w-5 h-5" />
              </a>
            </div>

            <button
              onClick={toggleMobileMenu}
              className="text-white p-2 hover:bg-gray-800 rounded-lg transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </motion.div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              className="fixed top-0 right-0 h-full w-80 bg-black border-l border-gray-800 z-50 lg:hidden font-montserrat"
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                  <h2 className="text-xl font-bold text-white font-montserrat">
                    Menu
                  </h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 p-6">
                  <nav className="space-y-4">
                    {navLinks.map((link, index) => (
                      <motion.button
                        key={link.name}
                        onClick={() => handleNavClick(link)}
                        className="block w-full text-left text-lg font-montserrat font-medium text-gray-300 hover:text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors duration-200"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        {link.name}
                      </motion.button>
                    ))}
                  </nav>
                </div>

                <div className="p-6 border-t border-gray-800">
                    <motion.button
                      onClick={() => {
                        handleConnectWallet();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-[#622DBF] text-white px-6 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg font-montserrat"
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <span className="text-base tracking-wide font-montserrat">
                        CONNECT WALLET
                      </span>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sign In Modal (controlled) */}
      <SignInModal open={walletModalOpen} setIsOpen={setWalletModalOpen}>
        <span />
        <SignInModalContent />
      </SignInModal>

      {/* Terms Agreement Modal */}
      <AnimatePresence>
        {showTermsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTermsModal(false)}
            />

            {/* Modal Card */}
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-[#1A1A1A] border border-gray-700 rounded-xl shadow-2xl max-w-md w-full p-6 pointer-events-auto font-montserrat"
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Icon */}
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-purple-600/20 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-3">
                  Terms & Conditions
                </h2>

                {/* Message */}
                <p className="text-gray-300 text-center mb-6 leading-relaxed">
                  By connecting your wallet, you are agreeing to our{' '}
                  <button
                    onClick={() => {
                      setShowTermsModal(false);
                      router.push('/terms-and-conditions');
                    }}
                    className="text-purple-400 hover:text-purple-300 underline font-medium"
                  >
                    Terms and Conditions
                  </button>
                  .
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowTermsModal(false)}
                    className="flex-1 px-6 py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAcceptTerms}
                    className="flex-1 px-6 py-3 rounded-lg bg-[#622DBF] hover:bg-purple-700 text-white transition-colors font-bold shadow-lg hover:shadow-purple-600/40"
                  >
                    Accept & Connect
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
