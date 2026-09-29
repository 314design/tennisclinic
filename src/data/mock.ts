/**
 * Örnek veriler (28 Eylül 2026 Pazartesi, saat 17:30 anı).
 * Gerçek veriler API'den gelecek; bileşenler bu yapıyı prop olarak alır.
 * Kort durumları, kalan süreler, sayaçlar ve göreli zamanlar `now`'a göre hesaplanır.
 */
import type {
  Activity,
  Alert,
  Club,
  Coach,
  Court,
  CurrentUser,
  KpiData,
  NavSection,
  Now,
  QuickAction,
  RevenueData,
  Session,
  SessionsSummary,
  TabItem,
} from "@/lib/types";

export const now: Now = { date: "2026-09-28", time: "17:30" };

export const club: Club = {
  name: "Tennis Clinic",
  subtitle: "Kulüp yönetimi",
  branch: "Merkez Kulüp",
};

export const currentUser: CurrentUser = {
  firstName: "Selin",
  fullName: "Selin Karaca",
  initials: "SK",
  role: "Kulüp müdürü",
};

export const unreadNotifications = 3;

export const navSections: NavSection[] = [
  {
    label: "Günlük",
    items: [
      { label: "Genel Bakış", href: "#", icon: "house", current: true },
      { label: "Takvim", href: "#", icon: "calendar" },
      { label: "Rezervasyonlar", href: "#", icon: "clipboard", count: 32 },
    ],
  },
  {
    label: "Kulüp",
    items: [
      { label: "Üyeler", href: "#", icon: "users" },
      { label: "Antrenörler", href: "#", icon: "whistle" },
      { label: "Kortlar", href: "#", icon: "court" },
    ],
  },
  {
    label: "İşletme",
    items: [
      { label: "Ödemeler", href: "#", icon: "wallet", badge: { value: 2, label: "2 bekleyen" } },
      { label: "Raporlar", href: "#", icon: "chart" },
    ],
  },
];

export const footerNav: NavSection["items"] = [
  { label: "Ayarlar", href: "#", icon: "settings" },
  { label: "Yardım ve destek", href: "#", icon: "life-buoy" },
];

export const tabs: TabItem[] = [
  { label: "Özet", href: "#", icon: "house", current: true },
  { label: "Takvim", href: "#", icon: "calendar" },
  { label: "Üyeler", href: "#", icon: "users" },
];

export const today = {
  reservations: 32,
  lessons: 14,
};

export const kpis: KpiData[] = [
  {
    id: "revenue",
    label: "Bugünkü gelir",
    value: "₺48.750",
    delta: "%12",
    note: ["geçen pazartesi", { text: "ye göre", desktopOnly: true }],
    trend: [37350, 40350, 41790, 41070, 44010, 48750],
  },
  {
    id: "reservations",
    label: "Rezervasyon",
    value: "32",
    delta: "%9",
    note: ["geçen pazartesi", { text: "ye göre", desktopOnly: true }],
    trend: [20, 24, 22, 28, 26, 32],
  },
  {
    id: "lessons",
    label: "Ders",
    value: "14",
    aside: "9 özel · 5 grup",
    delta: "%8",
    note: ["geçen pazartesi", { text: "ye göre", desktopOnly: true }],
    trend: [11, 12, 12, 13, 12, 14],
  },
  {
    id: "occupancy",
    label: "Kort doluluğu",
    value: "%76",
    delta: "5 puan",
    // "şu an 6/8 kort dolu" kısmı kortlardan hesaplanır
    note: [],
  },
];

export const courts: Court[] = [
  {
    id: "k1",
    name: "Kort 1",
    surface: "Toprak",
    occupant: { kind: "private", start: "17:00", end: "18:00", members: ["Deniz Aydın"], coach: "Tolga Aksu" },
  },
  {
    id: "k2",
    name: "Kort 2",
    surface: "Toprak",
    occupant: { kind: "reservation", start: "16:45", end: "17:45", members: ["Mert Kaya", "Can Demir"], format: "singles" },
  },
  {
    id: "k3",
    name: "Kort 3",
    surface: "Toprak",
    maintenance: { start: "16:00", end: "19:00", reason: "Zemin bakımı" },
  },
  {
    id: "k4",
    name: "Kort 4",
    surface: "Toprak",
    next: { start: "18:00", member: "Zeynep Arslan" },
  },
  {
    id: "k5",
    name: "Kort 5",
    surface: "Sert zemin",
    occupant: { kind: "group", start: "16:30", end: "18:00", groupName: "Junior grubu", groupSize: 6, coach: "Ceren Başaran" },
  },
  {
    id: "k6",
    name: "Kort 6",
    surface: "Sert zemin",
    occupant: { kind: "reservation", start: "17:30", end: "18:30", members: ["Ece Koç", "Sude Kalkan"], format: "doubles" },
  },
  {
    id: "k7",
    name: "Kort 7",
    surface: "Kapalı",
    occupant: { kind: "group", start: "17:00", end: "18:30", groupName: "Başlangıç", groupSize: 4, coach: "Serkan Uçar" },
  },
  {
    id: "k8",
    name: "Kort 8",
    surface: "Kapalı",
    occupant: { kind: "reservation", start: "16:30", end: "17:30", members: ["Arda Polat", "Efe Tunç"], format: "singles" },
  },
];

