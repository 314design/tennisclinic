export const metadata = { title: "Yardım · Tennis Clinic" };

const ITEMS = [
  ["Ders planlama", "Ders Planla ekranında antrenörü seçin; önümüzdeki 14 gündeki müsait saatler listelenir. Saat seçip öğrencileri atayın. Grup dersleri en fazla 6 kişiliktir."],
  ["Özel ders paketleri", "Özel dersler 1–5 kişilik olabilir. Fiyat kişi sayısına (1, 2, 3, 4–5), saat bandına (hafta içi sakin saat / yoğun saat ve hafta sonu) ve paket büyüklüğüne (8 ya da 16 seans) göre Fiyatlar ekranındaki listeden hesaplanır; tutar grubun toplamıdır."],
  ["Haftalık sabitleme", "Ders oluştururken \"Her Salı 20:30'da sabitle\" seçeneğiyle dersler ardışık haftalara açılır (ör. 8 seansın tamamı ya da 4 hafta). Çakışan haftalar listelenir; onaylarsanız atlanır."],
  ["Paylaşımlı / paylaşımsız kort", "1 kişilik özel dersler varsayılan olarak paylaşımlıdır: aynı kortta aynı anda en fazla 2 ders (2 hoca, 2 öğrenci) olabilir. Paylaşımsız kort seçilirse kort yalnızca o ders için ayrılır ve seans başına fark (varsayılan +700 ₺) eklenir."],
  ["Yeni rezervasyon", "Yeni Rezervasyon ekranında türü seçin (grup dersi, özel ders, kort kiralama), derslerde antrenörü seçin ve takvimde boş bir saate tıklayın. Dolu saatler ve antrenörün çalışmadığı saatler gölgeli görünür. Ücret türe ve saate göre Fiyatlar ekranından otomatik hesaplanır. Takvim ve antrenör takviminde boş saate tıklayarak da rezervasyon başlatabilirsiniz."],
  ["Üyelik süresi", "Üye eklerken başlangıç tarihi ve ders kotası seçilir; bitiş tarihi kotanın geçerlilik süresine göre (varsayılan 8 seans 60 gün, 16 seans 120 gün) hesaplanır. Özel ders paketi ya da yeni kota alındığında bitiş tarihi buna göre uzar."],
  ["Ders aktarma", "İzinli antrenörün planlanmış dersleri Genel Bakış'ta uyarı olarak görünür. Antrenör sayfasındaki \"Açıkta kalan dersler\" listesinden ya da seans sayfasındaki \"Hocayı değiştir\" ile dersi başka bir hocaya aktarın; pencerede yeni hocanın müsait gün ve saatleri listelenir."],
  ["Grup dersi önceliği", "Grup dersleri özel ders ve kort kiralamalarından önceliklidir. Özel ders grup saatine yazılamaz; grup dersi eklenirken çakışan özel dersler onayınızla iptal edilir ve üyelere telafi hakkı verilir."],
  ["İptal ve telafi", "Sıradaki seanslardaki çarpı düğmesiyle iptal nedenini seçin. \"Telafi ders hakkı oluştur\" işaretliyse üyeye +1 telafi hakkı eklenir; üyelik süresi değişmez. Hava durumu, antrenör ve bakım iptallerinde varsayılan olarak işaretlidir."],
  ["Balon kort", "Kortlar ekranında açık kortu kış dönemi için \"Balon Kort\" olarak işaretleyin. Balon kortlar yağmur uyarılarında dikkate alınmaz."],
  ["Gelir gizleme", "Genel Bakış'ta bugünkü gelirin yanındaki göz ikonuyla tutarı gizleyebilirsiniz; tercih bu tarayıcıda hatırlanır."],
] as const;

export default function HelpPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Yardım ve destek</h1>
          <p className="page-header__lede">Panelin temel işleyişi</p>
        </div>
      </header>
      <section className="card">
        <dl className="details" style={{ gridTemplateColumns: "minmax(0, 200px) minmax(0, 1fr)" }}>
          {ITEMS.map(([t, d]) => (
            <div key={t} style={{ display: "contents" }}>
              <dt>{t}</dt>
              <dd style={{ fontWeight: 500 }}>{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
