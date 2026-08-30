import App from "@/components/takvimi/App";
import type { Prayer } from "@/components/takvimi/types";
import { getPrayerForToday } from "@/lib/prayer";

export const dynamic = "force-dynamic";

function minutesToDuration(value: number): string {
  if (value <= 0) return "00:00";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export default async function Home() {
  const { data } = await getPrayerForToday();

  const prayers: Prayer[] = [
    { name: "Imsaku", time: data.imsaku },
    { name: "Lindja e diellit", time: data.lindja },
    { name: "Dreka", time: data.dreka },
    { name: "Ikindia", time: data.ikindia },
    { name: "Akshami", time: data.akshami },
    { name: "Jacia", time: data.jacia },
    { name: "Gjatësia e ditës", time: minutesToDuration(data.gjatsia) },
  ];

  const dateValue = data.date ? new Date(data.date) : new Date();
  const dateLabel = new Intl.DateTimeFormat("sq-AL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateValue);

  return <App prayers={prayers} dateLabel={dateLabel} hijriLabel="17 Dhul-Ka'de 1447 V.H." />;
}
