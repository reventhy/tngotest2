"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TRANSACTION_HISTORY,
  TRIP_HISTORY,
  type HistoryTab,
  type TransactionHistoryItem,
  type TripHistoryItem,
} from "@/lib/history-data";
import styles from "./history-screen.module.css";

type HistoryScreenProps = {
  initialTab?: HistoryTab;
};

type MetricProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricProps) {
  return (
    <div className={styles.metricCard}>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricLabel}>{label}</p>
    </div>
  );
}

function TripHistoryCard({
  trip,
  onOpenDetail,
}: {
  trip: TripHistoryItem;
  onOpenDetail: (tripId: string) => void;
}) {
  return (
    <article className={styles.tripCard}>
      <button className={styles.tripCardButton} onClick={() => onOpenDetail(trip.id)} type="button">
        <div className={styles.cardHeaderRow}>
          <p className={styles.vehicleLabel}>{trip.vehicle}</p>
          <p className={styles.dateLabel}>{trip.date}</p>
        </div>

        <p className={styles.tripMeta}>
          {trip.dateTime} • {trip.status}
        </p>

        <div className={styles.metricsRow}>
          <MetricCard label="Quãng đường" value={trip.distance} />
          <MetricCard label="Thời lượng" value={trip.duration} />
          <MetricCard label="Thanh toán" value={trip.payment} />
        </div>

        <div className={styles.tripFooterRow}>
          <p className={styles.tripId}>Mã chuyến đi: {trip.id}</p>
          <span className={styles.tripAction}>Xem chi tiết</span>
        </div>
      </button>
    </article>
  );
}

function TransactionHistoryCard({ transaction }: { transaction: TransactionHistoryItem }) {
  return (
    <article className={styles.transactionCard}>
      <span aria-hidden="true" className={styles.transactionIcon} />

      <div className={styles.transactionBody}>
        <p className={styles.transactionTitle}>{transaction.title}</p>
        <p className={styles.transactionMeta}>{transaction.status}</p>
        <p className={styles.transactionSubMeta}>{transaction.account}</p>
        <p className={styles.transactionSubMeta}>Mã GD: {transaction.id}</p>
      </div>

      <div className={styles.transactionAmountCol}>
        <p className={styles.transactionSubMeta}>{transaction.date}</p>
        <p className={styles.transactionAmount}>{transaction.amount}</p>
        <p className={styles.transactionMeta}>{transaction.amountStatus}</p>
      </div>
    </article>
  );
}

