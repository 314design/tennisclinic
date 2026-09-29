/** İptal nedenleri (iptal penceresi ve sunucu işlemleri ortak kullanır) */
export const CANCEL_REASONS = {
  weather: "Hava durumu",
  member: "Üye iptali",
  coach: "Antrenör iptali",
  maintenance: "Kort bakımı",
  group_priority: "Grup dersi önceliği",
  other: "Diğer",
} as const;
export type CancelReason = keyof typeof CANCEL_REASONS;
