"use client";

import {  useEffect, useMemo, useState } from "react";
import type { Prayer } from "../types";
import { iconMap } from "./PrayerList";
import DigitalClock from "./DigitalClock";


type CountdownTimerProps = {
  prayers: Prayer[];
  initialCurrentPrayerIndex: number;
};

export default function CountdownTimer({ prayers, initialCurrentPrayerIndex }: CountdownTimerProps) {
  const [countdown, setCountdown] = useState("");
 const [currentPrayerIndex, setCurrentPrayerIndex] = useState(initialCurrentPrayerIndex);

  useEffect(() => {
    const updateCurrentPrayer = () => {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      for (let i = prayers.length - 1; i >= 0; i -= 1) {
        const [hours, minutes] = prayers[i].time.split(":").map(Number);
        const prayerTime = hours * 60 + minutes;

        if (currentTime >= prayerTime) {
          setCurrentPrayerIndex((i + 1) % prayers.length);
          return;
        }
      }

      setCurrentPrayerIndex(0);
    };

    updateCurrentPrayer();
    const interval = setInterval(updateCurrentPrayer, 60000);
    return () => clearInterval(interval);
  }, [prayers]);

  const nextPrayer = useMemo(() => prayers[currentPrayerIndex], [prayers, currentPrayerIndex]);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      const [hours, minutes] = nextPrayer.time.split(":").map(Number);
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      if (target < now) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown(
        `${String(hoursLeft).padStart(2, "0")}:${String(minutesLeft).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`,
      );
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [nextPrayer]);

  return (
    <div className="countdown-timer">
      <div className="label">{iconMap[nextPrayer.name as keyof typeof iconMap]} {nextPrayer.name}</div>
      <div className="countdown">
        <DigitalClock timer={countdown} showSeconds={false} />
      </div>
    </div>
  );
}
