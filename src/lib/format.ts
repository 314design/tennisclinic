import type { ClockTime, Now, SeriesUnit } from "./types";

/* ---------- Saat ---------- */

export function toMinutes(time: ClockTime): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesBetween(from: ClockTime, to: ClockTime): number {
  return toMinutes(to) - toMinutes(from);
}

/* ---------- Türkçe ekler ----------
   Saat okunuşunun son kelimesine göre ek seçilir:
   18:00 → "on sekiz" → 18:00'e · 18:30 → "otuz" → 18:30'a · 19:00 → "on dokuz" → 19:00'da */

type Suffixes = { dative: string; locative: string; possessive: string };

const UNITS: Record<number, Suffixes> = {
  1: { dative: "e", locative: "de", possessive: "i" },
  2: { dative: "ye", locative: "de", possessive: "si" },
  3: { dative: "e", locative: "te", possessive: "ü" },
  4: { dative: "e", locative: "te", possessive: "ü" },
  5: { dative: "e", locative: "te", possessive: "i" },
  6: { dative: "ya", locative: "da", possessive: "sı" },
  7: { dative: "ye", locative: "de", possessive: "si" },
  8: { dative: "e", locative: "de", possessive: "i" },
  9: { dative: "a", locative: "da", possessive: "u" },
};

const TENS: Record<number, Suffixes> = {
  0: { dative: "a", locative: "da", possessive: "ı" },
  10: { dative: "a", locative: "da", possessive: "u" },
  20: { dative: "ye", locative: "de", possessive: "si" },
  30: { dative: "a", locative: "da", possessive: "u" },
  40: { dative: "a", locative: "ta", possessive: "ı" },
  50: { dative: "ye", locative: "de", possessive: "si" },
  60: { dative: "a", locative: "ta", possessive: "ı" },
  70: { dative: "e", locative: "te", possessive: "i" },
  80: { dative: "e", locative: "de", possessive: "i" },
  90: { dative: "a", locative: "da", possessive: "ı" },
};

function suffixesFor(n: number): Suffixes {
  const unit = n % 10;
  return unit ? UNITS[unit] : TENS[n % 100];
}

function lastSpoken(time: ClockTime): number {
  const [h, m] = time.split(":").map(Number);
  return m || h;
}

/** 18:00 → "18:00'e" */
export const toTime = (time: ClockTime) => `${time}'${suffixesFor(lastSpoken(time)).dative}`;
/** 19:00 → "19:00'da" */
export const atTime = (time: ClockTime) => `${time}'${suffixesFor(lastSpoken(time)).locative}`;
/** 6 → "6'sı" */
export const possessive = (n: number) => `${n}'${suffixesFor(n).possessive}`;

/* ---------- Sayı & tarih ---------- */

const numberTr = new Intl.NumberFormat("tr-TR");

export const formatCurrency = (v: number) => `₺${numberTr.format(v)}`;
export const formatPercent = (v: number) => `%${v}`;
export const formatValue = (v: number, unit: SeriesUnit) =>
  unit === "currency" ? formatCurrency(v) : formatPercent(v);

/** Eksen etiketi: 80000 → "₺80 bin", 100 → "%100" */
export function formatTick(v: number, unit: SeriesUnit): string {
  if (unit === "percent") return formatPercent(v);
  if (v === 0) return "₺0";
  return v >= 1000 ? `₺${numberTr.format(v / 1000)} bin` : formatCurrency(v);
}

// Tarihler saat diliminden bağımsız biçimlensin diye UTC gece yarısı olarak kurulur.
const dateOf = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** "28 Eylül 2026 · Pazartesi" */
export function formatLongDate(now: Now): string {
  const d = dateOf(now.date);
  const date = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  const weekday = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" }).format(d);
  return `${date} · ${weekday}`;
}

/** "28 Eylül" */
export function formatDayMonth(now: Now): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" }).format(dateOf(now.date));
}

/** "5 dk önce", "2 sa önce" */
export function formatRelative(iso: string, now: Now): string {
  const [date, time] = iso.split("T");
  const days = Math.round((dateOf(now.date).getTime() - dateOf(date).getTime()) / 86_400_000);
  const diff = days * 1440 + minutesBetween(time.slice(0, 5), now.time);
  if (diff < 1) return "az önce";
  if (diff < 60) return `${diff} dk önce`;
  if (diff < 1440) return `${Math.floor(diff / 60)} sa önce`;
  return `${Math.floor(diff / 1440)} gün önce`;
}
