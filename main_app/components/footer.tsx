"use client"

import { Headset } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function Footer() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleTelegramClick = () => {
    window.open('https://telegram.me/SrdExchangeGlobal', '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.footer 
      className="bg-black text-white border-gray-800"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      <div className="max-w-7xl mx-auto px-8 mb-10 py-8 bg-[#0C0C0C] rounded-xl">
        
        {/* Mobile Layout - Center Aligned */}
        <div className="block md:hidden">
          <div className="flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Logo - Large Size */}
            <motion.div 
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <motion.img 
                src="/srd_final.svg" 
                alt="SRD Exchange Logo" 
                className="w-20 h-20"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>

            {/* Telegram Button */}
            <motion.button 
              onClick={handleTelegramClick}
              className="text-white border border-[#622DBF] px-6 py-3 rounded-md transition-colors duration-200 flex items-center gap-3 text-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src="/telegram.svg" 
                alt="" 
                className="w-5 h-5"
              />
              <span>Telegram community</span>
            </motion.button>

            {/* 24x7 Support Text */}
            <motion.div 
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true }}
            >
              <Headset className="w-4 h-4"/>
              <span className="text-gray-400 text-sm">24 x 7 Support</span>
            </motion.div>

            {/* Copyright Text */}
            <motion.div 
              className="text-gray-400 text-sm"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              viewport={{ once: true }}
            >
              Copyright 2026 @ SRD Exchange
            </motion.div>

          </div>
        </div>

        {/* Desktop Layout - Original */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left side - Logo */}
          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <motion.img 
              src="/srd_final.svg" 
              alt="SRD Exchange Logo" 
              className="w-32 h-32"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>

          {/* Right side - Support and Telegram */}
          <motion.div 
            className="flex flex-col items-start gap-3"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            viewport={{ once: true }}
          >
            <motion.button 
              onClick={handleTelegramClick}
              className="text-white border border-[#622DBF] px-6 py-2 rounded-md transition-colors duration-200 flex items-center gap-2"
              whileHover={{ scale: 1.05, borderColor: "#8b5cf6" }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <motion.img 
                src="/telegram.svg" 
                alt="" 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              />
              Telegram community
            </motion.button>

            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.2 }}
              >
                <Headset className="w-4 h-4"/>
              </motion.div>
              <span className="text-gray-400 text-sm">24 x 7 Support</span>
            </motion.div>

            <motion.div 
              className="text-gray-400 text-sm"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              viewport={{ once: true }}
            >
              Copyright 2026 @ SRD Exchange
            </motion.div>

          </motion.div>
        </div>

      </div>
    </motion.footer>
  )
}