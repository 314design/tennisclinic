"use client";

import { ChevronsUpDown, LogOut, MapPin, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/BrandMark/BrandMark";
import { Icon } from "@/components/Icon/Icon";
import type { Club, CurrentUser, NavItem, NavSection } from "@/lib/types";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  id: string;
  club: Club;
  user: CurrentUser;
  sections: NavSection[];
  footer: NavItem[];
  /** Mobilde çekmece açık mı */
  open: boolean;
  onClose: () => void;
}

/** Adres menü öğesinin altındaysa öğe etkin sayılır ("/" yalnızca kendisi) */
export const isCurrent = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const pathname = usePathname();
  return (
    <Link
      className={styles.item}
      href={item.href}
      aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
      title={item.label}
      onClick={onNavigate}
    >
      <Icon name={item.icon} />
      <span className={styles.text}>{item.label}</span>
      {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
      {item.badge && (
        <span className={styles.badge} aria-label={item.badge.label}>
          {item.badge.value}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ id, club, user, sections, footer, open, onClose }: SidebarProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <aside className={`${styles.sidebar} ${open ? styles.open : ""}`} id={id} aria-label="Kulüp menüsü">
      <button ref={closeRef} className={styles.close} type="button" aria-label="Menüyü kapat" onClick={onClose}>
        <X className="icon icon--lg" aria-hidden="true" />
      </button>

      <Link className={styles.brand} href="/" onClick={onClose}>
        <BrandMark />
        <span className={styles.brandText}>
          <span className={styles.brandName}>{club.name}</span>
          <span className={styles.brandSub}>{club.subtitle}</span>
        </span>
      </Link>

      <button className={styles.branch} type="button" aria-label={`Şube değiştir: ${club.branch}`}>
        <span className={styles.branchIcon}>
          <MapPin className="icon" aria-hidden="true" />
        </span>
        <span className={styles.branchText}>
          <span className={styles.branchLabel}>Şube</span>
          <span className={styles.branchName}>{club.branch}</span>
        </span>
        <ChevronsUpDown className={`icon ${styles.branchChev}`} aria-hidden="true" />
      </button>

      <nav className={styles.nav} aria-label="Ana menü">
        {sections.map((section) => (
          <div key={section.label} className={styles.section}>
            <p className={styles.label}>{section.label}</p>
            {section.items.map((item) => (
              <NavLink key={item.label} item={item} onNavigate={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.foot}>
        {footer.map((item) => (
          <NavLink key={item.label} item={item} onNavigate={onClose} />
        ))}
        <div className={styles.me}>
          <span className="avatar avatar--me" aria-hidden="true">{user.initials}</span>
          <span className={styles.meText}>
            <span className={styles.meName}>{user.fullName}</span>
            <span className={styles.meRole}>{user.role}</span>
          </span>
          <button className={styles.logout} type="button" aria-label="Çıkış yap">
            <LogOut className="icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
