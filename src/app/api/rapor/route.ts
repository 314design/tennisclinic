import { addDays, clubNow } from "@/lib/clock";
import { buildExcel } from "@/server/export";

export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Excel özet raporu: ?baslangic=YYYY-MM-DD&bitis=YYYY-MM-DD (varsayılan son 30 gün) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = clubNow();
  let from = url.searchParams.get("baslangic") ?? "";
  let to = url.searchParams.get("bitis") ?? "";
  if (!ISO.test(to)) to = now.date;
  if (!ISO.test(from)) from = addDays(to, -29);
  if (from > to) [from, to] = [to, from];

  const buffer = await buildExcel(from, to);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="tennisclinic-rapor-${from}_${to}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
