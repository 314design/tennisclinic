"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { MemberOption } from "@/server/queries/planning";
import styles from "./MemberPicker.module.css";

interface MemberPickerProps {
  members: MemberOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  /** 1 ise tek seçim */
  max: number;
  /** Listede gösterilmeyecek (zaten derste olan) üyeler */
  exclude?: number[];
  label?: string;
}

const normalize = (v: string) => v.toLocaleLowerCase("tr-TR");

export function MemberPicker({ members, selected, onChange, max, exclude = [], label = "Üye seç" }: MemberPickerProps) {
  const [query, setQuery] = useState("");
  const single = max === 1;
  const visible = useMemo(() => {
    const q = normalize(query.trim());
    return members.filter((m) => !exclude.includes(m.id) && (!q || normalize(m.name).includes(q)));
  }, [members, exclude, query]);

  const toggle = (id: number) => {
    if (single) return onChange([id]);
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else if (selected.length < max) onChange([...selected, id]);
  };

  const full = !single && selected.length >= max;

  return (
    <div className={styles.picker}>
      <div className={styles.head}>
        <span className="field__label">{label}</span>
        {!single && (
          <span className={`${styles.counter} ${full ? styles.full : ""}`}>
            {selected.length}/{max}
          </span>
        )}
      </div>
      <label className={styles.search}>
        <Search className="icon" aria-hidden="true" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İsimle ara" aria-label="Üye ara" />
      </label>
      <ul className={styles.list} role={single ? "radiogroup" : "group"} aria-label={label}>
        {visible.map((m) => {
          const checked = selected.includes(m.id);
          return (
            <li key={m.id}>
              <label className={`${styles.item} ${checked ? styles.checked : ""}`}>
                <input
                  type={single ? "radio" : "checkbox"}
                  name="member"
                  checked={checked}
                  disabled={!checked && full}
                  onChange={() => toggle(m.id)}
                />
                <span className="avatar" aria-hidden="true">{m.initials}</span>
                <span className={styles.text}>
                  <strong>{m.name}</strong>
                  <span>
                    {m.level ?? "Seviye yok"} · Ders hakkı {m.lessonCredits}
                    {m.makeupCredits > 0 && <em> · Telafi {m.makeupCredits}</em>}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
        {!visible.length && <li className="empty">Eşleşen üye yok</li>}
      </ul>
    </div>
  );
}
