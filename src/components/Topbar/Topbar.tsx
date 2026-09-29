import { Bell, Plus, Search, UserPlus } from "lucide-react";
import { Icon } from "@/components/Icon/Icon";
import styles from "./Topbar.module.css";

interface TopbarProps {
  unreadNotifications: number;
}

export function Topbar({ unreadNotifications }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <label className={styles.search}>
        <Search className="icon" aria-hidden="true" />
        <input type="search" name="q" placeholder="Üye, kort veya rezervasyon ara" aria-label="Ara" />
        <kbd>⌘K</kbd>
      </label>
      <span className={styles.spacer} />
      <button className={`btn ${styles.quiet}`} type="button">
        <UserPlus className="icon" aria-hidden="true" />
        <span className={styles.label}>Üye Ekle</span>
      </button>
      <button className={`btn ${styles.quiet}`} type="button">
        <Icon name="whistle" />
        <span className={styles.label}>Ders Planla</span>
      </button>
      <button className="btn btn--primary" type="button">
        <Plus className="icon" aria-hidden="true" />
        Yeni Rezervasyon
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button className="icon-btn" type="button" aria-label={`Bildirimler, ${unreadNotifications} yeni`}>
        <Bell className="icon" aria-hidden="true" />
        {unreadNotifications > 0 && <span className="icon-btn__dot" />}
      </button>
    </header>
  );
}
