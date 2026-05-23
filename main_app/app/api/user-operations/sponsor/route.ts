import { NextRequest, NextResponse } from "next/server";

import { BNB_CHAIN_ID, attachSponsoredPaymasterData } from "@/lib/server/alchemyPaymaster";
import { UserOperation } from "@/lib/userOperation";

const ENTRY_POINT_V06 = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789".toLowerCase();

function getEntryPointVersion(entryPoint: string): "0.6" | "0.7" {
  if (entryPoint.toLowerCase() === ENTRY_POINT_V06) {
    return "0.6";
  }
  return "0.7";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      chainId?: number;
      userOperation?: UserOperation;
    };

    if (body.chainId !== undefined && body.chainId !== BNB_CHAIN_ID) {
      return NextResponse.json(
        { success: false, error: `Gas sponsorship is only enabled on BNB Chain (${BNB_CHAIN_ID}).` },
        { status: 400 }
      );
    }

    if (!body.userOperation) {
      return NextResponse.json(
        { success: false, error: "Missing userOperation payload." },
        { status: 400 }
      );
    }

    const sponsoredUserOperation = await attachSponsoredPaymasterData(body.userOperation);
    const entryPoint = process.env.ENTRY_POINT;

    if (!entryPoint) {
      throw new Error("Missing required server environment variable: ENTRY_POINT");
    }

    return NextResponse.json({
      success: true,
      userOperation: sponsoredUserOperation,
      entryPoint,
      entryPointVersion: getEntryPointVersion(entryPoint),
    });
  } catch (error) {
    console.error("Failed to sponsor user operation:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sponsor user operation",
      },
      { status: 500 }
    );
  }
}
