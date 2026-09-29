# Tennis Clinic

Tennis Clinic kulüp yönetim paneli · Next.js 16 (App Router) + TypeScript + PostgreSQL (Drizzle ORM).

## Yerelde çalıştırma

```bash
npm install
npm run db:seed          # şemayı kurar + örnek veri (bugüne göre üretilir)
npm run dev              # http://localhost:3000
```

`DATABASE_URL` tanımlı değilse veriler `.data/pglite` altındaki gömülü PostgreSQL'de (PGlite) tutulur;
kurulum gerektirmez. `npm run db:reset` tüm verileri silip örnek veriyi yeniden yükler
(çalışan `npm run dev` varken değil — gömülü veritabanı tek süreç tarafından açılabilir).

## Vercel'e kurulum

1. Vercel'de projeyi bu depodan oluşturun.
2. **Storage → Neon (Postgres)** ekleyin (ya da Supabase). `DATABASE_URL` ortam değişkeni otomatik gelir;
   gelmezse bağlantı adresini (pooled) elle ekleyin.
3. Ortam değişkenleri:
   - `PANEL_PASSWORD` (zorunlu önerilir) ve isteğe bağlı `PANEL_USER` — panel HTTP Basic Auth ile korunur.
   - `SEED_DEMO=1` — ilk kurulumda boş veritabanına örnek veri yüklemek isterseniz (sonra kaldırın).
4. Deploy. `npm run build` önce şemayı veritabanına uygular (göçler), sonra derler.

Hava durumu [Open-Meteo](https://open-meteo.com)'dan (anahtar gerektirmez) Ayarlar'daki konum için
15 dakikada bir alınır. Varsayılan konum Ankara.

## Özellikler

- **Genel Bakış:** canlı kort durumu, sıradaki seanslar (Başlat · Bitir · Tahsil et · İptal), göstergeler,
  gelir göz ikonuyla gizlenebilir, dikkat gerektirenler (bekleyen ödeme, biten üyelik, bakım, yağmur), antrenörler.
- **İptal ve telafi:** iptal nedeni seçilir; "Telafi ders hakkı oluştur" işaretliyse üyeye +1 telafi hakkı eklenir
  (üyelik süresi değişmez). Hava durumu/antrenör/bakım iptallerinde varsayılan olarak işaretli.
- **Ders Planla:** antrenör seçilir → 14 günlük müsait gün/saatler → kort ve öğrenci atanır. Grup dersleri
  seviye ve en fazla 6 kişilik kapasiteyle; antrenörün mevcut grup derslerine öğrenci eklenebilir.
- **Özel ders paketleri ve fiyatlar:** 1–5 kişilik özel ders; 8/16 seanslık paket, paketsiz tek ders ya da telafi
  hakkı. Fiyat kişi sayısı, saat bandı (hafta içi sakin saat / yoğun saat ve hafta sonu) ve paket büyüklüğüne göre
  **Fiyatlar** ekranındaki sürümlü listeden hesaplanır (grubun toplamı); satılan paketin tutarı sabit kalır.
- **Haftalık sabitleme:** "Her Salı 20:30'da" seçeneğiyle dersler ardışık haftalara açılır (paketin tamamı ya da
  seçilen hafta sayısı); çakışan haftalar listelenip onayla atlanır.
- **Paylaşımlı / paylaşımsız kort:** 1 kişilik paylaşımlı özel dersler aynı kortu en fazla 2 ders olarak paylaşır;
  paylaşımsız kort seans başına fark (varsayılan +700 ₺) ile kortu yalnızca o derse ayırır.
- **Grup dersi önceliği:** özel ders ya da kiralama grup dersinin saatine yazılamaz; grup dersi eklenirken
  çakışan özel dersler onayla iptal edilir ve üyelere telafi hakkı verilir.
- **Yeni Rezervasyon:** tür (grup dersi / özel ders / kort kiralama) seçilir, takvimde boş saate tıklanır; dolu ve
  antrenörün çalışmadığı saatler gölgeli görünür. Ücret türe ve saat bandına göre otomatik hesaplanır (kiralama saatlik,
  grup dersi kişi başı — ders hakkı olanlar hakkından düşer). Takvim ve antrenör takviminde boş saate tıklayarak da açılır.
- **Üyelik süresi:** üye başlangıç tarihi + ders kotası; bitiş, kotanın geçerlilik süresine göre (Fiyatlar ekranı) hesaplanır.
- **Ders aktarma:** izinli antrenörün dersleri uyarı olarak görünür; başka hocanın müsait gün/saatine aktarılır.
- **Yedek ve Excel:** Ayarlar'da tam yedek (`/api/yedek`, JSON) ve seçilen tarih aralığı için Excel özet raporu
  (`/api/rapor`; Özet, Seanslar, Ödemeler, Paketler, Üyeler sayfaları). Raporlar ekranında da Excel düğmesi var.
- **Kortlar:** 2 açık + 1 kapalı kort; açık kort kış için "Balon Kort" yapılabilir (yağmur uyarısı dışında kalır),
  bakım takvimi.
- **Üyeler** (ders/telafi hakkı, paket, üyelik bitişi, hak hareketleri), **Antrenörler** (haftalık saatler, izin),
  **Takvim**, **Rezervasyonlar**, **Ödemeler**, **Raporlar**, **Ayarlar**.

## Yapı

```
design/tennis-clinic-panel.html   Onaylı tasarım (referans)
drizzle/                          SQL göç dosyaları (npm run db:generate ile üretilir)
src/styles/theme.css              Renk ve ölçü token'ları (tek kaynak)
src/app/(panel)/                  Sayfalar; layout.tsx kabuğu (menü, üst çubuk, hava durumu) kurar
src/components/*                  Arayüz bileşenleri (CSS Modules)
src/server/db/                    Şema, bağlantı, göç ve örnek veri
src/server/queries/               Ekran verisi üreten sorgular
src/server/actions/               Veri değiştiren sunucu işlemleri (Server Actions)
src/server/scheduling.ts          Çakışma ve grup önceliği kuralları
src/lib/                          Saat/biçim yardımcıları, kort durumu hesabı, tipler
```
