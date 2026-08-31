import type { Prayer } from "@/components/takvimi/types";
import type { PrayerRecord } from "@/lib/prayer";

export type PrayerSchedule = {
  prayers: Prayer[];
  prayerTimes: Prayer[];
  dateLabel: string;
  hijriLabel: string;
  nextPrayerIndex: number;
  nextPrayer: Prayer;
  timeUntilNextPrayerLabel: string;
  currentTimeLabel: string;
  dayLengthLabel: string;
};

const PRAYER_NAMES = [
  "Imsaku",
  "Lindja e diellit",
  "Dreka",
  "Ikindia",
  "Akshami",
  "Jacia",
] as const;

const HIJRI_MONTHS = [
  "Muharrem",
  "Safer",
  "Rebiul Evel",
  "Rebiul Ahir",
  "Xhumadel Ula",
  "Xhumadel Ahire",
  "Rexheb",
  "Shaban",
  "Ramazan",
  "Sheval",
  "Dhul-Ka'de",
  "Dhul-Hixhe",
] as const;

function minutesToDuration(value: number): string {
  if (value <= 0) return "00:00";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeToMinutes(value: string): number | null {
  const [hoursText, minutesText] = value.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function getNextPrayerIndex(prayers: Prayer[], now: Date): number {
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (let i = prayers.length - 1; i >= 0; i -= 1) {
    const prayerTime = parseTimeToMinutes(prayers[i].time);

    if (prayerTime !== null && currentTime >= prayerTime) {
      return (i + 1) % prayers.length;
    }
  }

  return 0;
}

function formatTimeUntilPrayer(prayer: Prayer, now: Date): string {
  const prayerMinutes = parseTimeToMinutes(prayer.time);

  if (prayerMinutes === null) {
    return "";
  }

  const target = new Date(now);
  target.setHours(Math.floor(prayerMinutes / 60), prayerMinutes % 60, 0, 0);

  if (target.getTime() < now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diffMinutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60000));
  const hoursLeft = Math.floor(diffMinutes / 60);
  const minutesLeft = diffMinutes % 60;

  if (hoursLeft <= 0) {
    return `${minutesLeft}min`;
  }

  return `${hoursLeft}h ${minutesLeft}min`;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatGregorianDate(date: Date): string {
  return toTitleCase(
    new Intl.DateTimeFormat("sq-AL", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date),
  );
}

function getHijriPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? "";
}

function formatHijriDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).formatToParts(date);

  const day = getHijriPart(parts, "day");
  const month = Number(getHijriPart(parts, "month"));
  const year = getHijriPart(parts, "year");
  const monthLabel = HIJRI_MONTHS[month - 1] ?? "Hijri";

  if (!day || !year) {
    return "";
  }

  return `${day} ${monthLabel} ${year} V.H.`;
}

export function buildPrayerSchedule(record: PrayerRecord, now = new Date()): PrayerSchedule {
  const prayerTimes: Prayer[] = [
    { name: PRAYER_NAMES[0], time: record.imsaku },
    { name: PRAYER_NAMES[1], time: record.lindja },
    { name: PRAYER_NAMES[2], time: record.dreka },
    { name: PRAYER_NAMES[3], time: record.ikindia },
    { name: PRAYER_NAMES[4], time: record.akshami },
    { name: PRAYER_NAMES[5], time: record.jacia },
  ];
  const dayLengthLabel = minutesToDuration(record.gjatsia);
  const prayers: Prayer[] = [...prayerTimes, { name: "Gjatësia e ditës", time: dayLengthLabel }];
  const dateValue = record.date ? new Date(record.date) : now;
  const nextPrayerIndex = getNextPrayerIndex(prayerTimes, now);
  const nextPrayer = prayerTimes[nextPrayerIndex] ?? prayerTimes[0];

  return {
    prayers,
    prayerTimes,
    dateLabel: formatGregorianDate(dateValue),
    hijriLabel: formatHijriDate(dateValue),
    nextPrayerIndex,
    nextPrayer,
    timeUntilNextPrayerLabel: formatTimeUntilPrayer(nextPrayer, now),
    currentTimeLabel: new Intl.DateTimeFormat("sq-AL", {
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).format(now),
    dayLengthLabel,
  };
}
