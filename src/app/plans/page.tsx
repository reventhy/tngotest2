import type { Metadata } from "next";
import SubscriptionScreen from "@/components/subscription-screen";

export const metadata: Metadata = {
  title: "TNGo Chọn gói cước",
  description: "Luồng chọn gói cước trước khi bắt đầu thuê xe TNGo.",
};

type PlansPageProps = {
  searchParams: Promise<{
    tab?: string;
  }>;
};

export default async function PlansPage({ searchParams }: PlansPageProps) {
  const params = await searchParams;
  const initialTab =
    params.tab === "daily" || params.tab === "monthly" || params.tab === "single"
      ? params.tab
      : "single";

  return <SubscriptionScreen initialTab={initialTab} />;
}
