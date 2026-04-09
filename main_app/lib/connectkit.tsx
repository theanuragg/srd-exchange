'use client';

import './particlePolyfills';
import { ConnectKitProvider, createConfig } from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import {
  bsc,
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  avalanche,
  scroll,
  cronos,
  solana,
} from '@particle-network/connectkit/chains';
import { wallet, EntryPosition } from '@particle-network/connectkit/wallet';
import React from 'react';
import { particleAuth } from '@particle-network/auth-core';
import { aa } from "@particle-network/connectkit/aa";
// Retrieve environment variables
let projectId = process.env.NEXT_PUBLIC_PROJECT_ID as string;
let clientKey = process.env.NEXT_PUBLIC_CLIENT_KEY as string;
let appId = process.env.NEXT_PUBLIC_APP_ID as string;



// Validate environment variables
if (!projectId || !clientKey || !appId) {
  console.warn(' Particle Network configuration missing!');
  console.warn('Please set the following environment variables in .env.local:');
  console.warn('- NEXT_PUBLIC_PROJECT_ID');
  console.warn('- NEXT_PUBLIC_CLIENT_KEY');
  console.warn('- NEXT_PUBLIC_APP_ID');
  console.warn('Get these values from: https://flat.particle.network');
  console.warn('Using fallback configuration for development...');

  // Fallback values for development
  projectId = process.env.NEXT_PUBLIC_PROJECT_ID as string;
  clientKey = process.env.NEXT_PUBLIC_CLIENT_KEY as string;
  appId = process.env.NEXT_PUBLIC_APP_ID as string;
}

// IMPORTANT: Create config outside component to prevent re-initialization
let authCoreInitialized = false;

function ensureAuthCoreInitialized() {
  if (authCoreInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    // AuthCore powers social/email login and its storage helper must be
    // initialized before ConnectKit touches it. Without this, calls like
    // getLatestAuthType throw "please init AuthCore first!"
    particleAuth.init({
      projectId,
      clientKey,
      appId,
    });
    authCoreInitialized = true;
  } catch (error) {
    console.error('AuthCore failed to initialize', error);
  }

}




// Configure BSC with more reliable RPCs
const bscWithCustomRPC = {
  ...bsc,
  rpcUrls: {
    ...bsc.rpcUrls,
    default: {
      http: [
        'https://binance.llamarpc.com',
        'https://bsc-dataseed.binance.org',
        'https://rpc.ankr.com/bsc',
        'https://1binance.publicnode.com',
      ],
    },
    public: {
      http: [
        'https://binance.llamarpc.com',
        'https://bsc-dataseed.binance.org',
        'https://rpc.ankr.com/bsc',
        'https://1binance.publicnode.com',
      ],
    },
  },
};

const config = createConfig({
  projectId,
  clientKey,
  appId,
  chains: [
    bscWithCustomRPC,
    mainnet,
    base,
    arbitrum,
    optimism,
    polygon,
    avalanche,
    scroll,
    cronos,
    solana,
  ],
  appearance: {
    splitEmailAndPhone: false,
    collapseWalletList: false,
    connectorsOrder: ['email', 'phone', 'social'],
    language: 'en-US',
    mode: 'dark',
    theme: {
      '--pcm-accent-color': '#622DBF',
      '--pcm-body-background': '#000000',
      '--pcm-body-background-secondary': '#000000',
      '--pcm-body-background-tertiary': '#000000',
      '--pcm-overlay-background': 'rgba(0, 0, 0, 0.6)',
      '--pcm-overlay-backdrop-filter': 'blur(8px)',
      '--pcm-modal-box-shadow': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    logo: '/srd.jpg',
  },

  walletConnectors: [
    authWalletConnectors({
      // Social/email/phone login providers shown in the ConnectKit modal
      authTypes: [
        'email',
        'phone',
        'google',
        'facebook',
        'linkedin',
        'twitter',
      ],
      fiatCoin: 'USD',
      promptSettingConfig: {
        promptMasterPasswordSettingWhenLogin: 1,
        promptPaymentPasswordSettingWhenSign: 1,
      },
    }),
  ],
  plugins: [
    wallet({
      entryPosition: EntryPosition.BR,
      visible: false,
    }),
    aa({
      name: "BICONOMY",
      version: "2.0.0",
    }),

  ]

});

// Use a singleton pattern to prevent multiple initializations
let isInitialized = false;

export const ParticleConnectkit = ({ children }: React.PropsWithChildren) => {
  // Ensure AuthCore is ready on first render (needed before ConnectKit hooks run)
  ensureAuthCoreInitialized();

  // Prevent multiple initializations in development mode
  React.useEffect(() => {
    if (isInitialized) {
      console.warn('ParticleConnectkit already initialized');
    }
    isInitialized = true;

    return () => {
      // Don't reset on cleanup in production
      if (process.env.NODE_ENV === 'development') {
        isInitialized = false;
      }
    };
  }, []);

  try {
    return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
  } catch (error) {
    console.error('Failed to initialize Particle Connect:', error);
    console.warn('Falling back to basic provider without wallet integration...');
    return <div>{children}</div>;
  }
};

export { config };