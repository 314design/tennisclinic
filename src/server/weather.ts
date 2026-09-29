import "server-only";
import { cache } from "react";
import { clubNow, CLUB_TIMEZONE } from "@/lib/clock";
import { weatherDescription } from "@/lib/weather";
import type { Weather } from "@/lib/types";

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number };
  hourly: { time: string[]; temperature_2m: number[]; weather_code: number[]; is_day: number[]; precipitation_probability: number[] };
  daily: { time: string[]; precipitation_probability_max: number[] };
}

/** Yerel geliştirmede ağ kapalıysa WEATHER_FIXTURE=1 ile örnek veri kullanılır */
function fixture(): OpenMeteoResponse {
  const now = clubNow();
  const h = Number(now.time.slice(0, 2));
  const hours = Array.from({ length: 30 }, (_, i) => `${now.date}T${String((h + i) % 24).padStart(2, "0")}:00`);
  return {
    current: { temperature_2m: 18.4, weather_code: 2, is_day: 1 },
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, i) => 18 - i * 0.8),
      weather_code: hours.map((_, i) => [2, 2, 3, 61, 61, 3][i % 6]),
      is_day: hours.map((_, i) => ((h + i) % 24 >= 7 && (h + i) % 24 < 19 ? 1 : 0)),
      precipitation_probability: hours.map((_, i) => [10, 15, 30, 65, 70, 40][i % 6]),
    },
    daily: { time: [now.date, "tomorrow"], precipitation_probability_max: [70, 80] },
  };
}

/**
 * Open-Meteo (anahtar gerektirmez). Sonuç 15 dakika önbellekte tutulur.
 * Servis erişilemezse null döner; arayüz hava durumunu gizler.
 */
export const getWeather = cache(async (loc: WeatherLocation): Promise<Weather | null> => {
  let data: OpenMeteoResponse;
  if (process.env.WEATHER_FIXTURE === "1") {
    data = fixture();
  } else {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      current: "temperature_2m,weather_code,is_day",
      hourly: "temperature_2m,weather_code,is_day,precipitation_probability",
      daily: "precipitation_probability_max",
      forecast_days: "2",
      timezone: CLUB_TIMEZONE,
    }).toString();
    try {
      const res = await fetch(url, { next: { revalidate: 900 }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      data = (await res.json()) as OpenMeteoResponse;
    } catch {
      return null;
    }
  }

  const now = clubNow();
  const currentHour = `${now.date}T${now.time.slice(0, 2)}:00`;
  const startIndex = Math.max(data.hourly.time.indexOf(currentHour), 0);
  // Sonraki 5 saat (şu anki saatten sonra)
  const hours = data.hourly.time.slice(startIndex + 1, startIndex + 6).map((t, i) => {
    const k = startIndex + 1 + i;
    return {
      time: t.slice(11, 16),
      temperature: Math.round(data.hourly.temperature_2m[k]),
      code: data.hourly.weather_code[k],
      isDay: data.hourly.is_day[k] === 1,
      precipitationProbability: data.hourly.precipitation_probability[k] ?? 0,
    };
  });

  return {
    location: loc.name,
    current: {
      temperature: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      isDay: data.current.is_day === 1,
      description: weatherDescription(data.current.weather_code),
    },
    hours,
    tomorrowPrecipitation: data.daily.precipitation_probability_max[1] ?? 0,
  };
});