export const sessions: Session[] = [
  {
    id: "s1", start: "18:00", end: "19:00", courtId: "k4", kind: "reservation", format: "singles",
    name: "Zeynep Arslan", initials: "ZA", memberLine: "Premium üye", status: { type: "pending" },
  },
  {
    id: "s2", start: "18:00", end: "19:00", courtId: "k1", kind: "private", coach: "Tolga Aksu",
    name: "Burak Şahin", initials: "BŞ", avatarTone: "lime", memberLine: "Standart üye", status: { type: "arrived" },
  },
  {
    id: "s3", start: "18:00", end: "19:30", courtId: "k2", kind: "group", coach: "Melis Tan",
    name: "Çiftler grubu", memberLine: "4 kişi", status: { type: "partial", arrived: 3, total: 4 },
  },
  {
    id: "s4", start: "18:30", end: "19:30", courtId: "k5", kind: "reservation", format: "singles",
    name: "Ozan Kurt", initials: "OK", memberLine: "Premium üye", status: { type: "pending" },
  },
  {
    id: "s5", start: "19:00", end: "20:00", courtId: "k8", kind: "reservation", format: "doubles",
    name: "Kerem Yılmaz", initials: "KY", avatarTone: "lime", memberLine: "Standart üye", status: { type: "unpaid" },
  },
  {
    id: "s6", start: "19:00", end: "20:00", courtId: "k3", kind: "private", coach: "Ceren Başaran",
    name: "İrem Güneş", initials: "İG", memberLine: "Premium üye", status: { type: "pending" },
  },
];

export const sessionsSummary: SessionsSummary = {
  windowLabel: "Önümüzdeki 2 saat",
  remainingReservations: 11,
  remainingLessons: 3,
};

export const alerts: Alert[] = [
  {
    id: "a1", tone: "warn", icon: "wallet", href: "#",
    title: "2 ödeme bekliyor", detail: "Kerem Yılmaz, Naz Özkan · ₺2.600", action: "Tahsil et",
  },
  {
    id: "a2", tone: "ok", icon: "id-card", href: "#",
    title: "5 üyelik bu hafta bitiyor", detail: "Yenileme hatırlatması gönderilmedi", action: "Hatırlat",
  },
  {
    id: "a3", tone: "neutral", icon: "wrench", href: "#",
    title: "Kort 3 bakımda", detail: "Zemin bakımı · 19:00'da açılacak", action: "Düzenle",
  },
  {
    id: "a4", tone: "sage", icon: "cloud-rain", href: "#",
    title: "Yarın yağmur bekleniyor", detail: "Açık kortlarda 7 rezervasyon var", action: "Üyelere bildir",
  },
];

export const activities: Activity[] = [
  { id: "e1", name: "Naz Özkan", text: "üye olarak kaydedildi", at: "2026-09-28T17:25" },
  { id: "e2", name: "Sude Kalkan", text: "10 derslik paket aldı · ₺12.500", at: "2026-09-28T17:12" },
  { id: "e3", name: "Umut Çetin", text: "rezervasyonunu iptal etti", at: "2026-09-28T17:03", tone: "danger" },
];

export const revenue: RevenueData = {
  rangeLabel: "22–28 Eylül",
  days: [
    { short: "Sal", long: "Salı" },
    { short: "Çar", long: "Çarşamba" },
    { short: "Per", long: "Perşembe" },
    { short: "Cum", long: "Cuma" },
    { short: "Cmt", long: "Cumartesi" },
    { short: "Paz", long: "Pazar" },
    { short: "Bugün", long: "Bugün" },
  ],
  series: [
    {
      key: "gelir", label: "Gelir", title: "Gelir · son 7 gün", unit: "currency", summary: "sum",
      delta: "%8", max: 80000,
      values: [38200, 41500, 39800, 52300, 71900, 66400, 48750],
    },
    {
      key: "doluluk", label: "Doluluk", title: "Kort doluluğu · son 7 gün", unit: "percent", summary: "average",
      delta: "4 puan", max: 100,
      values: [68, 72, 70, 81, 94, 90, 76],
    },
  ],
};

export const coaches: Coach[] = [
  { id: "c1", name: "Tolga Aksu", initials: "TA", role: "Baş antrenör", avatarTone: "deep", lessonsDone: 3, lessonsTotal: 5 },
  { id: "c2", name: "Ceren Başaran", initials: "CB", avatarTone: "default", lessonsDone: 2, lessonsTotal: 4 },
  { id: "c3", name: "Serkan Uçar", initials: "SU", avatarTone: "lime", lessonsDone: 2, lessonsTotal: 3 },
  { id: "c4", name: "Melis Tan", initials: "MT", avatarTone: "default", lessonsDone: 1, lessonsTotal: 2 },
  { id: "c5", name: "Barış Kılıç", initials: "BK", avatarTone: "off", lessonsDone: 0, lessonsTotal: 0, onLeave: true },
];

export const quickActions: QuickAction[] = [
  { id: "q1", title: "Yeni Rezervasyon", description: "Kort, tarih ve saat seç", icon: "plus", tone: "primary", href: "#" },
  { id: "q2", title: "Ders Planla", description: "Özel ya da grup dersi", icon: "whistle", tone: "lime", href: "#" },
  { id: "q3", title: "Üye Ekle", description: "Ad, telefon ve üyelik tipi", icon: "user-plus", tone: "sage", href: "#" },
  { id: "q4", title: "Ödeme Al", description: "2 bekleyen ödeme · ₺2.600", icon: "wallet", tone: "warn", href: "#" },
];
