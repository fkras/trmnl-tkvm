import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

export type PrayerRecord = {
  date: string;
  note: string;
  imsaku: string;
  lindja: string;
  dreka: string;
  ikindia: string;
  akshami: string;
  jacia: string;
  gjatsia: number;
};

const PRAYER_FILE_PATH = path.join(process.cwd(), "prayer.json");
const SOURCE_URL = "https://takvimi-ks.com/";

type UnknownPrayerInput = Partial<Record<keyof PrayerRecord, unknown>>;

function formatDateOnly(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const isoTimeMatch = trimmed.match(/T(\d{2}):(\d{2})/);

  if (isoTimeMatch) {
    return `${isoTimeMatch[1]}:${isoTimeMatch[2]}`;
  }

  const parsedDate = new Date(trimmed);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const hours = String(parsedDate.getHours()).padStart(2, "0");
  const minutes = String(parsedDate.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseDurationToMinutes(value: string): number {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return 0;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}

function toPrayerRecord(input: UnknownPrayerInput): PrayerRecord | null {
  const date =
    typeof input.date === "string"
      ? formatDateOnly(input.date)
      : input.date instanceof Date
        ? formatDateOnly(input.date)
        : "";

  if (!date) {
    return null;
  }

  const gjatsiaRaw = input.gjatsia;
  const gjatsia =
    typeof gjatsiaRaw === "number"
      ? gjatsiaRaw
      : typeof gjatsiaRaw === "string"
        ? parseDurationToMinutes(gjatsiaRaw)
        : 0;

  return {
    date,
    note: typeof input.note === "string" ? input.note : "",
    imsaku: formatTime(input.imsaku),
    lindja: formatTime(input.lindja),
    dreka: formatTime(input.dreka),
    ikindia: formatTime(input.ikindia),
    akshami: formatTime(input.akshami),
    jacia: formatTime(input.jacia),
    gjatsia,
  };
}

function extractPrayerEntries(json: unknown): UnknownPrayerInput[] {
  if (Array.isArray(json)) {
    return json;
  }

  if (json && typeof json === "object") {
    const maybeList = (json as { prayers?: unknown }).prayers;

    if (Array.isArray(maybeList)) {
      return maybeList;
    }

    return [json as UnknownPrayerInput];
  }

  return [];
}

async function getTodayPrayerFromFile(): Promise<PrayerRecord | null> {
  try {
    await access(PRAYER_FILE_PATH);
    const raw = await readFile(PRAYER_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    const entries = extractPrayerEntries(parsed);
    const records = entries
      .map((entry) => toPrayerRecord(entry))
      .filter((entry): entry is PrayerRecord => entry !== null);

    const today = formatDateOnly(new Date());
    return records.find((record) => record.date === today) ?? null;
  } catch {
    return null;
  }
}

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

async function scrapePrayerTimes(): Promise<PrayerRecord> {
  const response = await fetch(SOURCE_URL, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Failed to fetch source website: ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);

  const times: Partial<Record<keyof PrayerRecord, string>> = {};

  $("ul.listview.image-listview.inset li").each((_, item) => {
    const label = normalizeLabel($(item).find(".in > div").first().text());
    const time = $(item).find(".in > span.text-muted").first().text().trim();

    if (!time) {
      return;
    }

    if (label === "imsaku") times.imsaku = time;
    if (label.includes("lindja")) times.lindja = time;
    if (label === "dreka") times.dreka = time;
    if (label === "ikindia") times.ikindia = time;
    if (label === "akshami") times.akshami = time;
    if (label === "jacia") times.jacia = time;
    if (label.includes("gjatesia e dites")) times.gjatsia = time;
  });

  return {
    date: formatDateOnly(new Date()),
    note: "Fallback data scraped from takvimi-ks.com",
    imsaku: times.imsaku ?? "",
    lindja: times.lindja ?? "",
    dreka: times.dreka ?? "",
    ikindia: times.ikindia ?? "",
    akshami: times.akshami ?? "",
    jacia: times.jacia ?? "",
    gjatsia: parseDurationToMinutes(times.gjatsia ?? ""),
  };
}

export async function getPrayerForToday(): Promise<{
  source: "prayer.json" | "scraped";
  data: PrayerRecord;
}> {
  const fromFile = await getTodayPrayerFromFile();

  if (fromFile) {
    return { source: "prayer.json", data: fromFile };
  }

  const fallback = await scrapePrayerTimes();
  return { source: "scraped", data: fallback };
}
