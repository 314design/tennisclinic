import { Menu, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RefObject } from "react";
import { isCurrent } from "@/components/Sidebar/Sidebar";
import { Icon } from "@/components/Icon/Icon";
import type { TabItem } from "@/lib/types";
import styles from "./TabBar.module.css";

interface TabBarProps {
  tabs: TabItem[];
  sheetId: string;
  sidebarId: string;
  sheetOpen: boolean;
  navOpen: boolean;
  onToggleSheet: () => void;
  onOpenNav: () => void;
  fabRef: RefObject<HTMLButtonElement | null>;
  menuRef: RefObject<HTMLButtonElement | null>;
}

function Tab({ tab }: { tab: TabItem }) {
  const pathname = usePathname();
  return (
    <Link className={styles.tab} href={tab.href} aria-current={isCurrent(pathname, tab.href) ? "page" : undefined}>
      <span className={styles.tabIcon}>
        <Icon name={tab.icon} />
      </span>
      {tab.label}
    </Link>
  );
}

export function TabBar({ tabs, sheetId, sidebarId, sheetOpen, navOpen, onToggleSheet, onOpenNav, fabRef, menuRef }: TabBarProps) {
  // + düğmesi ortada: ilk iki sekme solda, kalanlar sağda
  const left = tabs.slice(0, 2);
  const right = tabs.slice(2);
  return (
    <nav className={styles.tabbar} aria-label="Alt menü">
      {left.map((t) => (
        <Tab key={t.label} tab={t} />
      ))}
      <button
        ref={fabRef}
        className={`${styles.fab} ${sheetOpen ? styles.fabOpen : ""}`}
        type="button"
        aria-label="Hızlı işlem"
        aria-controls={sheetId}
        aria-expanded={sheetOpen}
        onClick={onToggleSheet}
      >
        <Plus className="icon" aria-hidden="true" />
      </button>
      {right.map((t) => (
        <Tab key={t.label} tab={t} />
      ))}
      <button ref={menuRef} className={styles.tab} type="button" aria-controls={sidebarId} aria-expanded={navOpen} onClick={onOpenNav}>
        <span className={styles.tabIcon}>
          <Menu className="icon" aria-hidden="true" />
        </span>
        Menü
      </button>
    </nav>
  );
}
