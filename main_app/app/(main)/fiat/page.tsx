"use client";

import SimpleNav from '@/components/simple-nav';
import AuthGuard from '@/components/auth/AuthGuard';
import { useSignOut } from '@coinbase/cdp-hooks';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import React, { Suspense } from 'react';
import Footer from '@/components/footer';
import dynamic from 'next/dynamic';
import QR from '@/components/qr';

// Lazy load the heavy components
const BuySellSection = dynamic(() => import('@/components/buysellSection'), {
  loading: () => (
    <div className="flex justify-center items-center min-h-[400px] bg-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
    </div>
  ),
  ssr: false // Disable SSR for this component since it uses wallet hooks
});

const Orders = dynamic(() => import('@/components/orders'), {
  loading: () => (
    <div className="flex justify-center items-center min-h-[200px] bg-black">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
    </div>
  ),
  ssr: false
});

export default function Dashboard() {
    const { signOut } = useSignOut();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            // Disconnect wallet
            signOut();
            
            // Clear any cached user data
            if (typeof window !== 'undefined') {
                localStorage.removeItem('user-session');
                sessionStorage.clear();
                
                // Clear any other relevant storage keys
                const keysToRemove = Object.keys(localStorage).filter(key => 
                    key.includes('wagmi') || 
                    key.includes('wallet') || 
                    key.includes('user') ||
                    key.includes('auth')
                );
                keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            
            // Navigate to landing page
            router.push('/');
            
            // Force page refresh to clear all state
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (error) {
            console.error('Logout error:', error);
            // Force navigation even if disconnect fails
            router.push('/');
            window.location.reload();
        }
    };

    return (
        <AuthGuard requireAuth={true}>
            <div className="bg-black">
                <div className="flex justify-between items-center p-4">
                    <SimpleNav />
                </div>
                <BuySellSection />
                <QR/>           
                <div className='max-w-7xl mx-auto px-8 py-8'>
                    <Footer />
                </div>
            </div>
        </AuthGuard>
    );
}