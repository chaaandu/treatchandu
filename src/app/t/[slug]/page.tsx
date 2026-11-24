import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import TokenView from "@/components/TokenView";
import { publicToken } from "@/lib/state";
import { store } from "@/lib/store";

export const metadata: Metadata = { title: "Your token · Bribe Desk", robots: { index: false } };

export default async function TokenPage({ params }: PageProps<"/t/[slug]">) {
  await connection();
  const { slug } = await params;
  const s = store();
  const [requests, offers] = await Promise.all([s.requests(), s.offers()]);
  const r = requests.find((x) => x.slug === slug);
  if (!r) notFound();
  return (
    <main className="page">
      <TokenView slug={slug} initial={publicToken(r, offers, Date.now(), true)} detail={r.detail} link={r.link} />
    </main>
  );
}
