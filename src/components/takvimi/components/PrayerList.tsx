import { CloudSun, Hourglass, Moon, Star, Sun, Sunrise, Sunset } from "lucide-react";
import type { Prayer } from "../types";
import { JSX } from "react/jsx-dev-runtime";
import CountdownTimer from "./CountdownTimer";

type PrayerListProps = {
  prayers: Prayer[];
  currentPrayerIndex: number;
};

export const iconMap: Record<string, JSX.Element> = {
  Imsaku: <Star />,
  "Lindja e diellit": <Sunrise />,
  Dreka: <Sun />,
  Ikindia: <CloudSun />,
  Akshami: <Sunset />,
  Jacia: <Moon />,
  "Gjatësia e ditës": <Hourglass />,
};

export default function PrayerList({ prayers, currentPrayerIndex }: PrayerListProps) {
  return (
    <div className="prayer-list">
      <h2>Kohët e namazit</h2>
      {prayers.map((prayer, index) => {
        const isActive = index === currentPrayerIndex;

        return (
          <div key={prayer.name} className={`prayer-item ${isActive ? "active" : ""}`}>
            <div className="icon">{iconMap[prayer.name as keyof typeof iconMap] ?? <Sun />}</div>
            <div className="name-wrapper">
              <div className="name">{prayer.name}</div>
            </div>
            <div className="time">{prayer.time}</div>
          </div>
        );
      })}

      <div className="countdown-wrapper">
        <CountdownTimer prayers={prayers} initialCurrentPrayerIndex={currentPrayerIndex} />
      </div>
    </div>
  );
}
