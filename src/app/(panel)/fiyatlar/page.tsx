import { PriceListForm } from "@/components/PriceListForm/PriceListForm";
import { clubNow } from "@/lib/clock";
import { formatCurrency, formatShortDate } from "@/lib/format";
import { getPriceHistory, getPriceList } from "@/server/queries/pricing";

export const metadata = { title: "Fiyatlar · Tennis Clinic" };

export default async function PricesPage() {
  const now = clubNow();
  const [current, history] = await Promise.all([getPriceList(now.date), getPriceHistory()]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-header__title">Fiyatlar</h1>
          <p className="page-header__lede">
            Geçerli liste: {formatShortDate(current.effectiveFrom)} · Paylaşımsız kort +{formatCurrency(current.exclusiveSurcharge)} / seans
          </p>
        </div>
      </header>
      <PriceListForm key={current.id ?? "default"} current={current} today={now.date} />
      {history.length > 0 && (
        <section className="card">
          <h2 className="card__title">Fiyat geçmişi</h2>
          <ul className="ledger">
            {history.map((h) => (
              <li key={h.id}>
                <span>
                  <strong>{formatShortDate(h.effectiveFrom)}</strong>
                  <span className="muted">
                    {" "}· 1 kişi 8 seans: sakin {formatCurrency(h.packages.offpeak["8"][0])}, yoğun {formatCurrency(h.packages.peak["8"][0])}
                  </span>
                </span>
                {h.effectiveFrom > now.date ? <span className="chip chip--sm chip--outline">İleri tarihli</span> : h.id === current.id ? <span className="chip chip--sm chip--ok">Geçerli</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
