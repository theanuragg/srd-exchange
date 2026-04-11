'use client';

import AuthGuard from '@/components/auth/AuthGuard';
import SimpleNav from '@/components/simple-nav';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Settings } from 'lucide-react';

export default function SwapPage() {
    return (
        <AuthGuard requireAuth={true}>
            <div className="bg-black min-h-screen">
                <SimpleNav />
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
                        <div className="w-full max-w-[480px] space-y-4 pt-12">
                            <div className="flex items-center justify-between px-2">
                                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <ArrowLeftRight className="text-[#6320EE]" />
                                    Swap
                                </h1>
                                <button className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-colors">
                                    <Settings className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Decorative Placeholder for Swap UI */}
                            <div className="bg-[#111] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#6320EE]/10 blur-[60px] rounded-full" />

                                <div className="space-y-2">
                                    <label className="text-gray-500 text-sm font-medium ml-2">You Pay</label>
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between hover:border-white/20 transition-all">
                                        <input
                                            type="number"
                                            placeholder="0.0"
                                            className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder:text-gray-700"
                                        />
                                        <div className="bg-[#6320EE] px-4 py-2 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-[#5219d1] transition-colors shadow-lg">
                                            <span className="font-bold text-white">USDT</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center -my-6 relative z-10">
                                    <button className="bg-black border border-white/10 p-3 rounded-2xl hover:bg-white/5 transition-all hover:scale-110 active:scale-95 shadow-xl">
                                        <ArrowLeftRight className="w-5 h-5 text-[#6320EE] rotate-90" />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-gray-500 text-sm font-medium ml-2">You Get</label>
                                    <div className="bg-white/5 border border-white/10 p-5 rounded-3xl flex items-center justify-between hover:border-white/20 transition-all">
                                        <input
                                            type="number"
                                            placeholder="0.0"
                                            className="bg-transparent text-3xl font-bold text-white outline-none w-full placeholder:text-gray-700"
                                            readOnly
                                        />
                                        <div className="bg-white/10 px-4 py-2 rounded-2xl flex items-center gap-2 cursor-pointer hover:bg-white/20 transition-colors">
                                            <span className="font-bold text-white">Select</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full bg-[#6320EE] hover:bg-[#5219d1] text-white py-5 rounded-3xl font-bold text-xl transition-all active:scale-[0.98] shadow-[0_8px_30px_rgb(99,32,238,0.3)]">
                                    Connect Wallet
                                </button>
                            </div>

                            <div className="flex justify-center pt-8">
                                <p className="text-gray-500 text-xs text-center max-w-[300px]">
                                    Experience lightning fast swaps with zero slippage on our premium liquidity pools.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </AuthGuard>
    );
}
