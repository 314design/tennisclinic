import Link from "next/link";
import { formatRelative } from "@/lib/format";
import type { Activity, Now } from "@/lib/types";
import styles from "./ActivityFeed.module.css";

interface ActivityFeedProps {
  items: Activity[];
  now: Now;
}

export function ActivityFeed({ items, now }: ActivityFeedProps) {
  return (
    <div className={styles.activity}>
      <div className={styles.head}>
        <h3>Son hareketler</h3>
        <Link href="/uyeler">Tümü</Link>
      </div>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.id}>
            <span className={`${styles.dot} ${item.tone === "danger" ? styles.dotDanger : ""}`} />
            <span className={`${styles.text} ellipsis`}>
              <strong>{item.name}</strong> {item.text}
            </span>
            <time dateTime={item.at}>{formatRelative(item.at, now)}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}
