import "server-only";
import type { GridEvent } from "@/components/TimeGrid/TimeGrid";
import { usesHalfCourt } from "@/lib/pricing";
import { toMinutes } from "@/lib/format";
import type { Now } from "@/lib/types";
import type { BookingDetail } from "./common";

/** Seansları takvim ızgarası etkinliklerine çevirir; sütun kimliği çağıran tarafından belirlenir */
export function toGridEvents(bookings: BookingDetail[], columnOf: (b: BookingDetail) => string, opts: { showCourt?: boolean; /** Verilirse planlanmış, gelecekteki seanslar sürüklenebilir işaretlenir */ movableAfter?: Now } = {}): GridEvent[] {
  return bookings.map((b) => {
    const title = b.kind === "group" ? (b.title ?? "Grup dersi") : b.members.map((m) => m.name).join(", ") || "Rezervasyon";
    const parts = [
      `${b.start}–${b.end}`,
      opts.showCourt ? b.court.name : null,
      b.kind === "group" ? `${b.members.length}/${b.capacity ?? 6}${b.level ? ` · ${b.level}` : ""}` : null,
      b.coach && !opts.showCourt ? b.coach.name : null,
      b.exclusive ? "paylaşımsız" : null,
    ].filter(Boolean);
    return {
      id: String(b.id),
      columnId: columnOf(b),
      start: b.start,
      end: b.end,
      kind: b.kind,
      title,
      sub: parts.join(" · "),
      href: `/seanslar/${b.id}`,
      live: b.status === "in_progress",
      unpaid: !b.paid && b.price > 0,
      half: usesHalfCourt({ kind: b.kind, exclusive: b.exclusive, memberCount: b.members.length }),
      series: !!b.seriesId,
      draggable:
        !!opts.movableAfter &&
        b.status === "scheduled" &&
        (b.date > opts.movableAfter.date || (b.date === opts.movableAfter.date && toMinutes(b.start) > toMinutes(opts.movableAfter.time))),
    };
  });
}

export function blockEvents(blocks: { id: number; courtId: number; start: string; end: string; reason: string }[], columnOf: (courtId: number) => string): GridEvent[] {
  return blocks.map((k) => ({
    id: `k${k.id}`,
    columnId: columnOf(k.courtId),
    start: k.start,
    end: k.end,
    kind: "block" as const,
    title: "Bakım",
    sub: `${k.start}–${k.end} · ${k.reason}`,
  }));
}
