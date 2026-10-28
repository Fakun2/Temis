import type { Metadata } from "next";
import { HistoryPage } from "@/components/status-page-shell";
import { getStatusSnapshot } from "@/lib/status-feed";

export const revalidate = 60;

export const metadata: Metadata = { title: "Historial" };

export default async function Page() {
  return <HistoryPage snapshot={await getStatusSnapshot()} />;
}
