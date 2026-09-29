"use client";

import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Droplets, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { weatherKind, type WeatherKind } from "@/lib/weather";
import type { Weather } from "@/lib/types";
import styles from "./WeatherWidget.module.css";

const ICONS: Record<WeatherKind, [day: LucideIcon, night: LucideIcon]> = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  fog: [CloudFog, CloudFog],
  drizzle: [CloudDrizzle, CloudDrizzle],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  storm: [CloudLightning, CloudLightning],
};

function WeatherIcon({ code, isDay, className = "icon" }: { code: number; isDay: boolean; className?: string }) {
  const Icon = ICONS[weatherKind(code)][isDay ? 0 : 1];
  return <Icon className={className} aria-hidden="true" />;
}

interface WeatherWidgetProps {
  weather: Weather | null;
  /** Mobil çubukta daha küçük düğme */
  compact?: boolean;
}

export function WeatherWidget({ weather, compact }: WeatherWidgetProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!weather) {
    return (
      <span className={`${styles.trigger} ${styles.unavailable} ${compact ? styles.compact : ""}`} title="Hava durumu şu an alınamıyor">
        <Cloud className="icon" aria-hidden="true" />
        <span>—°</span>
      </span>
    );
  }

  const { current, hours, location } = weather;
  return (
    <div className={styles.wrap} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.compact : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Hava durumu: ${location}, ${current.temperature} derece, ${current.description}`}
        onClick={() => setOpen((v) => !v)}
      >
        <WeatherIcon code={current.code} isDay={current.isDay} />
        <span className={styles.temp}>{current.temperature}°</span>
      </button>
      {open && (
        <div className={styles.panel} id={panelId} role="dialog" aria-label="Saatlik hava durumu">
          <div className={styles.head}>
            <WeatherIcon code={current.code} isDay={current.isDay} className={`icon ${styles.bigIcon}`} />
            <div>
              <p className={styles.now}>{current.temperature}°</p>
              <p className={styles.desc}>
                {location} · {current.description}
              </p>
            </div>
          </div>
          <p className={styles.label}>Sonraki 5 saat</p>
          <ol className={styles.hours}>
            {hours.map((h) => (
              <li key={h.time} className={h.precipitationProbability >= 50 ? styles.wet : undefined}>
                <span className={styles.hour}>{h.time}</span>
                <WeatherIcon code={h.code} isDay={h.isDay} />
                <strong>{h.temperature}°</strong>
                <span className={styles.rain}>
                  <Droplets className="icon" aria-hidden="true" />%{h.precipitationProbability}
                </span>
              </li>
            ))}
          </ol>
          <p className={styles.source}>Kaynak: Open-Meteo · 15 dakikada bir güncellenir</p>
        </div>
      )}
    </div>
  );
}
