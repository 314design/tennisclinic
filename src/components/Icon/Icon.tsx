import {
  ChartColumn,
  CalendarDays,
  ClipboardList,
  CloudRain,
  House,
  IdCard,
  LifeBuoy,
  Menu,
  Plus,
  Settings,
  UserPlus,
  UserRound,
  Users,
  UsersRound,
  Wallet,
  Whistle,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { forwardRef } from "react";
import type { IconName } from "@/lib/types";

/** Kort ikonu Lucide'de olmadığı için tasarımdaki çizimle, Lucide ölçülerinde tanımlandı. */
const CourtIcon = forwardRef<SVGSVGElement, LucideProps>(function CourtIcon({ className, ...props }, ref) {
  return (
    <svg ref={ref} viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M12 4v16" />
      <path d="M7 8v8M17 8v8M7 12h10" />
    </svg>
  );
}) as LucideIcon;

/** Veride ikonlar ad olarak tutulur; ad → Lucide bileşeni. */
const ICONS: Record<IconName, LucideIcon> = {
  house: House,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  users: Users,
  "users-round": UsersRound,
  "user-round": UserRound,
  "user-plus": UserPlus,
  whistle: Whistle,
  wallet: Wallet,
  chart: ChartColumn,
  settings: Settings,
  "life-buoy": LifeBuoy,
  court: CourtIcon,
  wrench: Wrench,
  "cloud-rain": CloudRain,
  "id-card": IdCard,
  plus: Plus,
  menu: Menu,
};

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className = "icon" }: IconProps) {
  const Component = ICONS[name];
  return <Component className={className} aria-hidden="true" />;
}
