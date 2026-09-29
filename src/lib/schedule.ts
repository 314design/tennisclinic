import { toMinutes } from "./format";

/** Çalışma aralıkları dışında kalan boşluklar (açılış–kapanış içinde) */
export function gapsOutside(windows: { start: string; end: string }[], open: string, close: string) {
  const sorted = [...windows].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const gaps: { start: string; end: string }[] = [];
  let cursor = open;
  for (const w of sorted) {
    if (toMinutes(w.start) > toMinutes(cursor)) gaps.push({ start: cursor, end: w.start });
    if (toMinutes(w.end) > toMinutes(cursor)) cursor = w.end;
  }
  if (toMinutes(cursor) < toMinutes(close)) gaps.push({ start: cursor, end: close });
  return gaps;
}
