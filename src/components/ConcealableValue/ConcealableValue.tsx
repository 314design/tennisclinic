"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSyncExternalStore } from "react";
import styles from "./ConcealableValue.module.css";

const KEY = "tc.hideRevenue";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function write(hidden: boolean) {
  try {
    localStorage.setItem(KEY, hidden ? "1" : "0");
  } catch {
    /* depolama kapalıysa yalnızca bu oturumda geçerli */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
};

/** Tutarı göz ikonuyla "₺*****" olarak gizler; tercih tarayıcıda hatırlanır */
export function ConcealableValue({ value, label }: { value: string; label: string }) {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  return (
    <span className={styles.wrap}>
      <span aria-live="polite">{hidden ? <span aria-label={`${label} gizli`}>₺*****</span> : value}</span>
      <button
        type="button"
        className={styles.toggle}
        aria-pressed={hidden}
        aria-label={hidden ? `${label} göster` : `${label} gizle`}
        title={hidden ? "Göster" : "Gizle"}
        onClick={() => write(!hidden)}
      >
        {hidden ? <EyeOff className="icon" aria-hidden="true" /> : <Eye className="icon" aria-hidden="true" />}
      </button>
    </span>
  );
}
