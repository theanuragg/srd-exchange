'use client'

import Image from 'next/image'
import { CircleUser, Wallet } from 'lucide-react'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useState } from 'react'
import { useSidebar } from '@/context/SidebarContext'

export default function SimpleNav() {

  const { openSidebar } = useSidebar();

  const {
    address,
    walletData,
    isSmartAccountReady,
  } = useWalletManager();

  return (
    <nav className="w-full bg-black border-b border-gray-800 text-white px-3 py-2">
      <div className="flex items-center justify-between w-full">
        {/* Logo Section - Left */}
        <div className="flex items-center space-x-2">
          <Image
            src="/image.png"
            alt="SRD Exchange Logo"
            width={48}
            height={48}
            className="w-12 h-12 object-contain"
          />
          <span className="text-xl font-bold  tracking-tight hidden md:flex md:flex-row">
            SRD Exchange
          </span>
        </div>

        {/* Right Section - Social Icons and Help */}
        <div className="flex items-center space-x-6">


          {/* User Section - Clickable to open Sidebar */}
          <button
            onClick={openSidebar}
            className="flex items-center gap-3 px-3 py-1.5 border border-[#622DBF] rounded-lg bg-[#622DBF]/5 hover:bg-[#622DBF]/15 transition-all group"
          >
            <Image
              src="/wallett.svg"
              alt="Wallet"
              width={20}
              height={20}
              className="w-5 h-5 shrink-0 brightness-0 invert"
            />
            {address && isSmartAccountReady ? (
              <div className="flex items-center gap-2">
                <span className="text-md font-mono text-white">
                  wallet
                </span>
              </div>
            ) : (
              <span className="text-sm font-medium text-white">
                Wallet
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
