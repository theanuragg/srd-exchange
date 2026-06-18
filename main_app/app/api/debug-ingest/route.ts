import { NextRequest, NextResponse } from "next/server";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const LOG_PATH = join(process.cwd(), ".cursor", "debug-247484.log");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    mkdirSync(dirname(LOG_PATH), { recursive: true });
    const line = `${JSON.stringify({ ...body, timestamp: body.timestamp ?? Date.now() })}\n`;
    appendFileSync(LOG_PATH, line, "utf8");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
