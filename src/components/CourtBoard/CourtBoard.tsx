import { ArrowRight } from "lucide-react";
import { CourtTile } from "@/components/CourtTile/CourtTile";
import type { CourtCounts, CourtView } from "@/lib/courts";
import type { ClockTime } from "@/lib/types";
import styles from "./CourtBoard.module.css";

interface CourtBoardProps {
  time: ClockTime;
  branch: string;
  counts: CourtCounts;
  courts: { id: string; name: string; surface: string; view: CourtView }[];
}

export function CourtBoard({ time, branch, counts, courts }: CourtBoardProps) {
  return (
    <section className={`card ${styles.courts}`} aria-labelledby="courts-title">
      <header className={`card__head ${styles.head}`}>
        <div className="card__title-row">
          <h2 className="card__title" id="courts-title">Kort durumu</h2>
          <span className={styles.live}>
            <span className={styles.liveDot} />
            Canlı · {time}
          </span>
          <span className={`card__meta ${styles.meta}`}>
            {branch} · {counts.total} kort
          </span>
        </div>
        <div className={styles.tools}>
          <ul className={styles.legend}>
            <li><span className={styles.swatch} />Dolu <strong>{counts.busy}</strong></li>
            <li><span className={`${styles.swatch} ${styles.swatchFree}`} />Müsait <strong>{counts.free}</strong></li>
            <li><span className={`${styles.swatch} ${styles.swatchMaint}`} />Bakımda <strong>{counts.maint}</strong></li>
          </ul>
          <a className={`btn btn--sm btn--outline ${styles.open}`} href="#">
            Takvimi aç
            <ArrowRight className="icon icon--sm" aria-hidden="true" />
          </a>
        </div>
      </header>

      <div className={styles.grid}>
        {courts.map((c) => (
          <CourtTile key={c.id} name={c.name} surface={c.surface} view={c.view} />
        ))}
      </div>
    </section>
  );
}
