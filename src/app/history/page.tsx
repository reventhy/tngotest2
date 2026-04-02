import type { Metadata } from "next";
import HistoryScreen from "@/components/history-screen";
import type { HistoryTab } from "@/lib/history-data";

export const metadata: Metadata = {
  title: "TNGo Lịch sử",
  description: "Lịch sử giao dịch và lịch sử chuyến đi trong luồng TNGo demo.",
};

type HistoryPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const initialTab: HistoryTab = params.tab === "transactions" ? "transactions" : "trips";

  return <HistoryScreen initialTab={initialTab} />;
}
