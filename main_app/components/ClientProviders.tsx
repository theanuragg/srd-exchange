'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

if (typeof window !== "undefined" && !window.hasOwnProperty("__fetch_patched__")) {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.href;
    } else if (input && typeof input === "object" && "url" in input) {
      url = (input as any).url;
    } else {
      url = String(input);
    }

    if (url.includes("cca-lite.coinbase.com")) {
      const proxiedUrl = url.replace("https://cca-lite.coinbase.com", "/api/proxy/cca-lite");
      console.log("🔄 Rewriting blocked CDP telemetry to proxy:", url, "->", proxiedUrl);
      return originalFetch(proxiedUrl, init);
    }
    return originalFetch.apply(this, arguments as any);
  };
  (window as any).__fetch_patched__ = true;
}

const Providers = dynamic(() => import('./providers'), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
