"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
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
  /** Sürükle-bırak ile taşınabilir (planlanmış, gelecekteki seans) */
  draggable?: boolean;
  /** Haftalık sabit serinin bir dersi */
  series?: boolean;
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
  /** Taşınabilir bir seans başka saate/sütuna bırakıldığında */
  onMove?: (event: GridEvent, columnId: string, start: string) => void;
}

interface DragState {
  event: GridEvent;
  columnId: string;
  start: string;
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

const DRAG_THRESHOLD = 6;
const LONG_PRESS_MS = 350;

export function TimeGrid({ open, close, columns, events, nowTime, emptyHref, pick, minColumnWidth = 150, onMove }: TimeGridProps) {
  const router = useRouter();
  const [hover, setHover] = useState<{ columnId: string; start: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const columnRefs = useRef(new Map<string, HTMLDivElement>());
  /** Sürükleme bitince bağlantının tıklanmasını engeller */
  const suppressClick = useRef(false);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanup.current?.(), []);
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

  /** Seansı tutup sürükleme: fare ile hemen, dokunmatikte basılı tutunca başlar */
  const startDrag = (ev: GridEvent, e: ReactPointerEvent<HTMLElement>) => {
    if (!onMove || !ev.draggable || (e.pointerType === "mouse" && e.button !== 0)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const length = toMinutes(ev.end) - toMinutes(ev.start);
    const grab = Math.floor((e.clientY - rect.top) / SLOT_PX) * SLOT;
    const origin = { x: e.clientX, y: e.clientY };
    const touch = e.pointerType !== "mouse";
    let active = !touch;
    let moved = false;
    let last: DragState | null = null;

    const target = (x: number, y: number): DragState | null => {
      let best: { id: string; rect: DOMRect } | null = null;
      for (const [id, el] of columnRefs.current) {
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right) best = { id, rect: r };
      }
      if (!best) return last;
      const raw = openMin + Math.floor((y - best.rect.top) / SLOT_PX) * SLOT - grab;
      const m = Math.max(openMin, Math.min(raw, closeMin - length));
      return { event: ev, columnId: best.id, start: fromMinutes(m) };
    };
    const onMoveEvt = (me: PointerEvent) => {
      const dist = Math.hypot(me.clientX - origin.x, me.clientY - origin.y);
      if (!active) {
        if (dist > DRAG_THRESHOLD) finish(false);
        return;
      }
      if (!moved && dist < DRAG_THRESHOLD) return;
      moved = true;
      last = target(me.clientX, me.clientY);
      setDrag(last);
    };
    const blockScroll = (te: TouchEvent) => active && te.preventDefault();
    const timer = touch ? window.setTimeout(() => { active = true; setDrag({ event: ev, columnId: ev.columnId, start: ev.start }); }, LONG_PRESS_MS) : 0;
    const finish = (commit: boolean) => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", onMoveEvt);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", blockScroll);
      cleanup.current = null;
      if (active && (moved || touch)) {
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 0);
      }
      setDrag(null);
      if (commit && last && (last.columnId !== ev.columnId || last.start !== ev.start)) onMove(ev, last.columnId, last.start);
    };
    const onUp = () => finish(moved);
    const onCancel = () => finish(false);
    window.addEventListener("pointermove", onMoveEvt);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", blockScroll, { passive: false });
    cleanup.current = () => finish(false);
  };

  const interactive = !!(emptyHref || pick);
  const ok = (col: GridColumn, start: string) => (pick ? pick.canStart(col.id, start) : !isUnavailable(col, start));

  const onClick = (col: GridColumn, e: MouseEvent<HTMLDivElement>) => {
    if (suppressClick.current || (e.target as HTMLElement).closest("a")) return;
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
              ref={(el) => {
                if (el) columnRefs.current.set(col.id, el);
                else columnRefs.current.delete(col.id);
              }}
              className={`${styles.column} ${interactive ? styles.interactive : ""}`}
              style={{ height, backgroundSize: `100% ${SLOT_PX * 2}px` }}
              onClick={(e) => onClick(col, e)}
              onMouseMove={(e) => {
                if (!interactive || drag || (e.target as HTMLElement).closest("a")) return setHover(null);
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
                  const movable = !!onMove && ev.draggable;
                  const cls = `${styles.event} ${KIND_CLASS[ev.kind]} ${ev.live ? styles.live : ""} ${ev.unpaid ? styles.unpaid : ""} ${movable ? styles.movable : ""} ${drag?.event.id === ev.id ? styles.dragging : ""}`;
                  const dragProps = movable
                    ? {
                        draggable: false,
                        onPointerDown: (e: ReactPointerEvent<HTMLElement>) => startDrag(ev, e),
                        onClickCapture: (e: MouseEvent) => {
                          if (suppressClick.current) {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        },
                        onContextMenu: (e: MouseEvent) => e.preventDefault(),
                      }
                    : {};
                  const body = (
                    <>
                      <strong className="ellipsis">{ev.title}</strong>
                      {ev.sub && <span className="ellipsis">{ev.sub}</span>}
                    </>
                  );
                  return ev.href ? (
                    <Link key={ev.id} href={ev.href} className={cls} style={{ ...pos(ev.start, ev.end), ...laneStyle }} title={`${ev.start}–${ev.end} · ${ev.title}${ev.sub ? ` · ${ev.sub}` : ""}${movable ? " · taşımak için sürükleyin" : ""}`} {...dragProps}>
                      {body}
                    </Link>
                  ) : (
                    <div key={ev.id} className={cls} style={{ ...pos(ev.start, ev.end), ...laneStyle }} title={`${ev.start}–${ev.end} · ${ev.title}`}>
                      {body}
                    </div>
                  );
                })}

              {drag?.columnId === col.id && (
                <div className={`${styles.ghost} ${styles.dropGhost}`} style={pos(drag.start, fromMinutes(toMinutes(drag.start) + toMinutes(drag.event.end) - toMinutes(drag.event.start)))} aria-hidden="true">
                  <strong>{drag.start}–{fromMinutes(toMinutes(drag.start) + toMinutes(drag.event.end) - toMinutes(drag.event.start))}</strong>
                  <span className="ellipsis">{drag.event.title}</span>
                </div>
              )}
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
