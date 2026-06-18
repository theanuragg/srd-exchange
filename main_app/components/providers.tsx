'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CDPReactProvider,
} from '@coinbase/cdp-react';
import FontProvider from './FontProvider';
import { ReactNode } from 'react';
import { SidebarProvider } from '@/context/SidebarContext';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <CDPReactProvider
      config={{
        projectId: process.env.NEXT_PUBLIC_CDP_PROJECT_ID!,
        appName: 'SRD Exchange',
        ethereum: { createOnLogin: "smart" },
        authMethods: ["sms", "oauth:google", "oauth:telegram", "oauth:apple", "oauth:x"],
      }}
      theme={{
        "colors-bg-default": "#111111",
        "colors-bg-alternate": "#1a1a1a",
        "colors-bg-overlay": "rgba(0, 0, 0, 0.7)",
        "colors-bg-primary": "#622DBF",
        "colors-fg-default": "#ffffff",
        "colors-fg-muted": "#9ca3af",
        "colors-fg-primary": "#8B5CF6",
        "colors-fg-onPrimary": "#ffffff",
        "colors-line-default": "#374151",
        "colors-line-heavy": "#4b5563",
        "colors-line-primary": "#8B5CF6",
        "colors-cta-primary-bg-default": "#622DBF",
        "colors-cta-primary-bg-hover": "#7c3aed",
        "colors-cta-primary-bg-pressed": "#5219d1",
        "colors-cta-primary-text-default": "#ffffff",
        "colors-cta-primary-text-hover": "#ffffff",
        "colors-cta-secondary-bg-default": "#1f2937",
        "colors-cta-secondary-text-default": "#ffffff",
        "colors-input-bg-default": "#1a1a1a",
        "colors-input-border-default": "#374151",
        "colors-input-border-focus": "#622DBF",
        "colors-input-text-default": "#ffffff",
        "colors-input-placeholder-default": "#6b7280",
        "colors-input-label-default": "#d1d5db",
        "colors-select-trigger-bg-default": "#1a1a1a",
        "colors-select-trigger-text-default": "#ffffff",
        "colors-select-trigger-border-default": "#374151",
        "colors-select-list-bg-default": "#111111",
        "colors-select-list-border-default": "#374151",
        "colors-select-list-item-bg-default": "#1a1a1a",
        "colors-select-list-item-bg-highlight": "#2d2d2d",
        "colors-select-list-item-text-default": "#ffffff",
        "colors-code-bg-default": "#1a1a1a",
        "colors-code-border-default": "#374151",
        "colors-code-text-default": "#ffffff",
        "colors-bg-skeleton": "rgba(255, 255, 255, 0.1)",
        "colors-bg-primaryWash": "rgba(98, 45, 191, 0.15)",
        "colors-bg-positiveWash": "rgba(16, 185, 129, 0.15)",
        "colors-bg-negativeWash": "rgba(239, 68, 68, 0.15)",
        "colors-bg-warningWash": "rgba(245, 158, 11, 0.15)",
        "colors-fg-positive": "#10b981",
        "colors-fg-negative": "#ef4444",
        "colors-fg-warning": "#f59e0b",
        "colors-fg-onPositiveWash": "#ffffff",
        "colors-fg-onNegativeWash": "#ffffff",
        "colors-fg-onWarningWash": "#ffffff",
        "colors-line-positive": "#10b981",
        "colors-line-negative": "#ef4444",
        "colors-page-bg-default": "#000000",
        "colors-page-border-default": "#374151",
        "colors-page-text-default": "#ffffff",
        "colors-page-text-muted": "#9ca3af",
      }}
    >
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <FontProvider />
          <div className="font-montserrat">
            {children}
          </div>
        </SidebarProvider>
      </QueryClientProvider>
    </CDPReactProvider>
  );
}
