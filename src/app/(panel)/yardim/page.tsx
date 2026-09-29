export const metadata = { title: "Yardım · Tennis Clinic" };

const ITEMS = [
  ["Ders planlama", "Ders Planla ekranında antrenörü seçin; önümüzdeki 14 gündeki müsait saatler listelenir. Saat seçip öğrencileri atayın. Grup dersleri en fazla 6 kişiliktir."],
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
