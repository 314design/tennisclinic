import Link from "next/link";
import type { CSSProperties } from "react";
import { fromMinutes } from "@/lib/clock";
import { environmentLabel } from "@/lib/courts";
import { toMinutes } from "@/lib/format";
import type { BookingDetail } from "@/server/queries/common";
import styles from "./DayCalendar.module.css";

interface DayCalendarProps {
  open: string;
  close: string;
  courts: { id: number; name: string; environment: "outdoor" | "indoor"; balloon: boolean }[];
  bookings: BookingDetail[];
  blocks: { id: number; courtId: number; start: string; end: string; reason: string }[];
  /** Bugünse şu anki saat çizgisi */
  nowTime?: string;
}

const SLOT_PX = 26; // 30 dakika
const KIND_CLASS = { group: styles.group, private: styles.private, reservation: styles.reservation };

export function DayCalendar({ open, close, courts, bookings, blocks, nowTime }: DayCalendarProps) {
  const startMin = toMinutes(open);
  const endMin = toMinutes(close);
  const hours = Array.from({ length: Math.ceil((endMin - startMin) / 60) }, (_, i) => startMin + i * 60);
  const pos = (start: string, end: string): CSSProperties => ({
    top: ((toMinutes(start) - startMin) / 30) * SLOT_PX,
    height: Math.max(((toMinutes(end) - toMinutes(start)) / 30) * SLOT_PX - 2, 22),
  });
  const height = ((endMin - startMin) / 30) * SLOT_PX;
  const nowTop = nowTime && toMinutes(nowTime) >= startMin && toMinutes(nowTime) <= endMin ? ((toMinutes(nowTime) - startMin) / 30) * SLOT_PX : null;

  return (
    <div className={styles.scroller}>
      <div className={styles.grid} style={{ gridTemplateColumns: `56px repeat(${courts.length}, minmax(150px, 1fr))` }}>
        <div className={styles.corner} />
        {courts.map((c) => (
          <div key={c.id} className={styles.courtHead}>
            <strong>{c.name}</strong>
            <span>{environmentLabel(c)}</span>
          </div>
        ))}

        <div className={styles.times} style={{ height }}>
          {hours.map((m) => (
            <span key={m} style={{ top: ((m - startMin) / 30) * SLOT_PX }}>{fromMinutes(m)}</span>
          ))}
        </div>

        {courts.map((c) => (
          <div key={c.id} className={styles.column} style={{ height, backgroundSize: `100% ${SLOT_PX * 2}px` }}>
            {blocks
              .filter((k) => k.courtId === c.id)
              .map((k) => (
                <div key={`k${k.id}`} className={`${styles.event} ${styles.block}`} style={pos(k.start, k.end)}>
                  <strong>Bakım</strong>
                  <span>{k.start}–{k.end} · {k.reason}</span>
                </div>
              ))}
            {bookings
              .filter((b) => b.courtId === c.id)
              .map((b) => {
                const title = b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", ") || "Rezervasyon";
                return (
                  <Link
                    key={b.id}
                    href={`/seanslar/${b.id}`}
                    className={`${styles.event} ${KIND_CLASS[b.kind]} ${b.status === "in_progress" ? styles.live : ""} ${!b.paid ? styles.unpaid : ""}`}
                    style={pos(b.start, b.end)}
                    title={`${b.start}–${b.end} · ${title}`}
                  >
                    <strong className="ellipsis">{title}</strong>
                    <span className="ellipsis">
                      {b.start}–{b.end}
                      {b.kind === "group" ? ` · ${b.members.length}/${b.capacity ?? 6}${b.level ? ` · ${b.level}` : ""}` : ""}
                      {b.coach ? ` · ${b.coach.name}` : ""}
                    </span>
                  </Link>
                );
              })}
            {nowTop !== null && <div className={styles.now} style={{ top: nowTop }} aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
