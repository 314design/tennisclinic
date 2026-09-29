import { clubNow } from "@/lib/clock";
import { buildBackup } from "@/server/export";

export const dynamic = "force-dynamic";

/** Tam yedek (tüm tablolar, JSON). Panel parolası bu adres için de geçerlidir. */
export async function GET() {
  const backup = await buildBackup();
  const now = clubNow();
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="tennisclinic-yedek-${now.date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
