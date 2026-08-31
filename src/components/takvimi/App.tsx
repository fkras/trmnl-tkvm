import type { Prayer } from "./types";
import MainContent from "./components/MainContent";
import PrayerList from "./components/PrayerList";

type AppProps = {
  prayers: Prayer[];
  dateLabel: string;
  hijriLabel: string;
  currentPrayerIndex: number;
};

export default function App({ prayers, dateLabel, hijriLabel, currentPrayerIndex }: AppProps) {
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
