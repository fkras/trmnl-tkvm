import { getPrayerForToday } from "@/lib/prayer";
import { buildPrayerSchedule } from "@/lib/takvimi";
import { getWeatherData } from "@/lib/weather";

export type TrmnlPrayerItem = {
  key: string;
  name: string;
  time: string;
  is_next: boolean;
};

export type TrmnlWeatherForecastItem = {
  time: string;
  temperature_c: number;
  condition: string;
  icon: string;
};

export type TrmnlWeatherDayItem = {
  day: string;
  temperature_c: number;
  condition: string;
  icon: string;
};

export type TrmnlDashboardData = {
  city: string;
  title: string;
  generated_at: string;
  rendered_time: string;
  gregorian_date: string;
  hijri_date: string;
  current_time: string;
  next_prayer: {
    name: string;
    time: string;
    time_until: string;
  };
  prayers: TrmnlPrayerItem[];
  day_length: string;
  weather: {
    location: string;
    temperature_c: number | null;
    condition: string;
    icon: string;
    updated_time: string;
    forecast: TrmnlWeatherForecastItem[];
    upcoming_days: TrmnlWeatherDayItem[];
  };
};

const WEATHER_LABELS_SQ: Record<string, string> = {
  Sunny: "Me diell",
  "Partly cloudy": "Pjesërisht vranët",
  Cloudy: "Vranët",
  Fog: "Mjegull",
  Drizzle: "Rigë",
  Rain: "Shi",
  Snow: "Borë",
  Thunderstorm: "Stuhi",
  Weather: "Moti",
};

const PRAYER_KEYS = ["imsaku", "lindja", "dreka", "ikindia", "akshami", "jacia"] as const;

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("sq-AL", {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function toAlbanianWeatherLabel(label: string): string {
  return WEATHER_LABELS_SQ[label] ?? label;
}

export async function getTrmnlDashboardData(now = new Date()): Promise<TrmnlDashboardData> {
  const [{ data: prayerData }, weatherResult] = await Promise.all([
    getPrayerForToday(),
    getWeatherData().catch((error) => {
      const message = error instanceof Error ? error.message : "Unexpected weather error";
      console.warn(`Unable to load TRMNL weather data: ${message}`);
      return null;
    }),
  ]);
  const schedule = buildPrayerSchedule(prayerData, now);
  const weather = weatherResult?.data;
  const currentWeather = weather?.current;

  return {
    city: "Gjilan",
    title: "Takvimi për Kosovë",
    generated_at: now.toISOString(),
    rendered_time: formatTime(now),
    gregorian_date: schedule.dateLabel,
    hijri_date: schedule.hijriLabel,
    current_time: schedule.currentTimeLabel,
    next_prayer: {
      name: schedule.nextPrayer.name,
      time: schedule.nextPrayer.time,
      time_until: schedule.timeUntilNextPrayerLabel,
    },
    prayers: schedule.prayerTimes.map((prayer, index) => ({
      key: PRAYER_KEYS[index] ?? prayer.name.toLowerCase(),
      name: prayer.name,
      time: prayer.time,
      is_next: index === schedule.nextPrayerIndex,
    })),
    day_length: schedule.dayLengthLabel,
    weather: {
      location: weather?.location.name ?? "Gjilan, Kosovo",
      temperature_c: currentWeather ? Math.round(currentWeather.temperatureC) : null,
      condition: currentWeather ? toAlbanianWeatherLabel(currentWeather.weatherLabel) : "I padisponueshëm",
      icon: currentWeather?.weatherIcon ?? "cloud",
      updated_time: weather?.updatedAt ? formatTime(new Date(weather.updatedAt)) : "",
      forecast:
        weather?.todaySegments.slice(0, 6).map((segment) => ({
          time: segment.timeLabel,
          temperature_c: Math.round(segment.temperatureC),
          condition: toAlbanianWeatherLabel(segment.weatherLabel),
          icon: segment.weatherIcon,
        })) ?? [],
      upcoming_days:
        weather?.upcomingDays.slice(0, 4).map((day) => ({
          day: day.dayLabel,
          temperature_c: Math.round(day.temperatureC),
          condition: toAlbanianWeatherLabel(day.weatherLabel),
          icon: day.weatherIcon,
        })) ?? [],
    },
  };
}
