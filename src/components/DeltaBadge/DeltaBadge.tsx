import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { Delta } from "@/lib/types";

const ICON = { up: ArrowUpRight, down: ArrowDownRight, flat: ArrowRight };

export function DeltaBadge({ delta }: { delta: Delta }) {
  const Icon = ICON[delta.direction];
  return (
    <span className={`delta ${delta.direction === "down" ? "delta--down" : ""}`}>
      <Icon className="icon icon--xs" aria-hidden="true" />
      <span>{delta.text}</span>
    </span>
  );
}
