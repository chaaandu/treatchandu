import type { Metadata } from "next";
import Kitchen from "@/components/Kitchen";

export const metadata: Metadata = { title: "Kitchen · Bribe Desk", robots: { index: false } };

export default function Page() {
  return <Kitchen />;
}
