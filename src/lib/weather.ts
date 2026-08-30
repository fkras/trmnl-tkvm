import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchWeatherApi } from "openmeteo";

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_CACHE_FILE_PATH = path.join(process.cwd(), "weather-cache.json");
const WEATHER_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

const WEATHER_LOCATION = {
  name: "Gjilan, Kosovo",
  latitude: 42.4605,
  longitude: 21.4699,
};

type WeatherCachePayload = {
  updatedAt: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  current: {
    temperatureC: number;
    weatherCode: number;
    weatherLabel: string;
    weatherIcon: string;
  };
  todaySegments: Array<{
    timeLabel: string;
    temperatureC: number;
    weatherCode: number;
    weatherLabel: string;
    weatherIcon: string;
  }>;
  upcomingDays: Array<{
    date: string;
    dayLabel: string;
    temperatureC: number;
    weatherCode: number;
    weatherLabel: string;
    weatherIcon: string;
  }>;
};

export type WeatherResult = {
  source: "cache" | "open-meteo";
  data: WeatherCachePayload;
};

function range(start: number, stop: number, step: number): number[] {
  if (step <= 0 || stop <= start) {
    return [];
  }

  const size = Math.max(0, Math.floor((stop - start) / step));
  return Array.from({ length: size }, (_, i) => start + i * step);
}

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toHourKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  return `${year}-${month}-${day}-${hour}`;
}

