"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { MemberPicker } from "@/components/MemberPicker/MemberPicker";
import { Modal } from "@/components/Modal/Modal";
import { formatDayLabel } from "@/lib/format";
import { addMembersToBooking } from "@/server/actions/bookings";
import type { GroupLesson, MemberOption } from "@/server/queries/planning";
import styles from "./GroupLessons.module.css";

interface GroupLessonsProps {
  groups: GroupLesson[];
  members: MemberOption[];
  coachName: string;
  today: string;
}

/** Antrenörün yaklaşan grup dersleri: seviye, doluluk (en fazla 6) ve öğrenci ekleme */
export function GroupLessons({ groups, members, coachName, today }: GroupLessonsProps) {
  const [target, setTarget] = useState<GroupLesson | null>(null);

  return (
    <section className="card" aria-labelledby="groups-title">
      <header className="card__head">
        <div>
          <h2 className="card__title" id="groups-title">{coachName} · grup dersleri</h2>
          <p className="card__meta">Önümüzdeki 14 gün · seviye ve kontenjan</p>
        </div>
      </header>
      {groups.length ? (
        <ul className={styles.list}>
          {groups.map((g) => {
            const left = g.capacity - g.members.length;
            return (
              <li key={g.id} className={styles.group}>
                <div className={styles.when}>
                  <strong>{formatDayLabel(g.date, today)}</strong>
                  <span>{g.start}–{g.end} · {g.courtName}</span>
                </div>
                <div className={styles.info}>
                  <Link href={`/seanslar/${g.id}`} className={styles.title}>{g.title}</Link>
                  {g.level && <span className="chip chip--sm chip--ok">{g.level}</span>}
                </div>
                <div className={styles.fill}>
                  <span>{g.members.length}/{g.capacity} kişi</span>
                  <span className={styles.bar} aria-hidden="true">
                    {Array.from({ length: g.capacity }, (_, i) => (
                      <i key={i} className={i < g.members.length ? styles.on : undefined} />
                    ))}
                  </span>
                </div>
                <button className="btn btn--sm btn--outline" type="button" disabled={left <= 0} onClick={() => setTarget(g)}>
                  <UserPlus className="icon icon--sm" aria-hidden="true" />
                  {left > 0 ? "Öğrenci ekle" : "Dolu"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="empty">Bu antrenörün önümüzdeki 14 günde grup dersi yok.</p>
      )}

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Gruba öğrenci ekle"
        description={target && `${target.title} · ${target.level ?? ""} · ${formatDayLabel(target.date, today)} ${target.start}`}
      >
        {target && <AddToGroup key={target.id} group={target} members={members} onDone={() => setTarget(null)} />}
      </Modal>
    </section>
  );
}

function AddToGroup({ group, members, onDone }: { group: GroupLesson; members: MemberOption[]; onDone: () => void }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [useMakeup, setUseMakeup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const left = group.capacity - group.members.length;

  const submit = () =>
    startTransition(async () => {
      const res = await addMembersToBooking({ bookingId: group.id, memberIds: selected, useMakeup });
      if (res.ok) onDone();
      else setError(res.error);
    });

  return (
    <div className="form">
      <MemberPicker members={members} selected={selected} onChange={setSelected} max={left} exclude={group.members.map((m) => m.id)} label={`Öğrenciler (${left} yer kaldı)`} />
      <label className="check">
        <input type="checkbox" checked={useMakeup} onChange={(e) => setUseMakeup(e.target.checked)} />
        <span>Telafi hakkı olanlarda telafiden düş</span>
      </label>
      {error && <p className="notice notice--error" role="alert">{error}</p>}
      <div className="form-actions">
        <button className="btn" type="button" onClick={onDone}>Vazgeç</button>
        <button className="btn btn--primary" type="button" disabled={pending || !selected.length} onClick={submit}>
          {pending ? "Ekleniyor…" : `${selected.length || ""} öğrenci ekle`}
        </button>
      </div>
    </div>
  );
}
