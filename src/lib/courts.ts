import { atTime, minutesBetween, toMinutes, toTime } from "./format";
import type { BookingKind, ClockTime, Court, CourtBooking, CourtStatus, IconName } from "./types";

/** Seans bu kadar dakikadan yeni başladıysa "Yeni başladı" yazılır. */
const JUST_STARTED_MIN = 5;
/** Yeni başlayan seansın ilerleme çubuğu görünür kalsın diye asgari doluluk. */
const MIN_PROGRESS = 4;

export const BOOKING_KIND: Record<BookingKind, { label: string; icon: IconName }> = {
  private: { label: "Özel ders", icon: "whistle" },
  reservation: { label: "Rezervasyon", icon: "user-round" },
  group: { label: "Grup dersi", icon: "users-round" },
};

export const FORMAT_LABEL = { singles: "Tekler", doubles: "Çiftler" } as const;

export interface CourtFigure {
  x: number;
  y: number;
  role: "player" | "coach";
}

export interface CourtView {
  status: CourtStatus;
  kind?: BookingKind;
  who: string;
  sub: string;
  /** "17:00–18:00" */
  range?: string;
  /** 0–100 */
  progress?: number;
  /** Masaüstü alt satır: "30 dk kaldı", "Yeni başladı", "Süre doldu" */
  remaining?: string;
  /** Mobil başlıktaki kısa etiket: "30 dk", "19:00", "Süre doldu" */
  short?: string;
  figures: CourtFigure[];
  /** Müsait kortun boş kalacağı süre (dk) */
  freeMinutes?: number;
  freeUntil?: ClockTime;
}

const isBetween = (now: ClockTime, start: ClockTime, end: ClockTime) =>
  toMinutes(start) <= toMinutes(now) && toMinutes(now) < toMinutes(end);

export function courtStatus(court: Court, now: ClockTime): CourtStatus {
  const m = court.maintenance;
  if (m && isBetween(now, m.start, m.end)) return "maint";
  if (!court.occupant || toMinutes(now) < toMinutes(court.occupant.start)) return "free";
  return toMinutes(now) >= toMinutes(court.occupant.end) ? "overtime" : "busy";
}

/** Kort görselindeki oyuncu/antrenör yerleşimi (44×92 kort, üst yarı 0–46). */
function figuresFor(b: CourtBooking): CourtFigure[] {
  const p = (x: number, y: number): CourtFigure => ({ x, y, role: "player" });
  const c = (x: number, y: number): CourtFigure => ({ x, y, role: "coach" });
  switch (b.kind) {
    case "private":
      return [p(22, 10), c(22, 82)];
    case "reservation":
      return b.format === "doubles"
        ? [p(12, 10), p(32, 10), p(12, 82), p(32, 82)]
        : [p(22, 10), p(22, 82)];
    case "group": {
      const size = Math.min(b.groupSize ?? 0, 6);
      const xs = size > 4 ? [10, 22, 34] : [12, 32];
      const players = Array.from({ length: size }, (_, i) => p(xs[i % xs.length], i < xs.length ? 10 : 31));
      return [...players, c(22, 78)];
    }
  }
}

function describe(b: CourtBooking): { who: string; sub: string } {
  switch (b.kind) {
    case "private":
      return { who: b.members?.join(", ") ?? "", sub: `Ant. ${b.coach}` };
    case "reservation": {
      const format = b.format ?? "singles";
      return {
        who: b.members?.join(", ") ?? "",
        sub: `${FORMAT_LABEL[format]} · ${format === "doubles" ? 4 : 2} oyuncu`,
      };
    }
    case "group":
      return { who: `${b.groupName} · ${b.groupSize} kişi`, sub: `Ant. ${b.coach}` };
  }
}

const progressOf = (start: ClockTime, end: ClockTime, now: ClockTime) =>
  Math.round((minutesBetween(start, now) / minutesBetween(start, end)) * 100);

export function getCourtView(court: Court, now: ClockTime): CourtView {
  const status = courtStatus(court, now);

  if (status === "maint" && court.maintenance) {
    const { start, end, reason } = court.maintenance;
    const left = minutesBetween(now, end);
    return {
      status,
      who: reason,
      sub: `${atTime(end)} açılacak`,
      range: `${start}–${end}`,
      progress: progressOf(start, end, now),
      remaining: `${left} dk kaldı`,
      short: end,
      figures: [],
    };
  }

  if (status === "free") {
    const next = court.next;
    return {
      status,
      who: next ? `${toTime(next.start)} kadar boş` : "Gün sonuna kadar boş",
      sub: next ? `Sıradaki: ${next.member}` : "Sıradaki rezervasyon yok",
      figures: [],
      freeUntil: next?.start,
      freeMinutes: next ? minutesBetween(now, next.start) : undefined,
    };
  }

  const b = court.occupant!;
  const described = describe(b);
  // Paylaşımlı kortta ikinci ders ve paylaşımsız ders alt satırda belirtilir
  if (court.sharedWith) described.sub = `Paylaşımlı · ${court.sharedWith}`;
  else if (b.exclusive) described.sub = `${described.sub} · paylaşımsız`;
  const base = { kind: b.kind, range: `${b.start}–${b.end}`, figures: figuresFor(b), ...described };

  if (status === "overtime") {
    return { ...base, status, progress: 100, remaining: "Süre doldu", short: "Süre doldu" };
  }

  const elapsed = minutesBetween(b.start, now);
  const left = minutesBetween(now, b.end);
  return {
    ...base,
    status,
    progress: Math.max(progressOf(b.start, b.end, now), MIN_PROGRESS),
    remaining: elapsed < JUST_STARTED_MIN ? "Yeni başladı" : `${left} dk kaldı`,
    short: `${left} dk`,
  };
}

export interface CourtCounts {
  total: number;
  /** Dolu = kullanımda + süresi dolmuş */
  busy: number;
  free: number;
  maint: number;
}

export function countCourts(statuses: CourtStatus[]): CourtCounts {
  return {
    total: statuses.length,
    busy: statuses.filter((s) => s === "busy" || s === "overtime").length,
    free: statuses.filter((s) => s === "free").length,
    maint: statuses.filter((s) => s === "maint").length,
  };
}

/** Kort ortamı etiketi: Açık · Kapalı · Balon */
export function environmentLabel(court: { environment: "outdoor" | "indoor"; balloon: boolean }): string {
  if (court.environment === "indoor") return "Kapalı";
  return court.balloon ? "Balon" : "Açık";
}

/** Yağmurdan etkilenen kort: balonla kapatılmamış açık kort */
export const isOpenAir = (court: { environment: "outdoor" | "indoor"; balloon: boolean }) =>
  court.environment === "outdoor" && !court.balloon;
