'use client'

import Image from 'next/image'
import { CircleUser, Wallet } from 'lucide-react'
import { useWalletManager } from '@/hooks/useWalletManager'
import { useState } from 'react'
import { useSidebar } from '@/context/SidebarContext'

export default function SimpleNav() {
  const [bnbEnabled, setBnbEnabled] = useState(false);
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
            width={80}
            height={80}
            className="w-20 h-20 object-contain"
          />
          <span className="text-xl font-bold  tracking-tight hidden md:flex md:flex-row">
            SRD Exchange
          </span>
        </div>

        {/* Right Section - Social Icons and Help */}
        <div className="flex items-center space-x-6">
          {/* BNB Toggle */}
          <button
            onClick={() => setBnbEnabled(!bnbEnabled)}
            className={`w-12 h-8 rounded-2xl flex items-center justify-center border transition
      ${bnbEnabled
                ? "bg-yellow-400/20 border-yellow-400"
                :"bg-yellow-400/20 border-yellow-400"}
    `}
          >
            <Image
              src="/bsc.svg" // place BNB icon in public folder
              alt="BNB"
              width={24}
              height={24}
              className={`w-6 h-6 transition ${bnbEnabled ? "opacity-100" : "opacity-100"
                }`}
            />
          </button>

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
              className="w-5 h-5 shrink-0"
            />
            {address && isSmartAccountReady ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white/80">
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </span>
                {walletData?.balances?.usdt?.formatted && (
                  <span className="text-xs font-medium text-[#622DBF] bg-[#622DBF]/10 px-1.5 py-0.5 rounded">
                    {parseFloat(walletData.balances.usdt.formatted).toFixed(2)} USDT
                  </span>
                )}
              </div>
            ) : (
              <span className="text-sm font-medium text-[#622DBF]">
                Wallet
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  )
}
