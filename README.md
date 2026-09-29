# Tennis Clinic

Tennis Clinic kulüp yönetim paneli · Next.js (App Router) + TypeScript + CSS Modules.

```bash
npm install
npm run dev              # http://localhost:3000
npm run build && npm start
```

## Yapı

```
design/tennis-clinic-panel.html   Onaylı tasarım (referans, tek dosya)
src/styles/theme.css              Renk ve ölçü token'ları (tek kaynak)
src/app/globals.css               Temel stiller + ortak parçalar (btn, chip, avatar, card…)
src/app/page.tsx                  Genel Bakış ekranı; mock veriyi bileşenlere dağıtır
src/data/mock.ts                  Örnek veriler (28 Eylül 2026, 17:30)
src/lib/courts.ts                 Kort durumu (dolu · müsait · bakımda · süre doldu) ve kalan süre hesabı
src/lib/coaches.ts                Antrenör durumu (derste · müsait · izinli)
src/lib/format.ts                 Saat, para, tarih ve Türkçe ek yardımcıları
src/components/*                  Sidebar, Topbar, MobileBar, KpiCard, CourtTile, SessionRow,
                                  AlertItem, ActivityFeed, RevenueChart, CoachRow, TabBar,
                                  QuickActionSheet ve bunları saran AppShell / bölüm kartları
```

Kırılımlar: ≥1366 px tam yan menü · 768–1365 px ikonlu dar menü · <768 px mobil
(üst çubuk, alt sekme çubuğu, + ile açılan hızlı işlem menüsü).

İkonlar `lucide-react`'ten gelir; Lucide'de karşılığı olmayan kort ikonu `Icon` bileşeninde tanımlıdır.
Gerçek API bağlandığında `src/data/mock.ts` yerine aynı tiplerde (`src/lib/types.ts`) veri verilmesi yeterlidir.
