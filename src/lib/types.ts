/** Uygulamadaki tüm ekran verilerinin tipleri. Gerçek veriler API'den bu biçimde gelecek. */

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

/** Saat "HH:MM" biçiminde tutulur; `now` ile karşılaştırılarak hesaplanır. */
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
  current?: boolean;
  /** Gri sayaç (ör. rezervasyon sayısı) */
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
  current?: boolean;
}

/* ---------- Kortlar ---------- */

export type BookingKind = "private" | "reservation" | "group";

export interface CourtBooking {
  kind: BookingKind;
  start: ClockTime;
  end: ClockTime;
  /** Özel ders: öğrenci · Rezervasyon: rezervasyon sahipleri */
  members?: string[];
  coach?: string;
  /** Rezervasyonlarda oyun biçimi */
  format?: "singles" | "doubles";
  groupName?: string;
  groupSize?: number;
}

export interface Court {
  id: string;
  name: string;
  surface: string;
  /** Kortu şu an kullanan (henüz boşaltılmamış) seans */
  occupant?: CourtBooking;
  /** Kortta başlayacak bir sonraki seans */
  next?: { start: ClockTime; member: string };
  maintenance?: { start: ClockTime; end: ClockTime; reason: string };
}

export type CourtStatus = "busy" | "free" | "maint" | "overtime";

/* ---------- Seanslar ---------- */

export type SessionStatus =
  | { type: "pending" }
  | { type: "arrived" }
  | { type: "partial"; arrived: number; total: number }
  | { type: "unpaid" };

export type AvatarTone = "default" | "lime" | "deep" | "off";

export interface Session {
  id: string;
  start: ClockTime;
  end: ClockTime;
  courtId: string;
  kind: BookingKind;
  /** Üye adı ya da grup adı */
  name: string;
  initials?: string;
  avatarTone?: AvatarTone;
  /** "Premium üye", "4 kişi" gibi ikinci satır */
  memberLine: string;
  coach?: string;
  format?: "singles" | "doubles";
  status: SessionStatus;
}

export interface SessionsSummary {
  windowLabel: string;
  remainingReservations: number;
  remainingLessons: number;
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
  id: string;
  name: string;
  text: string;
  /** ISO tarih-saat */
  at: string;
  tone?: "default" | "danger";
}

/* ---------- Göstergeler & grafik ---------- */

/** Metin parçası; `desktopOnly` olanlar mobilde gizlenir. */
export type TextPart = string | { text: string; desktopOnly: true };

export interface KpiData {
  id: string;
  label: string;
  value: string;
  aside?: string;
  delta: string;
  note: TextPart[];
  /** Son haftaların aynı gün değerleri (bugün sonda) */
  trend?: number[];
}

export type SeriesUnit = "currency" | "percent";

export interface ChartSeries {
  key: string;
  label: string;
  title: string;
  unit: SeriesUnit;
  /** Toplam yerine ortalama gösterilir */
  summary: "sum" | "average";
  delta: string;
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
  id: string;
  name: string;
  initials: string;
  role?: string;
  avatarTone: AvatarTone;
  lessonsDone: number;
  lessonsTotal: number;
  onLeave?: boolean;
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
