import { Fragment, type ReactNode } from "react";
import { ConcealableValue } from "@/components/ConcealableValue/ConcealableValue";
import { DeltaBadge } from "@/components/DeltaBadge/DeltaBadge";
import type { CourtStatus, Delta, TextPart } from "@/lib/types";
import styles from "./KpiCard.module.css";

export type KpiVisual =
  | { type: "sparkline"; values: number[] }
  | { type: "occupancy"; states: CourtStatus[] };

interface KpiCardProps {
  label: string;
  value: string;
  aside?: string;
  delta: Delta;
  note: TextPart[];
  visual?: KpiVisual;
  /** Tutar göz ikonuyla gizlenebilir */
  concealable?: boolean;
}

const SPARK = { width: 96, pad: 2, top: 5.9, bottom: 24.9 };

function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const step = (SPARK.width - SPARK.pad * 2) / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => {
    const x = SPARK.pad + i * step;
    const y = SPARK.bottom - ((v - min) / range) * (SPARK.bottom - SPARK.top);
    return [+x.toFixed(1), +y.toFixed(1)] as const;
  });
  const [lx, ly] = points[points.length - 1];
  return (
    <svg className={styles.sparkline} viewBox="0 0 96 30" aria-hidden="true">
      <polyline points={points.map((p) => p.join(",")).join(" ")} />
      <circle cx={lx} cy={ly} r="4" />
    </svg>
  );
}

const OCCUPANCY_CLASS: Record<CourtStatus, string | undefined> = {
  busy: undefined,
  overtime: undefined,
  free: styles.isFree,
  maint: styles.isMaint,
};

function Occupancy({ states }: { states: CourtStatus[] }) {
  return (
    <span className={styles.occupancy} aria-hidden="true">
      {states.map((s, i) => (
        <i key={i} className={OCCUPANCY_CLASS[s]} />
      ))}
    </span>
  );
}

export function KpiCard({ label, value, aside, delta, note, visual, concealable }: KpiCardProps) {
  return (
    <article className={styles.kpi}>
      <h2 className={styles.label}>{label}</h2>
      <div className={styles.row}>
        <p className={styles.value}>
          {concealable ? <ConcealableValue value={value} label={label} /> : value}
          {aside && <span className={styles.aside}>{aside}</span>}
        </p>
        {visual?.type === "sparkline" && <Sparkline values={visual.values} />}
        {visual?.type === "occupancy" && <Occupancy states={visual.states} />}
      </div>
      <p className={styles.foot}>
        <DeltaBadge delta={delta} />
        <span>
          {note.map((part, i) =>
            <Fragment key={i}>{typeof part === "string" ? part : <span className="hide-mobile">{part.text}</span>}</Fragment>,
          )}
        </span>
      </p>
    </article>
  );
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <section className={styles.grid} aria-label="Günün özeti">
      {children}
    </section>
  );
}
