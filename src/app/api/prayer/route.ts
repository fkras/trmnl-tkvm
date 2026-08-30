import { NextResponse } from "next/server";
import { getPrayerForToday } from "@/lib/prayer";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getPrayerForToday();
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
