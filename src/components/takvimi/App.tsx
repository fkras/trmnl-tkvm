import type { Prayer } from "./types";
import MainContent from "./components/MainContent";
import PrayerList from "./components/PrayerList";

type AppProps = {
  prayers: Prayer[];
  dateLabel: string;
  hijriLabel: string;
};

function getCurrentPrayerIndex(prayers: Prayer[]): number {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (let i = prayers.length - 1; i >= 0; i -= 1) {
    const [hours, minutes] = prayers[i].time.split(":").map(Number);
    const prayerTime = hours * 60 + minutes;

    if (currentTime >= prayerTime) {
      return (i + 1) % prayers.length;
    }
  }

  return 0;
}

export default function App({ prayers, dateLabel, hijriLabel }: AppProps) {
  const currentPrayerIndex = getCurrentPrayerIndex(prayers.slice(0, 6));

  return (
    <div className="app">
      <div className="sidebar">
        <div className="header">
          <h1>Takvimi për Kosovë 2026</h1>
          <p className="date">{dateLabel}</p>
          <p className="hijri">{hijriLabel}</p>
        </div>
        <PrayerList prayers={prayers} currentPrayerIndex={currentPrayerIndex} />
      </div>

      <MainContent />
    </div>
  );
}
