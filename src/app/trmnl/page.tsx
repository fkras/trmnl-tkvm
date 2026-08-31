import TrmnlDashboard from "@/components/trmnl/TrmnlDashboard";
import { getPrayerForToday } from "@/lib/prayer";
import { buildPrayerSchedule } from "@/lib/takvimi";
import { getWeatherData } from "@/lib/weather";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TrmnlPage() {
  const now = new Date();
  const [{ data: prayerData }, weather] = await Promise.all([
    getPrayerForToday(),
    getWeatherData().catch((error) => {
      const message = error instanceof Error ? error.message : "Unexpected weather error";
      console.warn(`Unable to load TRMNL weather: ${message}`);
      return null;
    }),
  ]);
  const schedule = buildPrayerSchedule(prayerData, now);

  return <TrmnlDashboard schedule={schedule} weather={weather} updatedAt={now} />;
}
