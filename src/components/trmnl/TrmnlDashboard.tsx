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
import type { WeatherResult } from "@/lib/weather";
import type { PrayerSchedule } from "@/lib/takvimi";
import StaticDigitalClock from "./StaticDigitalClock";

type TrmnlDashboardProps = {
  schedule: PrayerSchedule;
  weather: WeatherResult | null;
  updatedAt: Date;
};

function renderWeatherIcon(icon: string) {
  const iconProps = { size: 96, strokeWidth: 1.8 };

  if (icon === "sun") return <Sun {...iconProps} />;
  if (icon === "partly-cloudy") return <CloudSun {...iconProps} />;
  if (icon === "cloudy") return <Cloudy {...iconProps} />;
  if (icon === "fog") return <CloudFog {...iconProps} />;
  if (icon === "drizzle") return <CloudDrizzle {...iconProps} />;
  if (icon === "rain") return <CloudRain {...iconProps} />;
  if (icon === "snow") return <CloudSnow {...iconProps} />;
  if (icon === "thunder") return <Zap {...iconProps} />;
  return <Cloud {...iconProps} />;
}

function formatUpdatedAt(value: Date): string {
  return new Intl.DateTimeFormat("sq-AL", {
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default function TrmnlDashboard({ schedule, weather, updatedAt }: TrmnlDashboardProps) {
  const weatherData = weather?.data;
  const currentWeather = weatherData?.current;
  const todaySegments = weatherData?.todaySegments.slice(0, 6) ?? [];

  return (
    <main className="trmnl-page" data-trmnl-width="1872" data-trmnl-height="1404">
      <section className="trmnl-header">
        <div>
          <p className="trmnl-kicker">Takvimi për Kosovë</p>
          <h1>Gjilan</h1>
          <p className="trmnl-date">{schedule.dateLabel}</p>
          <p className="trmnl-hijri">{schedule.hijriLabel}</p>
        </div>
        <div className="trmnl-updated">
          <span>Renderuar</span>
          <strong>{formatUpdatedAt(updatedAt)}</strong>
        </div>
      </section>

      <section className="trmnl-main-grid">
        <article className="trmnl-panel trmnl-time-panel">
          <p className="trmnl-panel-label">Ora aktuale</p>
          <StaticDigitalClock value={schedule.currentTimeLabel} />
          <div className="trmnl-next-prayer">
            <div>
              <p>Namazi i radhës</p>
              <strong>{schedule.nextPrayer.name}</strong>
            </div>
            <div>
              <p>Pas</p>
              <strong>{schedule.timeUntilNextPrayerLabel}</strong>
            </div>
          </div>
        </article>

        <article className="trmnl-panel trmnl-weather-panel">
          <div>
            <p className="trmnl-panel-label">Moti</p>
            <div className="trmnl-weather-now">
              <div>
                <strong>{currentWeather ? `${Math.round(currentWeather.temperatureC)}°C` : "--°C"}</strong>
                <p>{currentWeather?.weatherLabel ?? "I padisponueshëm"}</p>
                <span>{weatherData?.location.name ?? "Gjilan, Kosovo"}</span>
              </div>
              <div className="trmnl-weather-icon" aria-hidden="true">
                {renderWeatherIcon(currentWeather?.weatherIcon ?? "cloud")}
              </div>
            </div>
          </div>
          <div className="trmnl-weather-hours">
            {todaySegments.map((segment) => (
              <div key={`${segment.timeLabel}-${segment.weatherCode}`} className="trmnl-weather-hour">
                <strong>{Math.round(segment.temperatureC)}°C</strong>
                <span>{segment.timeLabel}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="trmnl-prayer-grid" aria-label="Kohët e namazit">
        {schedule.prayerTimes.map((prayer, index) => {
          const isNext = index === schedule.nextPrayerIndex;

          return (
            <article key={prayer.name} className={`trmnl-prayer-card ${isNext ? "trmnl-prayer-card-next" : ""}`}>
              <p>{prayer.name}</p>
              <strong>{prayer.time}</strong>
              {isNext ? <span>I radhës</span> : null}
            </article>
          );
        })}
        <article className="trmnl-prayer-card trmnl-day-length">
          <p>Gjatësia e ditës</p>
          <strong>{schedule.dayLengthLabel}</strong>
        </article>
      </section>
    </main>
  );
}
