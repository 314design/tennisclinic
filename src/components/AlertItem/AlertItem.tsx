import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Icon } from "@/components/Icon/Icon";
import type { Alert } from "@/lib/types";
import styles from "./AlertItem.module.css";

const TONE_CLASS: Record<Alert["tone"], string> = {
  warn: styles.warn,
  ok: styles.ok,
  neutral: styles.neutral,
  sage: styles.sage,
};

export function AlertItem({ alert }: { alert: Alert }) {
  return (
    <li>
      <Link className={styles.alert} href={alert.href}>
        <span className={`${styles.icon} ${TONE_CLASS[alert.tone]}`}>
          <Icon name={alert.icon} />
        </span>
        <span className={styles.text}>
          <strong>{alert.title}</strong>
          <span className="ellipsis">{alert.detail}</span>
        </span>
        <span className={styles.action}>{alert.action}</span>
        <ChevronRight className={`icon ${styles.chev}`} aria-hidden="true" />
      </Link>
    </li>
  );
}
