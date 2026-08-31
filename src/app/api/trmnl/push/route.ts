import { NextResponse } from "next/server";
import { getTrmnlDashboardData } from "@/lib/trmnl-dashboard";
import { hasTrmnlWebhookUrl, pushTrmnlDashboardData } from "@/lib/trmnl-webhook";

export const runtime = "nodejs";

export async function POST() {
  if (!hasTrmnlWebhookUrl()) {
    return NextResponse.json(
      {
        ok: false,
        error: "TRMNL_WEBHOOK_URL is not configured.",
      },
      { status: 503 },
    );
  }

  try {
    const dashboardData = await getTrmnlDashboardData();
    const result = await pushTrmnlDashboardData(dashboardData);

    return NextResponse.json({
      ok: true,
      pushedAt: result.pushedAt,
      status: result.status,
      prayerCount: dashboardData.prayers.length,
      forecastCount: dashboardData.weather.forecast.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected TRMNL push error";
    console.error(`TRMNL Private Plugin push failed: ${message}`);

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 502 },
    );
  }
}
