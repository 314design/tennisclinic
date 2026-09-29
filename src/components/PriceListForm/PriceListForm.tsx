"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/format";
import { BAND_LABEL, PACKAGE_SIZES, PEOPLE_COLUMNS, type PackageSize, type PriceBand, type PriceList } from "@/lib/pricing";
import { savePriceList } from "@/server/actions/pricing";
import styles from "./PriceListForm.module.css";

const BANDS: PriceBand[] = ["offpeak", "peak"];

export function PriceListForm({ current, today }: { current: PriceList; today: string }) {
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [offpeak, setOffpeak] = useState(current.offpeak);
  const [surcharge, setSurcharge] = useState(current.exclusiveSurcharge);
  const [prices, setPrices] = useState(current.packages);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const setCell = (band: PriceBand, size: PackageSize, col: number, value: number) => {
    setMsg(null);
    setPrices((p) => {
      const rowCopy = [...p[band][size]] as [number, number, number, number];
      rowCopy[col] = value;
      return { ...p, [band]: { ...p[band], [size]: rowCopy } };
    });
  };

  /** 16 seanslık fiyatları 8'liğin iki katı yap */
  const double = () => {
    setPrices((p) => ({
      offpeak: { ...p.offpeak, "16": p.offpeak["8"].map((v) => v * 2) as [number, number, number, number] },
      peak: { ...p.peak, "16": p.peak["8"].map((v) => v * 2) as [number, number, number, number] },
    }));
  };

  const save = () =>
    startTransition(async () => {
      const res = await savePriceList({ effectiveFrom, offpeak, exclusiveSurcharge: surcharge, packages: prices });
      setMsg(res.ok ? { ok: true, text: "Fiyat listesi kaydedildi" } : { ok: false, text: res.error });
    });

  return (
    <div className="stack-lg">
      <section className="card">
        <header className="card__head">
          <div>
            <h2 className="card__title">Özel ders paket fiyatları</h2>
            <p className="card__meta">Tutarlar grubun toplamıdır (kişi başı değil). Parantez içinde seans fiyatı gösterilir.</p>
          </div>
          <button className="btn btn--sm btn--outline" type="button" onClick={double}>16&apos;lığı 8&apos;liğin 2 katı yap</button>
        </header>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className={`table ${styles.grid}`}>
            <thead>
              <tr>
                <th>Ders tipi</th>
                <th>Paket</th>
                {PEOPLE_COLUMNS.map((c) => (
                  <th key={c} className="num">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BANDS.map((band) =>
                PACKAGE_SIZES.map((size, i) => (
                  <tr key={`${band}-${size}`} className={band === "offpeak" ? styles.offpeak : styles.peak}>
                    {i === 0 && (
                      <th rowSpan={2} scope="rowgroup" className={styles.band}>
                        Özel ders
                        <span>{band === "offpeak" ? `Hafta içi ${offpeak.start}–${offpeak.end}` : `Hafta içi diğer saatler ve hafta sonu`}</span>
                      </th>
                    )}
                    <td className="nowrap">{size} seans</td>
                    {prices[band][size].map((v, col) => (
                      <td key={col} className="num">
                        <input
                          className={`input ${styles.cell}`}
                          type="number"
                          min={0}
                          step={100}
                          value={v}
                          aria-label={`${BAND_LABEL[band]} · ${size} seans · ${PEOPLE_COLUMNS[col]}`}
                          onChange={(e) => setCell(band, size, col, Math.max(0, Math.round(Number(e.target.value))))}
                        />
                        <span className={styles.per}>({formatCurrency(Math.round(v / Number(size)))})</span>
                      </td>
                    ))}
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="card__title">Saat bandı ve kort farkı</h2>
        <div className="form-grid" style={{ marginTop: 14 }}>
          <label className="field">
            <span className="field__label">Sakin saat başlangıcı (hafta içi)</span>
            <input className="input" type="time" step={1800} value={offpeak.start} onChange={(e) => setOffpeak({ ...offpeak, start: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">Sakin saat bitişi</span>
            <input className="input" type="time" step={1800} value={offpeak.end} onChange={(e) => setOffpeak({ ...offpeak, end: e.target.value })} />
            <span className="field__hint">Ders tamamen bu aralıktaysa sakin saat fiyatı uygulanır.</span>
          </label>
          <label className="field">
            <span className="field__label">Paylaşımsız kort farkı (₺ / seans)</span>
            <input className="input" type="number" min={0} step={50} value={surcharge} onChange={(e) => setSurcharge(Math.max(0, Number(e.target.value)))} />
            <span className="field__hint">Yalnızca 1 kişilik derslerde; 8 seansta +{formatCurrency(surcharge * 8)}.</span>
          </label>
          <label className="field">
            <span className="field__label">Geçerlilik başlangıcı</span>
            <input className="input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            <span className="field__hint">Bu tarihten itibaren yeni paketlerde kullanılır. Satılmış paketler değişmez.</span>
          </label>
        </div>
      </section>

      {msg && (
        <p className={`notice ${msg.ok ? "notice--ok" : "notice--error"}`} role="status">
          {msg.ok && <Check className="icon" aria-hidden="true" />}
          {msg.text}
        </p>
      )}
      <div className="form-actions">
        <button className="btn btn--primary" type="button" disabled={pending} onClick={save}>
          {pending ? "Kaydediliyor…" : "Fiyat listesini kaydet"}
        </button>
      </div>
    </div>
  );
}
