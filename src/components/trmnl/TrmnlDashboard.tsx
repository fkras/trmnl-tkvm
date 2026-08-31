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
import type { TrmnlDashboardData } from "@/lib/trmnl-dashboard";
import StaticDigitalClock from "./StaticDigitalClock";

type TrmnlDashboardProps = {
  data: TrmnlDashboardData;
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

export default function TrmnlDashboard({ data }: TrmnlDashboardProps) {
  return (
    <main className="trmnl-page" data-trmnl-width="1872" data-trmnl-height="1404">
      <section className="trmnl-header">
        <div>
          <p className="trmnl-kicker">{data.title}</p>
          <h1>{data.city}</h1>
          <p className="trmnl-date">{data.gregorian_date}</p>
          <p className="trmnl-hijri">{data.hijri_date}</p>
        </div>
        <div className="trmnl-updated">
          <span>Renderuar</span>
          <strong>{data.rendered_time}</strong>
        </div>
      </section>

      <section className="trmnl-main-grid">
        <article className="trmnl-panel trmnl-time-panel">
          <p className="trmnl-panel-label">Ora aktuale</p>
          <StaticDigitalClock value={data.current_time} />
          <div className="trmnl-next-prayer">
            <div>
              <p>Namazi i radhës</p>
              <strong>{data.next_prayer.name}</strong>
            </div>
            <div>
              <p>Pas</p>
              <strong>{data.next_prayer.time_until}</strong>
            </div>
          </div>
        </article>

        <article className="trmnl-panel trmnl-weather-panel">
          <div>
            <p className="trmnl-panel-label">Moti</p>
            <div className="trmnl-weather-now">
              <div>
                <strong>{typeof data.weather.temperature_c === "number" ? `${data.weather.temperature_c}°C` : "--°C"}</strong>
                <p>{data.weather.condition}</p>
                <span>{data.weather.location}</span>
              </div>
              <div className="trmnl-weather-icon" aria-hidden="true">
                {renderWeatherIcon(data.weather.icon)}
              </div>
            </div>
          </div>
          <div className="trmnl-weather-hours">
            {data.weather.forecast.map((segment) => (
              <div key={`${segment.time}-${segment.temperature_c}`} className="trmnl-weather-hour">
                <strong>{segment.temperature_c}°C</strong>
                <span>{segment.time}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="trmnl-prayer-grid" aria-label="Kohët e namazit">
        {data.prayers.map((prayer) => {
          return (
            <article key={prayer.key} className={`trmnl-prayer-card ${prayer.is_next ? "trmnl-prayer-card-next" : ""}`}>
              <p>{prayer.name}</p>
              <strong>{prayer.time}</strong>
              {prayer.is_next ? <span>I radhës</span> : null}
            </article>
          );
        })}
        <article className="trmnl-prayer-card trmnl-day-length">
          <p>Gjatësia e ditës</p>
          <strong>{data.day_length}</strong>
        </article>
      </section>
    </main>
  );
}
