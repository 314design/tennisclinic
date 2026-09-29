import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin", "latin-ext"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Genel Bakış · Tennis Clinic",
  description: "Tennis Clinic kulüp yönetim paneli",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Tarayıcı çubuğu rengi (--tc-green-night); meta etiketi CSS değişkeni okuyamaz
  themeColor: "#122A20",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={urbanist.variable}>
      <body>{children}</body>
    </html>
  );
}
