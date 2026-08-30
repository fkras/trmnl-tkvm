"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudRain,
  CloudSnow,
  CloudSun,
  Cloudy,
  Sun,
  Zap,
} from "lucide-react";
import type { WeatherApiResponse, WeatherDay, WeatherPoint } from "../types";

const WEATHER_REFRESH_MS = 5 * 60 * 1000;

function renderWeatherIcon(icon: string) {
  if (icon === "sun") return <Sun size={42} strokeWidth={1.8} />;
  if (icon === "partly-cloudy") return <CloudSun size={42} strokeWidth={1.8} />;
  if (icon === "cloudy") return <Cloudy size={42} strokeWidth={1.8} />;
  if (icon === "fog") return <CloudFog size={42} strokeWidth={1.8} />;
  if (icon === "drizzle") return <CloudDrizzle size={42} strokeWidth={1.8} />;
  if (icon === "rain") return <CloudRain size={42} strokeWidth={1.8} />;
  if (icon === "snow") return <CloudSnow size={42} strokeWidth={1.8} />;
  if (icon === "thunder") return <Zap size={42} strokeWidth={1.8} />;
  return <Cloud size={42} strokeWidth={1.8} />;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatUpcomingDayLabel(day: WeatherDay): string {
  const value = new Date(day.date);

  if (Number.isNaN(value.getTime())) {
    return day.dayLabel;
  }

  const datePart = toTitleCase(
    new Intl.DateTimeFormat("sq-AL", {
      day: "2-digit",
      month: "short",
    }).format(value),
  );

  const weekPart = toTitleCase(
    new Intl.DateTimeFormat("sq-AL", {
      weekday: "long",
    }).format(value),
  );

  return `${datePart}, ${weekPart}`;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherApiResponse | null>(null);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchWeather = async () => {
      try {
        const response = await fetch("/api/weather", { cache: "no-store" });

        if (!response.ok) {
          throw new Error(`Weather fetch failed with ${response.status}`);
        }

        const result = (await response.json()) as WeatherApiResponse;

        if (!isMounted) {
          return;
        }

        setWeather(result);
        setWeatherError("");
      } catch {
        if (!isMounted) {
          return;
        }

        setWeatherError("Weather data is temporarily unavailable.");
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, WEATHER_REFRESH_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const weatherTimeLabel = weather?.data.updatedAt
    ? new Intl.DateTimeFormat("sq-AL", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(weather.data.updatedAt))
    : "";

  const todaySegments = weather?.data.todaySegments ?? [];
  const upcomingDays = weather?.data.upcomingDays ?? [];

  return (
    <section className="weather-stack" aria-label="Weather forecast">
      <article className="weather-card weather-card-today">
        <div className="weather-card-main">
          <div>
            <p className="weather-temp">{weather ? `${Math.round(weather.data.current.temperatureC)}°C` : "--°C"}</p>
            <p className="weather-location">{"Gjilan, Kosovo"}</p>
            <p className="weather-updated">
              {weather ? `Perditesuar: ${weatherTimeLabel}` : "Duke marre te dhenat e motit..."}
            </p>
          </div>
          <div className="weather-icon" aria-hidden="true">
            {renderWeatherIcon(weather?.data.current.weatherIcon ?? "cloud")}
          </div>
        </div>

        <div className="weather-hour-grid">
          {todaySegments.map((segment: WeatherPoint) => (
            <div className="weather-hour-item" key={`${segment.timeLabel}-${segment.weatherCode}`}>
              <p className="weather-hour-temp">{Math.round(segment.temperatureC)}°C</p>
              <span className="weather-hour-icon" aria-hidden="true">
                {renderWeatherIcon(segment.weatherIcon)}
              </span>
              <p className="weather-hour-label">{segment.timeLabel}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="weather-card weather-card-next-days">
        <div className="weather-days-grid">
          {upcomingDays.map((day: WeatherDay) => (
            <div className="weather-day-item" key={day.date}>
              <div className="weather-day-top">
                <p className="weather-day-temp">{Math.round(day.temperatureC)}°C</p>
                <span className="weather-day-icon" aria-hidden="true">
                  {renderWeatherIcon(day.weatherIcon)}
                </span>
              </div>
              <p className="weather-day-date">{formatUpcomingDayLabel(day)}</p>
            </div>
          ))}
        </div>
      </article>

      {weatherError ? <p className="weather-error">{weatherError}</p> : null}
    </section>
  );
}
