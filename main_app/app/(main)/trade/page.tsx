'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import Navigation from '@/components/landing/Navigation';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Cpu } from 'lucide-react';

export default function TradePage() {
    return (
        <AuthGuard requireAuth={true}>
            <div className="bg-black min-h-screen">
                <Navigation />
                <main className="max-w-7xl mx-auto px-4 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                    {/* Upcoming Overlay */}
                    <div className="absolute inset-x-4 inset-y-0 z-50 flex items-center justify-center backdrop-blur-[1px] rounded-[3rem]  shadow-2xl mt-4">
                                                                <motion.div
                                                                    initial={{ scale: 0.9, opacity: 0 }}
                                                                    animate={{ scale: 1, opacity: 1 }}
                                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                                    className="px-10 py-5"
                                                                >
                                                                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic text-white">
                                                                        Upcoming
                                                                    </h2>
                                                                </motion.div>
                                                            </div>

                    <div className="flex flex-col items-center opacity-40 grayscale-[0.5]">
                        <div className="w-full max-w-4xl space-y-8 pt-12">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                        <BarChart3 className="text-[#6320EE] w-8 h-8" />
                                        Trading
                                    </h1>
                                    <p className="text-gray-500 text-sm">Real-time market insights and professional tools</p>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-500 text-xs font-bold uppercase tracking-widest">
                                    <TrendingUp className="w-4 h-4" />
                                    Live Market
                                </div>
                            </div>

                            {/* Decorative Placeholder for Trade View */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Chart Placeholder */}
                                <div className="md:col-span-2 bg-[#111] border border-white/5 rounded-[2.5rem] p-8 h-[400px] flex flex-col justify-end relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-linear-to-t from-[#6320EE]/10 to-transparent opacity-50" />
                                    <div className="relative z-10 flex flex-col gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-[#6320EE] rounded-xl flex items-center justify-center shadow-lg shadow-[#6320EE]/20">
                                                <Cpu className="text-white w-6 h-6" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white tracking-tight">BTC / USDT</h2>
                                                <p className="text-[#00FF5E] text-sm font-medium">+2.45% Today</p>
                                            </div>
                                        </div>
                                        <div className="w-full h-32 flex items-end gap-1 px-4">
                                            {[40, 70, 45, 90, 65, 80, 50, 85, 100, 75, 60, 95, 80, 110, 90, 120].map((h, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${h}%` }}
                                                    transition={{ delay: i * 0.05, duration: 1 }}
                                                    className="flex-1 bg-[#6320EE]/40 rounded-t-sm"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Order Book Placeholder */}
                                <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-6 space-y-6">
                                    <h3 className="text-white font-bold tracking-tight">Order Book</h3>
                                    <div className="space-y-4">
                                        {[...Array(6)].map((_, i) => (
                                            <div key={i} className="flex justify-between items-center group cursor-pointer">
                                                <span className={`text-sm font-medium ${i < 3 ? 'text-red-500/80' : 'text-green-500/80'}`}>
                                                    {i < 3 ? '64,231.40' : '64,228.15'}
                                                </span>
                                                <span className="text-gray-600 text-[10px] font-bold group-hover:text-gray-400">0.024 BTC</span>
                                                <div className={`h-1.5 w-16 rounded-full bg-white/5 overflow-hidden`}>
                                                    <div className={`h-full ${i < 3 ? 'bg-red-500/20' : 'bg-green-500/20'}`} style={{ width: `${Math.random() * 80 + 20}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full bg-[#6320EE] hover:bg-[#5219d1] text-white py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95">
                                        Open Terminal
                                    </button>
                                </div>
                            </div>

                            <div className="pt-12 text-center text-gray-600 text-xs font-medium tracking-wide">
                                RELIABLE TRADING INFRASTRUCTURE • REAL-TIME DATA • ENTERPRISE GRADE SECURITY
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
