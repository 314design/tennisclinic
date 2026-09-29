"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type MouseEvent } from "react";
import { fromMinutes } from "@/lib/clock";
import { toMinutes } from "@/lib/format";
import styles from "./TimeGrid.module.css";

export type GridEventKind = "group" | "private" | "reservation" | "block";

export interface GridColumn {
  id: string;
  title: string;
  subtitle?: string;
  /** Tıklanamayan (kapalı/çalışma dışı) aralıklar */
  unavailable?: { start: string; end: string }[];
  /** Şu anki saat çizgisi gösterilecek sütun */
  now?: boolean;
}

export interface GridEvent {
  id: string;
  columnId: string;
  start: string;
  end: string;
  kind: GridEventKind;
  title: string;
  sub?: string;
  href?: string;
  live?: boolean;
  unpaid?: boolean;
  /** 1 kişilik paylaşımlı özel ders: aynı sütunda çakışınca yan yana çizilir */
  half?: boolean;
}

interface PickMode {
  /** Seçilecek süre (dk) */
  duration: number;
  canStart: (columnId: string, start: string) => boolean;
  onPick: (columnId: string, start: string) => void;
  selected?: { columnId: string; start: string } | null;
}

interface TimeGridProps {
  open: string;
  close: string;
  columns: GridColumn[];
  events: GridEvent[];
  nowTime?: string;
  /** Boş alana tıklayınca gidilecek adres; {col} ve {time} yer tutucuları doldurulur */
  emptyHref?: string;
  pick?: PickMode;
  minColumnWidth?: number;
}

const SLOT = 30;
const SLOT_PX = 26;
const KIND_CLASS: Record<GridEventKind, string> = {
  group: styles.group,
  private: styles.private,
  reservation: styles.reservation,
  block: styles.block,
};

function lanes(events: GridEvent[]) {
  const map = new Map<string, 0 | 1>();
  const half = events.filter((e) => e.half);
  for (const e of half) {
    const others = half.filter((o) => o.id !== e.id && o.columnId === e.columnId && toMinutes(o.start) < toMinutes(e.end) && toMinutes(e.start) < toMinutes(o.end));
    if (!others.length) continue;
    const taken = others.map((o) => map.get(o.id)).filter((x) => x !== undefined);
    map.set(e.id, taken.includes(0) ? 1 : 0);
  }
  return map;
}

