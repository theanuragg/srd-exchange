'use client'
import { useState } from 'react'
import Navbar from '@/components/navbar'
import LandingPage from '@/components/landingPage'
import FeatureBento from '@/components/feature-bento'
import FAQ from '@/components/faq'
import Footer from '@/components/footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-20"> 
        <section id="home">
          <LandingPage />
        </section>
        <section id="features">
          <FeatureBento/>
        </section>
        <section id="faq">
          <FAQ/>
        </section>
        <div className='max-w-7xl mx-auto px-8 py-8 '>
          <Footer />
        </div>
      </div>
    </div>
  )
}
