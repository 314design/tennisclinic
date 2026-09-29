"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MobileBar } from "@/components/MobileBar/MobileBar";
import { QuickActionSheet, type CourtSuggestion } from "@/components/QuickActionSheet/QuickActionSheet";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { TabBar } from "@/components/TabBar/TabBar";
import { Topbar } from "@/components/Topbar/Topbar";
import type { Club, CurrentUser, NavItem, NavSection, QuickAction, TabItem, Weather } from "@/lib/types";
import styles from "./AppShell.module.css";

const SIDEBAR_ID = "sidebar";
const SHEET_ID = "quick-sheet";

interface AppShellProps {
  club: Club;
  user: CurrentUser;
  navSections: NavSection[];
  footerNav: NavItem[];
  tabs: TabItem[];
  unreadNotifications: number;
  quickActions: QuickAction[];
  sheetMeta: string;
  suggestion?: CourtSuggestion;
  weather: Weather | null;
  children: ReactNode;
}

type Overlay = "nav" | "sheet" | null;

export function AppShell(props: AppShellProps) {
  const [overlay, setOverlay] = useState<Overlay>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  const overlayRef = useRef<Overlay>(null);
  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  const close = useCallback(() => {
    // Kapatınca odağı açan düğmeye geri ver
    const opener = overlayRef.current === "sheet" ? fabRef.current : overlayRef.current === "nav" ? menuRef.current : null;
    setOverlay(null);
    opener?.focus();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("is-locked", overlay !== null);
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [overlay, close]);

  return (
    <div className={styles.app}>
      <Sidebar
        id={SIDEBAR_ID}
        club={props.club}
        user={props.user}
        sections={props.navSections}
        footer={props.footerNav}
        open={overlay === "nav"}
        onClose={close}
      />

      <div className={styles.main}>
        <Topbar unreadNotifications={props.unreadNotifications} weather={props.weather} />
        <MobileBar club={props.club} unreadNotifications={props.unreadNotifications} weather={props.weather} />
        <main className={styles.content}>{props.children}</main>
      </div>

      <TabBar
        tabs={props.tabs}
        sheetId={SHEET_ID}
        sidebarId={SIDEBAR_ID}
        sheetOpen={overlay === "sheet"}
        navOpen={overlay === "nav"}
        onToggleSheet={() => (overlay === "sheet" ? close() : setOverlay("sheet"))}
        onOpenNav={() => setOverlay("nav")}
        fabRef={fabRef}
        menuRef={menuRef}
      />

      <div className={`${styles.scrim} ${overlay ? styles.scrimVisible : ""}`} aria-hidden="true" onClick={close} />

      <QuickActionSheet
        id={SHEET_ID}
        open={overlay === "sheet"}
        onClose={close}
        meta={props.sheetMeta}
        suggestion={props.suggestion}
        actions={props.quickActions}
      />
    </div>
  );
}

/** Ekranda iki kartı yan yana dizen satır (1180 px altında alt alta). */
export function Split({ children }: { children: ReactNode }) {
  return <div className={styles.split}>{children}</div>;
}
