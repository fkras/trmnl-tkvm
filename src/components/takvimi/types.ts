export type Prayer = {
  name: string;
  time: string;
};

export type WeatherPoint = {
  timeLabel: string;
  temperatureC: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
};

export type WeatherDay = {
  date: string;
  dayLabel: string;
  temperatureC: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
};

export type WeatherPayload = {
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
  todaySegments: WeatherPoint[];
  upcomingDays: WeatherDay[];
};

export type WeatherApiResponse = {
  source: "cache" | "open-meteo";
  data: WeatherPayload;
};
