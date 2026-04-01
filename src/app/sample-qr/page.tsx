import type { Metadata } from "next";
import Link from "next/link";
import QRCode from "qrcode";
import styles from "./page.module.css";
import { DEMO_VEHICLES } from "@/lib/demo-data";

type QrSampleCard = {
  id: string;
  title: string;
  value: string;
  status: "available" | "unavailable";
  svg: string;
};

export const metadata: Metadata = {
  title: "TNGo Sample QR",
  description: "Trang QR mau tach rieng de test flow scan QR cua demo TNGo.",
};

async function buildQrCards() {
  const targets = DEMO_VEHICLES.filter(
    (vehicle, index, vehicles) =>
      vehicle.status === "unavailable" ||
      vehicles.findIndex((item) => item.status === "available") === index,
  );

  return Promise.all(
    targets.map(async (vehicle) => ({
      id: vehicle.id,
      title:
        vehicle.status === "available"
          ? "QR mo khoa thanh cong"
          : "QR unavailable",
      value: vehicle.qrValue,
      status: vehicle.status,
      svg: await QRCode.toString(vehicle.qrValue, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 2,
        width: 360,
        color: { dark: "#111111", light: "#ffffff" },
      }),
    })),
  ) satisfies Promise<QrSampleCard[]>;
}

export default async function SampleQrPage() {
  const cards = await buildQrCards();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>TNGo QR samples</p>
        <h1 className={styles.title}>QR mau da duoc tach thanh mot web rieng.</h1>
        <p className={styles.description}>
          Mo trang nay tren laptop, tablet hoac man hinh thu hai de dien thoai scan
          trong luc chay live demo san pham.
        </p>
        <div className={styles.linkRow}>
          <Link className={styles.primaryLink} href="/">
            Ve live demo
          </Link>
        </div>
      </section>

      <section className={styles.grid}>
        {cards.map((card) => (
          <article key={card.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span
                className={`${styles.badge} ${
                  card.status === "available" ? styles.badgeAvailable : styles.badgeUnavailable
                }`}
              >
                {card.status}
              </span>
              <strong>{card.title}</strong>
            </div>
            <div
              aria-label={card.title}
              className={styles.qrFrame}
              dangerouslySetInnerHTML={{ __html: card.svg }}
            />
            <div className={styles.meta}>
              <span>{card.id}</span>
              <code>{card.value}</code>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
