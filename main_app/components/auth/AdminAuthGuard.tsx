'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

interface AdminAuthGuardProps {
  children: React.ReactNode
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'authorized' | 'unauthorized'>('checking')

  useEffect(() => {
    fetch('/api/auth/admin-session')
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          setStatus('authorized')
        } else {
          setStatus('unauthorized')
          router.replace('/admin/login')
        }
      })
      .catch(() => {
        setStatus('unauthorized')
        router.replace('/admin/login')
      })
  }, [router])

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 border-4 border-[#622DBF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2 font-montserrat">
            Verifying Admin Access...
          </h2>
          <p className="text-gray-400 font-montserrat text-sm">Please wait</p>
        </motion.div>
      </div>
    )
  }

  if (status === 'unauthorized') {
    // Router is already redirecting — show shield briefly
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Shield className="w-10 h-10 text-white/20 animate-pulse" />
      </div>
    )
  }

  return <>{children}</>
}
