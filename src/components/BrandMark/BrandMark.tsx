import styles from "./BrandMark.module.css";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={`${styles.mark} ${className ?? ""}`} viewBox="0 0 36 36" aria-hidden="true" focusable="false">
      <circle className={styles.ball} cx="18" cy="18" r="18" />
      <path className={styles.seam} d="M18 10.5V25.5M11.5 14.25L24.5 21.75M24.5 14.25L11.5 21.75" />
    </svg>
  );
}
