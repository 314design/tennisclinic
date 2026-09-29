import { ActivityFeed } from "@/components/ActivityFeed/ActivityFeed";
import { AlertItem } from "@/components/AlertItem/AlertItem";
import type { Activity, Alert, Now } from "@/lib/types";
import styles from "./AttentionCard.module.css";

interface AttentionCardProps {
  alerts: Alert[];
  activities: Activity[];
  now: Now;
}

export function AttentionCard({ alerts, activities, now }: AttentionCardProps) {
  return (
    <section className={`card ${styles.attention}`} aria-labelledby="attention-title">
      <header className="card__title-row">
        <h2 className="card__title" id="attention-title">Dikkat gerektirenler</h2>
        <span className={styles.count}>{alerts.length}</span>
      </header>
      <ul className={styles.list}>
        {alerts.map((a) => (
          <AlertItem key={a.id} alert={a} />
        ))}
      </ul>
      <ActivityFeed items={activities} now={now} />
    </section>
  );
}
