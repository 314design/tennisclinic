/** Ekran bileşenlerinin kullandığı görünüm tipleri. Veriler `src/server/queries` içinde veritabanından üretilir. */

export type IconName =
  | "house"
  | "calendar"
  | "clipboard"
  | "users"
  | "users-round"
  | "user-round"
  | "user-plus"
  | "whistle"
  | "wallet"
  | "chart"
  | "settings"
  | "life-buoy"
  | "court"
  | "wrench"
  | "cloud-rain"
  | "id-card"
  | "plus"
  | "menu";

/** Saat "HH:MM" biçiminde tutulur */
export type ClockTime = string;

export interface Now {
  /** ISO tarih, ör. "2026-09-28" */
  date: string;
  time: ClockTime;
}

export interface Club {
  name: string;
  subtitle: string;
  branch: string;
}

export interface CurrentUser {
  firstName: string;
  fullName: string;
  initials: string;
  role: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Gri sayaç (ör. bugünkü rezervasyon) */
  count?: number;
  /** Vurgulu rozet (ör. bekleyen ödeme) */
  badge?: { value: number; label: string };
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export interface TabItem {
  label: string;
  href: string;
  icon: IconName;
}

/* ---------- Kortlar ---------- */

export type BookingKind = "private" | "reservation" | "group";
export type CourtEnvironment = "outdoor" | "indoor";

export interface CourtBooking {
  id: number;
  kind: BookingKind;
  start: ClockTime;
  end: ClockTime;
  /** Özel ders: öğrenci · Rezervasyon: oyuncular */
  members?: string[];
  coach?: string;
  format?: "singles" | "doubles";
  groupName?: string;
  groupSize?: number;
}

export interface Court {
  id: number;
  name: string;
  surface: string;
  environment: CourtEnvironment;
  balloon: boolean;
  /** Kortu şu an kullanan (henüz boşaltılmamış) seans */
  occupant?: CourtBooking;
  /** Kortta başlayacak bir sonraki seans */
  next?: { start: ClockTime; member: string };
  maintenance?: { start: ClockTime; end: ClockTime; reason: string };
}

export type CourtStatus = "busy" | "free" | "maint" | "overtime";

/* ---------- Seanslar ---------- */

export type AvatarTone = "default" | "lime" | "deep" | "off";

export interface Session {
  id: number;
  start: ClockTime;
  end: ClockTime;
  courtId: number;
  kind: BookingKind;
  /** Üye adı ya da grup adı */
  name: string;
  initials?: string;
  avatarTone?: AvatarTone;
  /** "Premium üye", "4/6 kişi · Orta" gibi ikinci satır */
  memberLine: string;
  coach?: string;
  format?: "singles" | "doubles";
  state: "scheduled" | "in_progress";
  paid: boolean;
  memberCount: number;
}

/* ---------- Uyarılar & hareketler ---------- */

export type AlertTone = "warn" | "ok" | "neutral" | "sage";

export interface Alert {
  id: string;
  tone: AlertTone;
  icon: IconName;
  title: string;
  detail: string;
  action: string;
  href: string;
}

export interface Activity {
  id: number;
  name: string;
  text: string;
  /** ISO tarih-saat */
  at: string;
  tone?: "default" | "danger";
}

/* ---------- Göstergeler & grafik ---------- */

/** Metin parçası; `desktopOnly` olanlar mobilde gizlenir. */
export type TextPart = string | { text: string; desktopOnly: true };

export interface Delta {
  text: string;
  direction: "up" | "down" | "flat";
}

export type SeriesUnit = "currency" | "percent";

export interface ChartSeries {
  key: string;
  label: string;
  title: string;
  unit: SeriesUnit;
  /** Toplam yerine ortalama gösterilir */
  summary: "sum" | "average";
  delta: Delta;
  max: number;
  values: number[];
}

export interface ChartDay {
  short: string;
  long: string;
}

export interface RevenueData {
  rangeLabel: string;
  days: ChartDay[];
  series: ChartSeries[];
}

/* ---------- Antrenörler ---------- */

export interface Coach {
  id: number;
  name: string;
  initials: string;
  role?: string;
  avatarTone: AvatarTone;
  lessonsDone: number;
  lessonsTotal: number;
}

export type CoachState =
  | { type: "teaching"; courtName: string; until: ClockTime }
  | { type: "available"; next?: { start: ClockTime; courtName: string } }
  | { type: "off" };

/* ---------- Hızlı işlem ---------- */

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tone: "primary" | "lime" | "sage" | "warn";
  href: string;
}

/* ---------- Hava durumu ---------- */

export interface WeatherHour {
  time: ClockTime;
  temperature: number;
  code: number;
  isDay: boolean;
  precipitationProbability: number;
}

export interface Weather {
  location: string;
  current: { temperature: number; code: number; isDay: boolean; description: string };
  hours: WeatherHour[];
  /** Yarın için en yüksek yağış olasılığı (%) */
  tomorrowPrecipitation: number;
}
