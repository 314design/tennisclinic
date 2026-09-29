"use client";

import { CalendarDays, House, SearchX } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NotFoundView.module.css";

/** Adresi olmayan sayfa ya da silinmiş kayıt (üye, seans, antrenör) */
export function NotFoundView() {
  const path = usePathname();
  return (
    <main className={styles.wrap}>
      <section className={`card ${styles.card}`}>
        <SearchX className={styles.icon} aria-hidden="true" />
        <h1 className={styles.title}>Sayfa bulunamadı</h1>
        <p className="muted">
          Bu adreste bir sayfa ya da kayıt yok; kayıt silinmiş veya bağlantı eksik olabilir.
        </p>
        {path && <code className={styles.path}>{path}</code>}
        <div className={styles.actions}>
          <Link className="btn btn--primary" href="/">
            <House className="icon" aria-hidden="true" /> Genel Bakış
          </Link>
          <Link className="btn" href="/takvim">
            <CalendarDays className="icon" aria-hidden="true" /> Takvim
          </Link>
        </div>
      </section>
    </main>
  );
}
