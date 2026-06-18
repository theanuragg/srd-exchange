import { NextRequest, NextResponse } from "next/server";

const CDP_BASE = "https://cca-lite.coinbase.com";

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname.replace("/api/proxy/cca-lite", "");
  const targetUrl = `${CDP_BASE}${path}${request.nextUrl.search}`;

  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (["host", "origin", "referer"].includes(lower)) return;
    headers[lower] = value;
  });

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: {
      ...headers,
      "host": "cca-lite.coinbase.com",
    },
    body: body || undefined,
  });

  const responseBody = await response.text();
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (["content-encoding", "transfer-encoding", "connection"].includes(lower)) return;
    responseHeaders[lower] = value;
  });

  return new NextResponse(responseBody, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