function formatHourLabel(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:00`;
}

function resolveWeatherCodeMeta(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Sunny", icon: "sun" };
  if (code === 1 || code === 2) return { label: "Partly cloudy", icon: "partly-cloudy" };
  if (code === 3) return { label: "Cloudy", icon: "cloudy" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "fog" };
  if (code === 51 || code === 53 || code === 55 || code === 56 || code === 57) {
    return { label: "Drizzle", icon: "drizzle" };
  }
  if (code === 61 || code === 63 || code === 65 || code === 66 || code === 67 || code === 80 || code === 81 || code === 82) {
    return { label: "Rain", icon: "rain" };
  }
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return { label: "Snow", icon: "snow" };
  }
  if (code === 95 || code === 96 || code === 99) return { label: "Thunderstorm", icon: "thunder" };
  return { label: "Weather", icon: "cloudy" };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isValidWeatherPayload(input: unknown): input is WeatherCachePayload {
  if (!input || typeof input !== "object") {
    return false;
  }

  const data = input as Partial<WeatherCachePayload>;

  return Boolean(
    typeof data.updatedAt === "string" &&
      data.location &&
      typeof data.location.name === "string" &&
      typeof data.current?.temperatureC === "number" &&
      Array.isArray(data.todaySegments) &&
      Array.isArray(data.upcomingDays),
  );
}

async function readCachedWeather(): Promise<WeatherCachePayload | null> {
  try {
    await access(WEATHER_CACHE_FILE_PATH);
    const raw = await readFile(WEATHER_CACHE_FILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    if (!isValidWeatherPayload(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function writeCachedWeather(payload: WeatherCachePayload): Promise<void> {
  await writeFile(WEATHER_CACHE_FILE_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function isCacheFresh(updatedAt: string): boolean {
  const updatedAtTime = new Date(updatedAt).getTime();

  if (Number.isNaN(updatedAtTime)) {
    return false;
  }

  return Date.now() - updatedAtTime < WEATHER_CACHE_TTL_MS;
}

function getClosestHourlyIndex(target: Date, hourlyTimes: Date[]): number {
  let closestIndex = 0;
  let closestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < hourlyTimes.length; i += 1) {
    const diff = Math.abs(hourlyTimes[i].getTime() - target.getTime());

    if (diff < closestDiff) {
      closestDiff = diff;
      closestIndex = i;
    }
  }

  return closestIndex;
}

function buildSegmentTargets(now: Date): Date[] {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);

  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const totalMs = Math.max(60 * 60 * 1000, midnight.getTime() - start.getTime());
  const points: Date[] = [];

  for (let i = 1; i <= 6; i += 1) {
    const point = new Date(start.getTime() + (totalMs * i) / 6);

    if (point.getMinutes() >= 30) {
      point.setHours(point.getHours() + 1, 0, 0, 0);
    } else {
      point.setMinutes(0, 0, 0);
    }

    const previous = points.at(-1);

    if (previous && point.getTime() <= previous.getTime()) {
      point.setTime(previous.getTime() + 60 * 60 * 1000);
    }

    points.push(point);
  }

  return points;
}

async function fetchOpenMeteoWeather(): Promise<WeatherCachePayload> {
  const params = {
    latitude: [WEATHER_LOCATION.latitude],
    longitude: [WEATHER_LOCATION.longitude],
    timezone: "auto",
    current: "temperature_2m,weather_code",
    hourly: "temperature_2m,weather_code",
    daily: "weather_code,temperature_2m_max",
    forecast_days: 8,
  };

  const responses = await fetchWeatherApi(WEATHER_API_URL, params);
  const response = responses[0];

  if (!response) {
    throw new Error("Open-Meteo did not return weather data.");
  }

  const utcOffsetSeconds = response.utcOffsetSeconds();
  const current = response.current();
  const hourly = response.hourly();
  const daily = response.daily();

  if (!current || !hourly || !daily) {
    throw new Error("Open-Meteo response is missing current/hourly/daily data.");
  }

  const hourlyTimes = range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
    (timestamp) => new Date((timestamp + utcOffsetSeconds) * 1000),
  );

  const hourlyTemperature = Array.from(hourly.variables(0)?.valuesArray() ?? []);
  const hourlyCode = Array.from(hourly.variables(1)?.valuesArray() ?? []);

  const hourlyIndexByKey = new Map<string, number>();
  hourlyTimes.forEach((date, index) => {
    hourlyIndexByKey.set(toHourKey(date), index);
  });

  const now = new Date();
  const targets = buildSegmentTargets(now);

  const todaySegments = targets.map((target) => {
    const directIndex = hourlyIndexByKey.get(toHourKey(target));
    const index = directIndex ?? getClosestHourlyIndex(target, hourlyTimes);
    const weatherCode = Math.round(hourlyCode[index] ?? 3);
    const weatherMeta = resolveWeatherCodeMeta(weatherCode);

    return {
      timeLabel: formatHourLabel(target),
      temperatureC: round1(hourlyTemperature[index] ?? 0),
      weatherCode,
      weatherLabel: weatherMeta.label,
      weatherIcon: weatherMeta.icon,
    };
  });

  const dailyTimes = range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
    (timestamp) => new Date((timestamp + utcOffsetSeconds) * 1000),
  );
  const dailyCode = Array.from(daily.variables(0)?.valuesArray() ?? []);
  const dailyTemperature = Array.from(daily.variables(1)?.valuesArray() ?? []);

  const upcomingDays = dailyTimes.slice(1, 8).map((value, index) => {
    const weatherCode = Math.round(dailyCode[index + 1] ?? 3);
    const weatherMeta = resolveWeatherCodeMeta(weatherCode);

    return {
      date: toIsoDate(value),
      dayLabel: new Intl.DateTimeFormat("sq-AL", { weekday: "short" }).format(value),
      temperatureC: round1(dailyTemperature[index + 1] ?? 0),
      weatherCode,
      weatherLabel: weatherMeta.label,
      weatherIcon: weatherMeta.icon,
    };
  });

  const currentCode = Math.round(current.variables(1)?.value() ?? 3);
  const currentMeta = resolveWeatherCodeMeta(currentCode);

  return {
    updatedAt: new Date().toISOString(),
    location: {
      name: WEATHER_LOCATION.name,
      latitude: WEATHER_LOCATION.latitude,
      longitude: WEATHER_LOCATION.longitude,
      timezone: response.timezone() ?? "UTC",
    },
    current: {
      temperatureC: round1(current.variables(0)?.value() ?? 0),
      weatherCode: currentCode,
      weatherLabel: currentMeta.label,
      weatherIcon: currentMeta.icon,
    },
    todaySegments,
    upcomingDays,
  };
}

export async function getWeatherData(): Promise<WeatherResult> {
  const cached = await readCachedWeather();

  if (cached && isCacheFresh(cached.updatedAt)) {
    return {
      source: "cache",
      data: cached,
    };
  }

  const freshData = await fetchOpenMeteoWeather();
  await writeCachedWeather(freshData);

  return {
    source: "open-meteo",
    data: freshData,
  };
}
