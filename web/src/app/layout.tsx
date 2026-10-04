import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const telugu = Noto_Sans_Telugu({ subsets: ["telugu"], variable: "--font-telugu", display: "swap", weight: ["400", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Kodikura Pappucharu", template: "%s · Kodikura Pappucharu" },
  description: "Scan, order and pay at your table — authentic Telugu home-style meals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#b8321f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${telugu.variable}`}>
      <body style={{ fontFamily: "var(--font-body), var(--font-telugu), system-ui, sans-serif" }} className="antialiased">
        {children}
      </body>
    </html>
  );
}
