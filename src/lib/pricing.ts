/**
 * Özel ders fiyatlandırması. Fiyatlar grubun toplam paket ücretidir (kişi başı değil).
 * Sakin saat: hafta içi, ders tamamen `offpeak` aralığındaysa (varsayılan 10:00–16:00).
 * Yoğun saat: hafta içi diğer saatler ve hafta sonu.
 * Paylaşımsız kort farkı seans başına eklenir.
 */
import { weekdayOf } from "./clock";
import { toMinutes } from "./format";

export type PriceBand = "offpeak" | "peak";
export type PackageSize = "8" | "16";

/** Kişi sayısı sütunları: 1, 2, 3, 4–5 */
export const PEOPLE_COLUMNS = ["1 kişi", "2 kişi", "3 kişi", "4–5 kişi"] as const;
export const PACKAGE_SIZES: PackageSize[] = ["8", "16"];
export const MAX_PRIVATE_PEOPLE = 5;

export interface PriceListData {
  offpeak: { start: string; end: string };
  /** Paylaşımsız kort farkı (₺, seans başına) */
  exclusiveSurcharge: number;
  /** Paket toplam fiyatları: band → paket seans sayısı → [1, 2, 3, 4–5 kişi] */
  packages: Record<PriceBand, Record<PackageSize, [number, number, number, number]>>;
  /** Kort kiralama saatlik ücreti (₺) */
  rentalHourly: Record<PriceBand, number>;
  /** Grup dersi kişi başı seans ücreti (₺) */
  groupPerPerson: number;
  /** Paket / ders kotası geçerlilik süresi (gün): 8 ve 16 seans */
  validityDays: Record<PackageSize, number>;
}

export interface PriceList extends PriceListData {
  id?: number;
  effectiveFrom: string;
}

export const BAND_LABEL: Record<PriceBand, string> = {
  offpeak: "Hafta içi sakin saat",
  peak: "Yoğun saat / hafta sonu",
};

/** 4.4.2026 tarihli fiyat tablosu; 16 seanslık paketler varsayılan olarak 8'liğin iki katı */
export const DEFAULT_PRICE_LIST: PriceList = {
  effectiveFrom: "2026-04-04",
  offpeak: { start: "10:00", end: "16:00" },
  exclusiveSurcharge: 700,
  packages: {
    offpeak: { "8": [18400, 22400, 26400, 31200], "16": [36800, 44800, 52800, 62400] },
    peak: { "8": [22400, 28000, 33600, 38400], "16": [44800, 56000, 67200, 76800] },
  },
  rentalHourly: { offpeak: 900, peak: 1200 },
  groupPerPerson: 600,
  validityDays: { "8": 60, "16": 120 },
};

/** Eski kayıtlarda olmayan alanları varsayılanlarla tamamlar */
export function withDefaults(data: Partial<PriceListData>): PriceListData {
  return {
    offpeak: data.offpeak ?? DEFAULT_PRICE_LIST.offpeak,
    exclusiveSurcharge: data.exclusiveSurcharge ?? DEFAULT_PRICE_LIST.exclusiveSurcharge,
    packages: data.packages ?? DEFAULT_PRICE_LIST.packages,
    rentalHourly: data.rentalHourly ?? DEFAULT_PRICE_LIST.rentalHourly,
    groupPerPerson: data.groupPerPerson ?? DEFAULT_PRICE_LIST.groupPerPerson,
    validityDays: data.validityDays ?? DEFAULT_PRICE_LIST.validityDays,
  };
}

/** Kort kiralama ücreti: saatlik ücret × süre (saat bandına göre) */
export function rentalPrice(list: PriceListData, band: PriceBand, minutes: number): number {
  return Math.round((list.rentalHourly[band] * minutes) / 60);
}

/** Grup dersi ücreti: kişi başı seans ücreti × öğrenci sayısı */
export function groupLessonPrice(list: PriceListData, people: number): number {
  return list.groupPerPerson * people;
}

/** Ders kotasının geçerlilik süresi (gün); 8/16 dışındaki kotalar orantılı hesaplanır */
export function validityFor(list: PriceListData, sessions: number): number {
  if (sessions <= 0) return 0;
  if (sessions === 16) return list.validityDays["16"];
  if (sessions === 8) return list.validityDays["8"];
  return Math.round((sessions / 8) * list.validityDays["8"]);
}

export function bandFor(list: Pick<PriceListData, "offpeak">, date: string, start: string, end: string): PriceBand {
  const weekday = weekdayOf(date);
  const inWindow = toMinutes(start) >= toMinutes(list.offpeak.start) && toMinutes(end) <= toMinutes(list.offpeak.end);
  return weekday <= 5 && inWindow ? "offpeak" : "peak";
}

const column = (people: number) => Math.min(Math.max(people, 1), 4) - 1;

/** Paylaşımsız seçeneği yalnızca tek kişilik derslerde anlamlıdır (2+ kişi zaten kortu tamamen kullanır) */
export const canBeExclusive = (people: number) => people === 1;

export function packagePrice(list: PriceListData, o: { band: PriceBand; people: number; sessions: number; exclusive: boolean }): number {
  const size: PackageSize = o.sessions >= 16 ? "16" : "8";
  const base = list.packages[o.band][size][column(o.people)];
  const perSession = base / Number(size);
  const surcharge = o.exclusive && canBeExclusive(o.people) ? list.exclusiveSurcharge : 0;
  return Math.round((perSession + surcharge) * o.sessions);
}

/** Paketsiz tek ders: 8'lik paketin seans fiyatı (+ paylaşımsız farkı) */
export function singleLessonPrice(list: PriceListData, o: { band: PriceBand; people: number; exclusive: boolean }): number {
  return packagePrice(list, { ...o, sessions: 1 });
}

export function perPerson(total: number, people: number) {
  return Math.round(total / Math.max(people, 1));
}

/** Kort paylaşımı: 1 kişilik paylaşımlı özel ders kortun yarısını kullanır; aynı kortta en fazla 2 ders */
export const MAX_SHARED_LESSONS = 2;
export function usesHalfCourt(b: { kind: string; exclusive: boolean; memberCount: number }) {
  return b.kind === "private" && !b.exclusive && b.memberCount === 1;
}
