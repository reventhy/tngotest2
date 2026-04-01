import type { Metadata } from "next";
import HomeScreen from "@/components/home-screen";

export const metadata: Metadata = {
  title: "TNGo Home",
  description: "Màn hình vào đầu tiên cho web live demo TNGo.",
};

export default function Home() {
  return <HomeScreen />;
}
