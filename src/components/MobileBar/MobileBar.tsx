import { Bell, ChevronDown, Search } from "lucide-react";
import { BrandMark } from "@/components/BrandMark/BrandMark";
import type { Club } from "@/lib/types";
import styles from "./MobileBar.module.css";

interface MobileBarProps {
  club: Club;
  unreadNotifications: number;
}

export function MobileBar({ club, unreadNotifications }: MobileBarProps) {
  return (
    <header className={styles.bar}>
      <BrandMark className={styles.mark} />
      <button className={styles.club} type="button" aria-label={`Şube değiştir: ${club.branch}`}>
        <span className={styles.name}>{club.name}</span>
        <span className={styles.branch}>
          {club.branch} <ChevronDown className="icon icon--sm" aria-hidden="true" />
        </span>
      </button>
      <button className={`icon-btn ${styles.iconBtn}`} type="button" aria-label="Ara">
        <Search className="icon" aria-hidden="true" />
      </button>
      <button className={`icon-btn ${styles.iconBtn}`} type="button" aria-label={`Bildirimler, ${unreadNotifications} yeni`}>
        <Bell className="icon" aria-hidden="true" />
        {unreadNotifications > 0 && <span className="icon-btn__dot" />}
      </button>
    </header>
  );
}
