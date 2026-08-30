"use client";

import { useEffect, useState } from "react";

export default function AnalogClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = hours * 30 + minutes * 0.5;
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  return (
    <div className="analog-clock">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="hour-marker"
          style={{
            transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(-150px)`,
          }}
        />
      ))}

      <div className="center-dot" />

      <div className="hour-hand" style={{ transform: `rotate(${hourAngle}deg)` }} />

      <div className="minute-hand" style={{ transform: `rotate(${minuteAngle}deg)` }} />

      <div className="second-hand" style={{ transform: `rotate(${secondAngle}deg)` }} />
    </div>
  );
}
