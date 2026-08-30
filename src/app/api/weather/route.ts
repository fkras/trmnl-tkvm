import { NextResponse } from "next/server";
import { getWeatherData } from "@/lib/weather";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await getWeatherData();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected weather API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
