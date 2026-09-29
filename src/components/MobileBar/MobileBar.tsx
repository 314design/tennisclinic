import { Bell, ChevronDown, Search } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark/BrandMark";
import { WeatherWidget } from "@/components/WeatherWidget/WeatherWidget";
import type { Club, Weather } from "@/lib/types";
import styles from "./MobileBar.module.css";

interface MobileBarProps {
  club: Club;
  unreadNotifications: number;
  weather: Weather | null;
}

export function MobileBar({ club, unreadNotifications, weather }: MobileBarProps) {
  return (
    <header className={styles.bar}>
      <BrandMark className={styles.mark} />
      <button className={styles.club} type="button" aria-label={`Şube değiştir: ${club.branch}`}>
        <span className={styles.name}>{club.name}</span>
        <span className={styles.branch}>
          {club.branch} <ChevronDown className="icon icon--sm" aria-hidden="true" />
        </span>
      </button>
      <WeatherWidget weather={weather} compact />
      <Link className={`icon-btn ${styles.iconBtn}`} href="/uyeler" aria-label="Ara">
        <Search className="icon" aria-hidden="true" />
      </Link>
      <button className={`icon-btn ${styles.iconBtn}`} type="button" aria-label={`Bildirimler, ${unreadNotifications} yeni`}>
        <Bell className="icon" aria-hidden="true" />
        {unreadNotifications > 0 && <span className="icon-btn__dot" />}
      </button>
    </header>
  );
}