export function TimeGrid({ open, close, columns, events, nowTime, emptyHref, pick, minColumnWidth = 150 }: TimeGridProps) {
  const router = useRouter();
  const [hover, setHover] = useState<{ columnId: string; start: string } | null>(null);
  const openMin = toMinutes(open);
  const closeMin = toMinutes(close);
  const height = ((closeMin - openMin) / SLOT) * SLOT_PX;
  const hours = Array.from({ length: Math.ceil((closeMin - openMin) / 60) }, (_, i) => openMin + i * 60);
  const laneMap = lanes(events);
  const duration = pick?.duration ?? 60;

  const top = (t: string) => ((toMinutes(t) - openMin) / SLOT) * SLOT_PX;
  const pos = (start: string, end: string): CSSProperties => ({
    top: top(start),
    height: Math.max(((toMinutes(end) - toMinutes(start)) / SLOT) * SLOT_PX - 2, 20),
  });

  const slotAt = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const m = openMin + Math.floor((e.clientY - rect.top) / SLOT_PX) * SLOT;
    return m >= openMin && m + SLOT <= closeMin ? fromMinutes(m) : null;
  };

  const isUnavailable = (col: GridColumn, start: string) => {
    const s = toMinutes(start);
    const e = s + duration;
    if (e > closeMin) return true;
    return (col.unavailable ?? []).some((u) => s < toMinutes(u.end) && toMinutes(u.start) < e);
  };

  const interactive = !!(emptyHref || pick);
  const ok = (col: GridColumn, start: string) => (pick ? pick.canStart(col.id, start) : !isUnavailable(col, start));

  const onClick = (col: GridColumn, e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const start = slotAt(e);
    if (!start || !ok(col, start)) return;
    if (pick) pick.onPick(col.id, start);
    else if (emptyHref) router.push(emptyHref.replace("{col}", encodeURIComponent(col.id)).replace("{time}", start));
  };

  return (
    <div className={styles.scroller}>
      <div className={styles.grid} style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))` }}>
        <div className={styles.corner} />
        {columns.map((c) => (
          <div key={c.id} className={styles.head}>
            <strong>{c.title}</strong>
            {c.subtitle && <span>{c.subtitle}</span>}
          </div>
        ))}

        <div className={styles.times} style={{ height }}>
          {hours.map((m) => (
            <span key={m} style={{ top: ((m - openMin) / SLOT) * SLOT_PX }}>{fromMinutes(m)}</span>
          ))}
        </div>

        {columns.map((col) => {
          const hoverHere = hover?.columnId === col.id ? hover.start : null;
          const selectedHere = pick?.selected?.columnId === col.id ? pick.selected.start : null;
          return (
            <div
              key={col.id}
              className={`${styles.column} ${interactive ? styles.interactive : ""}`}
              style={{ height, backgroundSize: `100% ${SLOT_PX * 2}px` }}
              onClick={(e) => onClick(col, e)}
              onMouseMove={(e) => {
                if (!interactive || (e.target as HTMLElement).closest("a")) return setHover(null);
                const start = slotAt(e);
                setHover(start ? { columnId: col.id, start } : null);
              }}
              onMouseLeave={() => setHover(null)}
            >
              {(col.unavailable ?? []).map((u, i) => (
                <div key={`u${i}`} className={styles.unavailable} style={pos(u.start, u.end)} aria-hidden="true" />
              ))}

              {events
                .filter((ev) => ev.columnId === col.id)
                .map((ev) => {
                  const lane = laneMap.get(ev.id);
                  const laneStyle: CSSProperties = lane === undefined ? {} : lane === 0 ? { right: "50%" } : { left: "50%" };
                  const cls = `${styles.event} ${KIND_CLASS[ev.kind]} ${ev.live ? styles.live : ""} ${ev.unpaid ? styles.unpaid : ""}`;
                  const body = (
                    <>
                      <strong className="ellipsis">{ev.title}</strong>
                      {ev.sub && <span className="ellipsis">{ev.sub}</span>}
                    </>
                  );
                  return ev.href ? (
                    <Link key={ev.id} href={ev.href} className={cls} style={{ ...pos(ev.start, ev.end), ...laneStyle }} title={`${ev.start}–${ev.end} · ${ev.title}${ev.sub ? ` · ${ev.sub}` : ""}`}>
                      {body}
                    </Link>
                  ) : (
                    <div key={ev.id} className={cls} style={{ ...pos(ev.start, ev.end), ...laneStyle }} title={`${ev.start}–${ev.end} · ${ev.title}`}>
                      {body}
                    </div>
                  );
                })}

              {selectedHere && (
                <div className={`${styles.ghost} ${styles.selected}`} style={pos(selectedHere, fromMinutes(toMinutes(selectedHere) + duration))}>
                  <strong>{selectedHere}–{fromMinutes(toMinutes(selectedHere) + duration)}</strong>
                  <span>Seçildi</span>
                </div>
              )}
              {hoverHere && hoverHere !== selectedHere && (
                <div
                  className={`${styles.ghost} ${ok(col, hoverHere) ? styles.ghostOk : styles.ghostBad}`}
                  style={pos(hoverHere, fromMinutes(Math.min(toMinutes(hoverHere) + duration, closeMin)))}
                  aria-hidden="true"
                >
                  {ok(col, hoverHere) ? (
                    <>
                      <strong><Plus className="icon icon--xs" aria-hidden="true" /> {hoverHere}</strong>
                      <span>{pick ? "Seç" : "Yeni rezervasyon"}</span>
                    </>
                  ) : (
                    <span>Uygun değil</span>
                  )}
                </div>
              )}
              {col.now && nowTime && toMinutes(nowTime) >= openMin && toMinutes(nowTime) <= closeMin && (
                <div className={styles.now} style={{ top: top(nowTime) }} aria-hidden="true" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function GridLegend() {
  return (
    <ul className={styles.legend}>
      <li><i className={styles.group} />Grup dersi</li>
      <li><i className={styles.private} />Özel ders</li>
      <li><i className={styles.reservation} />Kort kiralama</li>
      <li><i className={styles.unpaidSwatch} />Ödenmedi</li>
      <li><i className={styles.block} />Bakım / kapalı</li>
    </ul>
  );
}
