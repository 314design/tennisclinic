import { NextResponse, type NextRequest } from "next/server";

/**
 * Basit parola koruması. PANEL_PASSWORD tanımlıysa tüm panel HTTP Basic Auth ister
 * (kullanıcı adı PANEL_USER, varsayılan "admin"). Canlı ortamda mutlaka tanımlayın.
 */
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function proxy(request: NextRequest) {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return NextResponse.next();
  const user = process.env.PANEL_USER ?? "admin";

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const [u, ...rest] = atob(header.slice(6)).split(":");
    if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return NextResponse.next();
  }
  return new NextResponse("Giriş gerekli", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Tennis Clinic", charset="UTF-8"', "X-Robots-Tag": "noindex, nofollow" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
