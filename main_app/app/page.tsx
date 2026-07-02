'use client'
import { useState, useEffect } from 'react';
import { ArrowUp } from "lucide-react";
import StarField from '@/components/landing/StarField';
import Navigation from '@/components/landing/Navigation';
import HomeFooter from '@/components/landing/HomeFooter';
import CustomCursor from '@/components/landing/CustomCursor';
import useScrollReveal from '@/components/landing/hooks/use-scroll-reveal';
import HeroSection from '@/components/landing/sections/HeroSection';
import MoreThanExchange from '@/components/landing/sections/MoreThanExchange';
import MultiChooseApi from '@/components/landing/sections/MultiChooseApi';
import WhatWeSolve from '@/components/landing/sections/WhatWeSolve';
import SwapSection from '@/components/landing/sections/SwapSection';
import FiatOnboarding from '@/components/landing/sections/FiatOnboarding';
import FiatSolve from '@/components/landing/sections/FiatSolve';
import SocialKyc from '@/components/landing/sections/SocialKyc';

function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center w-11 h-11 rounded-full border border-purple/40 bg-dark-card/85 backdrop-blur-md text-white shadow-glow-purple transition-all duration-300 hover:bg-purple hover:border-purple hover:scale-110 hover:shadow-glow-purple-intense focus:outline-none focus:ring-2 focus:ring-purple/50 ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-3 pointer-events-none"
      }`}
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}

export default function Home() {
  useScrollReveal();
  return (
    <div className="relative min-h-screen bg-black text-white scanlines overflow-x-hidden landing-no-scrollbar">
      <CustomCursor />
      <StarField />
      <Navigation />
      <main className="relative">
        <div className="reveal-on-scroll"><HeroSection /></div>
        <div className="reveal-on-scroll"><MoreThanExchange /></div>
        <div className="reveal-on-scroll"><MultiChooseApi /></div>
        <div className="reveal-on-scroll"><WhatWeSolve /></div>
        <div className="reveal-on-scroll"><SwapSection /></div>
        <div className="reveal-on-scroll"><FiatOnboarding /></div>
        <div className="reveal-on-scroll"><FiatSolve /></div>
        <div className="reveal-on-scroll"><SocialKyc /></div>
        <HomeFooter />
      </main>
      <ScrollToTop />
    </div>
  );
}
