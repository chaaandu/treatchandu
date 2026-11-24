import type { Metadata, Viewport } from "next";
import { Kalam, Martian_Mono, Rozha_One } from "next/font/google";
import "./globals.css";

// Rozha One and Kalam are from the Indian Type Foundry; Martian Mono carries everything else.
const display = Rozha_One({ variable: "--f-display", subsets: ["latin"], weight: "400" });
const mono = Martian_Mono({ variable: "--f-mono", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const hand = Kalam({ variable: "--f-hand", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://treatchandu.vercel.app"),
  title: "Bribe Desk · Chandu",
  description: "What Chandu is building, when to catch him, and the queue. Sweets move you up.",
  openGraph: { title: "Bribe Desk", description: "Sweets move you up the queue.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#ff4fa0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${hand.variable}`}>
      <body>{children}</body>
    </html>
  );
}
