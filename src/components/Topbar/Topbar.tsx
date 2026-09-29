import { Bell, Plus, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/Icon/Icon";
import { WeatherWidget } from "@/components/WeatherWidget/WeatherWidget";
import type { Weather } from "@/lib/types";
import styles from "./Topbar.module.css";

interface TopbarProps {
  unreadNotifications: number;
  weather: Weather | null;
}

export function Topbar({ unreadNotifications, weather }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <form className={styles.search} action="/uyeler" role="search">
        <Search className="icon" aria-hidden="true" />
        <input type="search" name="q" placeholder="Üye, kort veya rezervasyon ara" aria-label="Ara" />
        <kbd>⌘K</kbd>
      </form>
      <span className={styles.spacer} />
      <Link className={`btn ${styles.quiet}`} href="/uyeler/yeni">
        <UserPlus className="icon" aria-hidden="true" />
        <span className={styles.label}>Üye Ekle</span>
      </Link>
      <Link className={`btn ${styles.quiet}`} href="/dersler/yeni">
        <Icon name="whistle" />
        <span className={styles.label}>Ders Planla</span>
      </Link>
      <Link className="btn btn--primary" href="/rezervasyonlar/yeni">
        <Plus className="icon" aria-hidden="true" />
        Yeni Rezervasyon
      </Link>
      <span className={styles.divider} aria-hidden="true" />
      <WeatherWidget weather={weather} />
      <button className="icon-btn" type="button" aria-label={`Bildirimler, ${unreadNotifications} yeni`}>
        <Bell className="icon" aria-hidden="true" />
        {unreadNotifications > 0 && <span className="icon-btn__dot" />}
      </button>
    </header>
  );
}
