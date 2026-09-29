"use client";

import { ArrowUpRight } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { formatTick, formatValue } from "@/lib/format";
import type { ChartSeries, ClockTime, RevenueData } from "@/lib/types";
import styles from "./RevenueChart.module.css";

interface RevenueChartProps {
  data: RevenueData;
  time: ClockTime;
}

function summaryOf(s: ChartSeries): string {
  const sum = s.values.reduce((a, b) => a + b, 0);
  if (s.summary === "sum") return formatValue(sum, s.unit);
  return `${formatValue(Math.round(sum / s.values.length), s.unit)} ortalama`;
}

export function RevenueChart({ data, time }: RevenueChartProps) {
  const [key, setKey] = useState(data.series[0].key);
  const series = data.series.find((s) => s.key === key) ?? data.series[0];

  const last = series.values.length - 1;
  const past = series.values.slice(0, last);
  const peak = past.indexOf(Math.max(...past));
  const ticks = [series.max, series.max / 2, 0].map((v) => formatTick(v, series.unit));

  return (
    <section className="card" aria-labelledby="revenue-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="revenue-title">{series.title}</h2>
          <p className="card__meta">
            {data.rangeLabel}
            <span className="hide-mobile"> · bugün {time} itibarıyla</span>
          </p>
        </div>
        <div className={styles.segmented}>
          {data.series.map((s) => (
            <button key={s.key} type="button" aria-pressed={s.key === key} onClick={() => setKey(s.key)}>
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.summary}>
        <span className={styles.total}>{summaryOf(series)}</span>
        <span className="delta">
          <ArrowUpRight className="icon icon--xs" aria-hidden="true" />
          <span>{series.delta}</span>
        </span>
        <span className={styles.compare}>önceki 7 güne göre</span>
      </div>

      <div className={styles.chart}>
        <div className={styles.y} aria-hidden="true">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <div className={styles.plot}>
          <ol className={styles.bars}>
            {series.values.map((v, i) => {
              const value = formatValue(v, series.unit);
              const day = data.days[i];
              const classes = [styles.bar, i === last && styles.today, (i === peak || i === last) && styles.labelled];
              return (
                <li
                  key={day.long}
                  className={classes.filter(Boolean).join(" ")}
                  style={{ "--h": `${((v / series.max) * 100).toFixed(1)}%` } as CSSProperties}
                  tabIndex={0}
                  aria-label={`${day.long}: ${value}`}
                >
                  <span className={styles.value}>{value}</span>
                  <span className={styles.fill} />
                </li>
              );
            })}
          </ol>
        </div>
        <div className={styles.days} aria-hidden="true">
          {data.days.map((d, i) => (
            <span key={d.long} className={i === last ? styles.isToday : undefined}>
              {d.short}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
