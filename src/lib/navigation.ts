import type { NavItem, NavSection, QuickAction, TabItem } from "./types";

export function navSections(counts: { bookingsToday: number; unpaidCount: number }): NavSection[] {
  return [
    {
      label: "Günlük",
      items: [
        { label: "Genel Bakış", href: "/", icon: "house" },
        { label: "Takvim", href: "/takvim", icon: "calendar" },
        { label: "Rezervasyonlar", href: "/rezervasyonlar", icon: "clipboard", count: counts.bookingsToday },
      ],
    },
    {
      label: "Kulüp",
      items: [
        { label: "Üyeler", href: "/uyeler", icon: "users" },
        { label: "Antrenörler", href: "/antrenorler", icon: "whistle" },
        { label: "Kortlar", href: "/kortlar", icon: "court" },
      ],
    },
    {
      label: "İşletme",
      items: [
        {
          label: "Ödemeler",
          href: "/odemeler",
          icon: "wallet",
          badge: counts.unpaidCount ? { value: counts.unpaidCount, label: `${counts.unpaidCount} bekleyen` } : undefined,
        },
        { label: "Fiyatlar", href: "/fiyatlar", icon: "tag" },
        { label: "Raporlar", href: "/raporlar", icon: "chart" },
      ],
    },
  ];
}

export const footerNav: NavItem[] = [
  { label: "Ayarlar", href: "/ayarlar", icon: "settings" },
  { label: "Yardım ve destek", href: "/yardim", icon: "life-buoy" },
];

export const tabs: TabItem[] = [
  { label: "Özet", href: "/", icon: "house" },
  { label: "Takvim", href: "/takvim", icon: "calendar" },
  { label: "Üyeler", href: "/uyeler", icon: "users" },
];

export function quickActions(unpaid: { count: number; total: string }): QuickAction[] {
  return [
    { id: "q1", title: "Yeni Rezervasyon", description: "Kort, tarih ve saat seç", icon: "plus", tone: "primary", href: "/rezervasyonlar/yeni" },
    { id: "q2", title: "Ders Planla", description: "Özel ya da grup dersi", icon: "whistle", tone: "lime", href: "/dersler/yeni" },
    { id: "q3", title: "Üye Ekle", description: "Ad, telefon ve üyelik tipi", icon: "user-plus", tone: "sage", href: "/uyeler/yeni" },
    {
      id: "q4", title: "Ödeme Al", icon: "wallet", tone: "warn", href: "/odemeler",
      description: unpaid.count ? `${unpaid.count} bekleyen ödeme · ${unpaid.total}` : "Bekleyen ödeme yok",
    },
  ];
}
