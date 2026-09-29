"use client";

import { DatabaseBackup, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import styles from "./ExportPanel.module.css";

/** Yedek (JSON) ve Excel özet raporu indirme */
export function ExportPanel({ today, monthStart }: { today: string; monthStart: string }) {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const excelHref = `/api/rapor?baslangic=${from}&bitis=${to}`;

  return (
    <section className="card" aria-labelledby="export-title">
      <h2 className="card__title" id="export-title">Yedek ve Excel raporu</h2>
      <p className="card__meta">Veriler bulutta (Neon PostgreSQL) saklanır; yine de ayda bir yedek indirmeniz önerilir.</p>
      <div className={styles.grid}>
        <div className={styles.box}>
          <FileSpreadsheet className={`icon ${styles.icon}`} aria-hidden="true" />
          <div className={styles.body}>
            <strong>Excel özet raporu</strong>
            <span>Özet (gelir, seanslar, iptaller, antrenör ve kort dağılımı), seanslar, ödemeler, paketler ve üyeler ayrı sayfalarda.</span>
            <div className={styles.range}>
              <label className="field">
                <span className="field__label">Başlangıç</span>
                <input className="input" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="field">
                <span className="field__label">Bitiş</span>
                <input className="input" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            <a className="btn btn--primary" href={excelHref} download>
              <FileSpreadsheet className="icon" aria-hidden="true" /> Excel indir
            </a>
          </div>
        </div>
        <div className={styles.box}>
          <DatabaseBackup className={`icon ${styles.icon}`} aria-hidden="true" />
          <div className={styles.body}>
            <strong>Tam yedek</strong>
            <span>Tüm kayıtlar (üyeler, dersler, paketler, ödemeler, ayarlar, fiyatlar) tek dosyada. Gerektiğinde veriler bu dosyadan geri yüklenebilir.</span>
            <a className="btn" href="/api/yedek" download>
              <DatabaseBackup className="icon" aria-hidden="true" /> Yedeği indir (.json)
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
