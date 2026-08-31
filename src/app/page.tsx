import App from "@/components/takvimi/App";
import { getPrayerForToday } from "@/lib/prayer";
import { buildPrayerSchedule } from "@/lib/takvimi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data } = await getPrayerForToday();
  const schedule = buildPrayerSchedule(data);

  return (
    <App
      prayers={schedule.prayers}
      dateLabel={schedule.dateLabel}
      hijriLabel={schedule.hijriLabel}
      currentPrayerIndex={schedule.nextPrayerIndex}
    />
  );
}
