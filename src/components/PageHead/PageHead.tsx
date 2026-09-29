import { formatLongDate, possessive, toMinutes } from "@/lib/format";
import type { Now } from "@/lib/types";
import styles from "./PageHead.module.css";

interface PageHeadProps {
  now: Now;
  firstName: string;
  reservations: number;
  lessons: number;
  busyCourts: number;
  totalCourts: number;
}

function greeting(time: string) {
  const m = toMinutes(time);
  if (m < 12 * 60) return "Günaydın";
  if (m < 18 * 60) return "İyi günler";
  return "İyi akşamlar";
}

export function PageHead({ now, firstName, reservations, lessons, busyCourts, totalCourts }: PageHeadProps) {
  return (
    <section>
      <p className={styles.eyebrow}>{formatLongDate(now)}</p>
      <h1 className={styles.title}>{greeting(now.time)}, {firstName}</h1>
      <p className={styles.lede}>
        Bugün <strong>{reservations} rezervasyon</strong> ve <strong>{lessons} ders</strong> var.
        <span className="hide-mobile">
          {" "}Şu an {totalCourts} kortun <strong>{possessive(busyCourts)} dolu</strong>.
        </span>
      </p>
    </section>
  );
}