export default function HistoryScreen({ initialTab = "trips" }: HistoryScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [copiedTripId, setCopiedTripId] = useState<string | null>(null);

  const selectedTrip = TRIP_HISTORY.find((trip) => trip.id === selectedTripId) ?? null;

  function handleBack() {
    if (selectedTrip) {
      setSelectedTripId(null);
      return;
    }

    router.push("/");
  }

  async function handleCopyTripId(tripId: string) {
    try {
      await navigator.clipboard.writeText(tripId);
      setCopiedTripId(tripId);
      window.setTimeout(() => {
        setCopiedTripId((current) => (current === tripId ? null : current));
      }, 1800);
    } catch {
      setCopiedTripId(tripId);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="Lịch sử TNGo">
        <header className={styles.topBar}>
          <button aria-label="Quay lại" className={styles.backButton} onClick={handleBack} type="button">
            ‹
          </button>
          <h1 className={styles.topBarTitle}>
            {selectedTrip ? "Chi tiết chuyến đi" : "Lịch sử"}
          </h1>
          <div aria-hidden="true" className={styles.topBarSpacer} />
        </header>

        {selectedTrip ? (
          <div className={styles.detailScroll}>
            <div className={styles.mapSection}>
              <Image
                alt="Bản đồ hành trình chuyến đi"
                className={styles.mapImage}
                height={298}
                priority
                src="/history/trip-route-map.svg"
                width={402}
              />
            </div>

            <div className={styles.detailContent}>
              <article className={styles.detailCard}>
                <div className={styles.cardHeaderRow}>
                  <p className={styles.vehicleLabel}>{selectedTrip.vehicle}</p>
                  <p className={styles.dateLabel}>{selectedTrip.date}</p>
                </div>

                <p className={styles.tripMeta}>
                  {selectedTrip.dateTime} • {selectedTrip.status}
                </p>

                <div className={styles.metricsRow}>
                  <MetricCard label="Quãng đường" value={selectedTrip.distance} />
                  <MetricCard label="Thời lượng" value={selectedTrip.duration} />
                  <MetricCard label="Thanh toán" value={selectedTrip.payment} />
                </div>

                <div className={styles.detailInfoRow}>
                  <span>Giảm thiểu Carbon</span>
                  <strong className={styles.detailInfoValue}>{selectedTrip.carbonSaved}</strong>
                </div>
                <div className={styles.detailInfoRow}>
                  <span>Calo tiêu thụ</span>
                  <strong className={styles.detailInfoValue}>{selectedTrip.calories}</strong>
                </div>
                <div className={styles.detailInfoRow}>
                  <span>Hình thức</span>
                  <strong className={styles.detailInfoValue}>{selectedTrip.packageType}</strong>
                </div>
                <div className={styles.detailInfoRow}>
                  <span>Nợ cước</span>
                  <strong className={styles.detailInfoValue}>{selectedTrip.debt}</strong>
                </div>

                <div className={styles.detailInfoRow}>
                  <span>Mã chuyến đi: {selectedTrip.id}</span>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopyTripId(selectedTrip.id)}
                    type="button"
                  >
                    {copiedTripId === selectedTrip.id ? "Đã sao chép" : "Sao chép mã"}
                  </button>
                </div>
              </article>

              <section className={styles.summaryGrid} aria-label="Tổng kết thanh toán">
                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Tài khoản chính</p>
                  <p className={styles.summaryValue}>{selectedTrip.mainAccountDelta}</p>
                </article>
                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Tài khoản KM</p>
                  <p className={styles.summaryValue}>{selectedTrip.promoAccountDelta}</p>
                </article>
                <article className={styles.summaryCard}>
                  <p className={styles.summaryLabel}>Số tiền còn lại</p>
                  <p className={styles.summaryValue}>{selectedTrip.balanceAfter}</p>
                </article>
              </section>
            </div>
          </div>
        ) : (
          <>
            <section className={styles.tabsSection} aria-label="Chọn tab lịch sử">
              <div className={styles.segmentedTabs}>
                <button
                  className={`${styles.tabButton} ${activeTab === "transactions" ? styles.tabButtonActive : ""}`}
                  onClick={() => setActiveTab("transactions")}
                  type="button"
                >
                  Lịch sử giao dịch
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === "trips" ? styles.tabButtonActive : ""}`}
                  onClick={() => setActiveTab("trips")}
                  type="button"
                >
                  Lịch sử chuyến đi
                </button>
              </div>
            </section>

            <div className={styles.scrollArea}>
              <div className={styles.content}>
                <p className={styles.helperText}>
                  Chạm tab để chuyển giữa giao dịch thanh toán và các chuyến đi đã hoàn tất.
                </p>

                {activeTab === "trips" ? (
                  <section className={styles.cardList} aria-label="Danh sách lịch sử chuyến đi">
                    {TRIP_HISTORY.map((trip) => (
                      <TripHistoryCard key={trip.id} onOpenDetail={setSelectedTripId} trip={trip} />
                    ))}
                  </section>
                ) : (
                  <section className={styles.cardList} aria-label="Danh sách lịch sử giao dịch">
                    {TRANSACTION_HISTORY.length > 0 ? (
                      TRANSACTION_HISTORY.map((transaction) => (
                        <TransactionHistoryCard key={transaction.id} transaction={transaction} />
                      ))
                    ) : (
                      <div className={styles.emptyState}>Chưa có giao dịch nào được ghi nhận.</div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}

        <div className={styles.homeIndicatorArea} aria-hidden="true">
          <div className={styles.homeIndicator} />
        </div>
      </section>
    </main>
  );
}
