import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Rozha_One } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--f-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--f-mono", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--f-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const sign = Rozha_One({ variable: "--f-sign", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://treat.chandumachineni.com"),
  title: "Bribe Desk · Chandu",
  description: "What Chandu is building, when to catch him, and the queue. Sweets move you up.",
  openGraph: { title: "Bribe Desk", description: "Sweets move you up the queue.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#2f74d0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable} ${sign.variable}`}>
      <body>{children}</body>
    </html>
  );
}
