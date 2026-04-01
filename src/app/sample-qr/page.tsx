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
          Toan bo phan thong tin phu, huong dan test va QR mau duoc gom vao day. Mo
          trang nay tren laptop, tablet hoac man hinh thu hai de dien thoai scan trong
          luc chay live demo san pham.
        </p>
        <div className={styles.linkRow}>
          <Link className={styles.primaryLink} href="/">
            Ve live demo
          </Link>
        </div>
      </section>

      <section className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <h2>Live demo route</h2>
          <p>
            Route <code>/</code> chi giu dung phone UI theo layout Figma cho flow live
            demo.
          </p>
          <ul>
            <li>Tim xe bang live camera.</li>
            <li>Quet QR that tren camera.</li>
            <li>Mo khoa xe qua local API.</li>
            <li>Xu ly nhanh xe unavailable.</li>
          </ul>
        </article>

        <article className={styles.infoCard}>
          <h2>Cach test</h2>
          <ul>
            <li>Mo <code>/</code> tren dien thoai co quyen camera.</li>
            <li>Mo trang nay tren man hinh thu hai de hien QR mau.</li>
            <li>Neu khong co man hinh thu hai, nhap raw value thu cong trong modal.</li>
          </ul>
        </article>

        <article className={styles.infoCard}>
          <h2>Demo notes</h2>
          <ul>
            <li>Object detection dung COCO-SSD chay local trong browser.</li>
            <li>QR scan uu tien BarcodeDetector, fallback sang jsQR.</li>
            <li>Du lieu xe va lenh mo khoa di qua Next.js API routes.</li>
            <li>Khong can backend rieng de deploy demo.</li>
          </ul>
        </article>
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
