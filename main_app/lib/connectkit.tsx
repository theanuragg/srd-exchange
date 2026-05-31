'use client';

import './particlePolyfills';
import {
  ConnectKitProvider,
  createConfig,
} from '@particle-network/connectkit';
import { authWalletConnectors } from '@particle-network/connectkit/auth';
import {
  bsc,
  mainnet,
  base,
  arbitrum,
  optimism,
  polygon,
  avalanche,
  solana,
} from '@particle-network/connectkit/chains';
import { wallet, EntryPosition } from '@particle-network/connectkit/wallet';
import React from 'react';
import { particleAuth } from '@particle-network/auth-core';
import { aa } from '@particle-network/connectkit/aa';

type ParticleEnv = {
  projectId: string;
  clientKey: string;
  appId: string;
};

function getParticleEnv(): ParticleEnv | null {
  const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  const clientKey = process.env.NEXT_PUBLIC_CLIENT_KEY;
  const appId = process.env.NEXT_PUBLIC_APP_ID;

  if (!projectId || !clientKey || !appId) {
    return null;
  }

  return { projectId, clientKey, appId };
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

type ParticleConfig = ReturnType<typeof createConfig>;

function buildConfig(env: ParticleEnv): ParticleConfig {
  return createConfig({
    projectId: env.projectId,
    clientKey: env.clientKey,
    appId: env.appId,
    chains: [
      bscWithCustomRPC,
      mainnet,
      base,
      arbitrum,
      optimism,
      polygon,
      avalanche,
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
        '--pcm-modal-box-shadow':
          '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      logo: '/srd.jpg',
    },
    walletConnectors: [
      authWalletConnectors({
        authTypes: ['email', 'phone', 'google', 'facebook', 'linkedin', 'twitter'],
        fiatCoin: 'USD',
        promptSettingConfig: {
          promptMasterPasswordSettingWhenLogin: 0,
          promptPaymentPasswordSettingWhenSign: 0,
        },
      }),
    ],
    plugins: [
      wallet({
        entryPosition: EntryPosition.BR,
        visible: false,
      }),
      aa({
        name: 'BICONOMY',
        version: '2.0.0',
      }),
    ],
  });
}

let authCoreInitialized = false;

function ensureAuthCoreInitialized(env: ParticleEnv) {
  if (authCoreInitialized || typeof window === 'undefined') {
    return;
  }

  particleAuth.init({
    projectId: env.projectId,
    clientKey: env.clientKey,
    appId: env.appId,
  });
  authCoreInitialized = true;
}

function ProviderFallback({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6 text-center">
      <div className="max-w-lg space-y-3">
        <h1 className="text-2xl font-semibold">Wallet services unavailable</h1>
        <p className="text-sm text-gray-300">{reason}</p>
      </div>
    </div>
  );
}

export const ParticleConnectkit = ({ children }: React.PropsWithChildren) => {
  const [config, setConfig] = React.useState<ParticleConfig | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const env = getParticleEnv();

    if (!env) {
      setError(
        'Missing Vercel public env vars: NEXT_PUBLIC_PROJECT_ID, NEXT_PUBLIC_CLIENT_KEY, NEXT_PUBLIC_APP_ID.',
      );
      return;
    }

    try {
      ensureAuthCoreInitialized(env);
      setConfig(buildConfig(env));
    } catch (err) {
      console.error('Failed to initialize Particle Connect:', err);
      setError('Particle wallet initialization failed.');
    }
  }, []);

  if (error) {
    return <ProviderFallback reason={error} />;
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-black" aria-busy="true" />
    );
  }

  return <ConnectKitProvider config={config}>{children}</ConnectKitProvider>;
};
