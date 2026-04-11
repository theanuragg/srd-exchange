import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import Providers from '@/components/providers'
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Srd Exchange - Decentralized P2P Platform on Bsc Chain",
  description: "Secure peer-to-peer USDT trading platform on Binance Smart Chain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} font-montserrat bg-black antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
