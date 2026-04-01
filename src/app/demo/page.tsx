import type { Metadata } from "next";
import ObjectTrackingDemo from "@/components/object-tracking-demo";

export const metadata: Metadata = {
  title: "TNGo Live Demo",
  description: "Luồng live demo object tracking, quét QR và mở khóa xe TNGo.",
};

export default function DemoPage() {
  return <ObjectTrackingDemo />;
}
