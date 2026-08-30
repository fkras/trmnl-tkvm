"use client";

import { useEffect, useMemo, useState } from "react";

type DigitalClockProps = {
  showSeconds?: boolean;
  timer?: string;
};

const SEGMENT_POLYGONS = {
  "top-center": [
    "149.486,40 49.486,40 50.883,0 150.883,0",
    "149.486,40 150.883,0 170.184,20",
    "50.883,0 49.486,40 30.184,20",
  ],
  "top-right": [
    "146.959,141 186.959,141 190.451,41 150.451,41",
    "190.451,41 150.451,41 171.149,21",
    "146.959,141 186.959,141 166.26,161",
  ],
  "top-left": [
    "4.959,141 44.959,141 48.451,41 8.451,41",
    "48.451,41 8.451,41 29.149,21",
    "4.959,141 44.959,141 24.26,161",
  ],
  "mid-center": [
    "144.527,182 44.527,182 45.924,142 145.924,142",
    "144.527,182 145.924,142 165.226,162",
    "45.924,142 44.527,182 25.226,162",
  ],
  "bottom-right": [
    "142,283 182,283 185.492,183 145.492,183",
    "185.492,183 145.492,183 166.191,163",
    "142,283 182,283 161.302,303",
  ],
  "bottom-left": [
    "0,283 40,283 43.492,183 3.492,183",
    "43.492,183 3.492,183 24.191,163",
    "0,283 40,283 19.302,303",
  ],
  "bottom-center": [
    "139.568,324 140.965,284 160.267,304",
    "40.965,284 39.568,324 20.267,304",
    "139.568,324 39.568,324 40.965,284 140.965,284",
  ],
} as const;

type SegmentName = keyof typeof SEGMENT_POLYGONS;

function Segment({ name }: { name: SegmentName }) {
  return (
    <g className={`lcd-element ${name}`}>
      {SEGMENT_POLYGONS[name].map((points) => (
        <polygon key={points} points={points} />
      ))}
    </g>
  );
}

function Digit({ x, className, value }: { x: number; className: string; value: string }) {
  return (
    <g transform={`translate(${x} 0)`} className={`${className} digit number-is-${value}`}>
      <Segment name="top-center" />
      <Segment name="top-right" />
      <Segment name="top-left" />
      <Segment name="mid-center" />
      <Segment name="bottom-right" />
      <Segment name="bottom-left" />
      <Segment name="bottom-center" />
    </g>
  );
}

function Dots({ x, isActive }: { x: number; isActive: boolean }) {
  return (
    <g transform={`translate(${x} 0)`} className={`lcd-element dots ${isActive ? "lcd-element-active" : ""}`}>
      <path d="M33.657,121c-0.289,8.284-7.24,15-15.524,15s-14.765-6.716-14.476-15c0.29-8.284,7.24-15,15.524-15S33.947,112.716,33.657,121z" />
      <path d="M30.515,211c-0.29,8.284-7.24,15-15.524,15S0.225,219.284,0.515,211c0.289-8.284,7.239-15,15.523-15S30.804,202.716,30.515,211z" />
    </g>
  );
}

function normalizePart(part: string | undefined) {
  const parsed = Number.parseInt(part ?? "", 10);
  if (Number.isNaN(parsed)) {
    return "00";
  }

  return String(Math.abs(parsed) % 100).padStart(2, "0");
}

const dotsAlwaysOn = true;

export default function DigitalClock({ showSeconds = false, timer }: DigitalClockProps) {
  const [time, setTime] = useState(new Date());
  const [dotsOn, setDotsOn] = useState(() => dotsAlwaysOn);
  const hasExternalTimer = typeof timer === "string" && timer.trim().length > 0;

  useEffect(() => {
    if (hasExternalTimer) {
      return;
    }

    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [hasExternalTimer]);

  useEffect(() => {
    if (dotsAlwaysOn) {
      return;
    }

    const interval = setInterval(() => {
      setDotsOn((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const [hours, minutes, seconds] = useMemo(() => {
    if (hasExternalTimer) {
      const [hourPart, minutePart, secondPart] = timer.split(":");
      return [normalizePart(hourPart), normalizePart(minutePart), normalizePart(secondPart)];
    }

    return [
      String(time.getHours()).padStart(2, "0"),
      String(time.getMinutes()).padStart(2, "0"),
      String(time.getSeconds()).padStart(2, "0"),
    ];
  }, [hasExternalTimer, timer, time]);

  const digits = useMemo(
    () => ({
      hour: [hours[0], hours[1]],
      minute: [minutes[0], minutes[1]],
      second: [seconds[0], seconds[1]],
    }),
    [hours, minutes, seconds],
  );

  const label = showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  const viewBox = showSeconds ? "0 0 1362.45 324" : "0 0 900 324";

  return (
    <div className="digital-clock">
      <div className="container" role="timer" aria-label={label}>
        <svg id="lcd-clock" viewBox={viewBox} aria-hidden="true">
          <Digit x={0} className="hour digit-1" value={digits.hour[0]} />
          <Digit x={212} className="hour digit-2" value={digits.hour[1]} />

          <Dots x={425} isActive={dotsOn} />

          <Digit x={487} className="minute digit-1" value={digits.minute[0]} />
          <Digit x={699} className="minute digit-2" value={digits.minute[1]} />

          {showSeconds ? <Dots x={912} isActive={dotsOn} /> : null}

          {showSeconds ? <Digit x={960} className="second digit-1" value={digits.second[0]} /> : null}
          {showSeconds ? <Digit x={1172} className="second digit-2" value={digits.second[1]} /> : null}
        </svg>
      </div>
    </div>
  );
}
