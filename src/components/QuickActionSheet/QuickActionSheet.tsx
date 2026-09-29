"use client";

import { ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon/Icon";
import type { QuickAction } from "@/lib/types";
import styles from "./QuickActionSheet.module.css";

export interface CourtSuggestion {
  courtName: string;
  surface: string;
  /** "18:00'e kadar boş" */
  freeText: string;
  freeMinutes?: number;
}

interface QuickActionSheetProps {
  id: string;
  open: boolean;
  onClose: () => void;
  /** "Merkez Kulüp · 28 Eylül, 17:30" */
  meta: string;
  suggestion?: CourtSuggestion;
  actions: QuickAction[];
}

const TONE_CLASS: Record<QuickAction["tone"], string> = {
  primary: styles.iconPrimary,
  lime: styles.iconLime,
  sage: styles.iconSage,
  warn: styles.iconWarn,
};

export function QuickActionSheet({ id, open, onClose, meta, suggestion, actions }: QuickActionSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <section className={`${styles.sheet} ${open ? styles.open : ""}`} id={id} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <span className={styles.grip} aria-hidden="true" />
      <div className={styles.head}>
        <div>
          <h2 className={styles.title} id={`${id}-title`}>Hızlı işlem</h2>
          <p className="card__meta">{meta}</p>
        </div>
        <button ref={closeRef} className={styles.close} type="button" aria-label="Kapat" onClick={onClose}>
          <X className="icon icon--lg" aria-hidden="true" />
        </button>
      </div>

      {suggestion && (
        <div className={styles.suggest}>
          <div className={styles.suggestText}>
            <span className={styles.eyebrow}>Şu an müsait</span>
            <strong>{suggestion.courtName} · {suggestion.surface}</strong>
            <span>
              {suggestion.freeText}
              {suggestion.freeMinutes !== undefined && ` · ${suggestion.freeMinutes} dk`}
            </span>
          </div>
          <button className="btn btn--primary" type="button">
            <Plus className="icon icon--sm" aria-hidden="true" />
            Hemen ayır
          </button>
        </div>
      )}

      <div className={styles.actions}>
        {actions.map((a) => (
          <a key={a.id} className={styles.action} href={a.href}>
            <span className={`${styles.actionIcon} ${TONE_CLASS[a.tone]}`}>
              <Icon name={a.icon} />
            </span>
            <span className={styles.actionText}>
              <strong>{a.title}</strong>
              {a.description}
            </span>
            <ChevronRight className={`icon ${styles.chev}`} aria-hidden="true" />
          </a>
        ))}
      </div>
    </section>
  );
}
