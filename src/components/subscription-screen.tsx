"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./subscription-screen.module.css";

type SubscriptionTab = "single" | "daily" | "monthly";
type SubscriptionStep = "selection" | "confirm" | "success";

type SubscriptionPlan = {
  id: string;
  title: string;
  variantLabel: string;
  price: number;
  priceLabel: string;
  minutesLabel: string;
  durationUnit: string;
  overtimeLabel: string;
  ctaLabel: string;
  disclaimer: string;
};

type TabConfig = {
  label: string;
  plans: SubscriptionPlan[];
};

const TAB_ORDER: SubscriptionTab[] = ["single", "daily", "monthly"];

const TAB_CONFIG: Record<SubscriptionTab, TabConfig> = {
  single: {
    label: "1 lượt",
    plans: [
      {
        id: "single-bicycle",
        title: "TNGo Bicycle",
        variantLabel: "Xe đạp",
        price: 10000,
        priceLabel: "10.000đ",
        minutesLabel: "60",
        durationUnit: "phút",
        overtimeLabel: "Phí quá hạn: 3.000/15 mins",
        ctaLabel: "Đăng ký cho 1 lượt",
        disclaimer: "Hạn sử dụng: 60 phút từ khi mở khóa xe",
      },
      {
        id: "single-ebicycle",
        title: "TNGo e-Bicycle",
        variantLabel: "Xe đạp điện",
        price: 10000,
        priceLabel: "10.000đ",
        minutesLabel: "60",
        durationUnit: "phút",
        overtimeLabel: "Phí quá hạn: 6.000/15 mins",
        ctaLabel: "Đăng ký cho 1 lượt",
        disclaimer: "Hạn sử dụng: 60 phút từ khi mở khóa xe",
      },
    ],
  },
  daily: {
    label: "1 ngày",
    plans: [
      {
        id: "daily-bicycle",
        title: "TNGo Bicycle",
        variantLabel: "Xe đạp",
        price: 50000,
        priceLabel: "50.000đ",
        minutesLabel: "450",
        durationUnit: "phút",
        overtimeLabel: "Phí quá hạn: 3.000/15 mins",
        ctaLabel: "Đăng ký cho 1 ngày",
        disclaimer: "Hạn sử dụng: 450 phút trong 1 ngày",
      },
      {
        id: "daily-ebicycle",
        title: "TNGo e-Bicycle",
        variantLabel: "Xe đạp điện",
        price: 100000,
        priceLabel: "100.000đ",
        minutesLabel: "450",
        durationUnit: "phút",
        overtimeLabel: "Phí quá hạn: 6.000/15 mins",
        ctaLabel: "Đăng ký cho 1 ngày",
        disclaimer: "Hạn sử dụng: 450 phút trong 1 ngày",
      },
    ],
  },
  monthly: {
    label: "30 ngày",
    plans: [
      {
        id: "monthly-starter",
        title: "TNGo Bicycle",
        variantLabel: "45 phút/chuyến",
        price: 79000,
        priceLabel: "79.000đ",
        minutesLabel: "45",
        durationUnit: "phút/chuyến",
        overtimeLabel: "Phí quá hạn: 3.000/15 mins",
        ctaLabel: "Đăng ký cho 30 ngày",
        disclaimer: "Hạn sử dụng: theo gói 30 ngày đã chọn",
      },
      {
        id: "monthly-flex",
        title: "TNGo Bicycle",
        variantLabel: "720 phút/tháng",
        price: 300000,
        priceLabel: "300.000đ",
        minutesLabel: "720",
        durationUnit: "phút/chuyến",
        overtimeLabel: "Phí quá hạn: 3.000/15 mins",
        ctaLabel: "Đăng ký cho 30 ngày",
        disclaimer: "Hạn sử dụng: theo gói 30 ngày đã chọn",
      },
      {
        id: "monthly-max",
        title: "TNGo Bicycle",
        variantLabel: "1440 phút/tháng",
        price: 500000,
        priceLabel: "500.000đ",
        minutesLabel: "1440",
        durationUnit: "phút/chuyến",
        overtimeLabel: "Phí quá hạn: 3.000/15 mins",
        ctaLabel: "Đăng ký cho 30 ngày",
        disclaimer: "Hạn sử dụng: theo gói 30 ngày đã chọn",
      },
    ],
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getTicketLabel(tab: SubscriptionTab) {
  if (tab === "single") {
    return "Vé lượt";
  }

  if (tab === "daily") {
    return "Vé ngày";
  }

  return "Vé 30 ngày";
}

export default function SubscriptionScreen({
  initialTab = "single",
}: {
  initialTab?: SubscriptionTab;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SubscriptionTab>(initialTab);
  const [step, setStep] = useState<SubscriptionStep>("selection");
  const [quantity, setQuantity] = useState(1);
  const [selectedPlanByTab, setSelectedPlanByTab] = useState<Record<SubscriptionTab, string>>({
    single: TAB_CONFIG.single.plans[0].id,
    daily: TAB_CONFIG.daily.plans[0].id,
    monthly: TAB_CONFIG.monthly.plans[0].id,
  });

  const activePlans = TAB_CONFIG[activeTab].plans;
  const selectedPlanId = selectedPlanByTab[activeTab];
  const selectedPlan =
    activePlans.find((plan) => plan.id === selectedPlanId) ?? activePlans[0];
  const totalAmount = selectedPlan.price * quantity;
  const ticketLabel = getTicketLabel(activeTab);

  function handleBack() {
    if (step === "success") {
      setStep("confirm");
      return;
    }

    if (step === "confirm") {
      setStep("selection");
      return;
    }

    router.push("/");
  }

  function handleTabChange(tab: SubscriptionTab) {
    setActiveTab(tab);
    setStep("selection");
  }

  function handlePlanSelect(planId: string) {
    setSelectedPlanByTab((current) => ({
      ...current,
      [activeTab]: planId,
    }));
  }

  function handleOpenConfirmation() {
    setStep("confirm");
  }

  function handleConfirmPurchase() {
    setStep("success");
  }

  function handleContinueToRental() {
    const params = new URLSearchParams({
      from: "subscription",
      tab: activeTab,
      plan: selectedPlan.id,
      qty: String(quantity),
    });

    router.push(`/demo?${params.toString()}`);
  }

  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="Chọn gói cước TNGo">
        <header className={styles.statusBar}>
          <div className={styles.statusTime}>9:41</div>
          <div className={styles.statusIcons}>
            <Image alt="" aria-hidden="true" height={12} src="/figma-home/cellular.svg" width={19} />
            <Image alt="" aria-hidden="true" height={12} src="/figma-home/wifi.svg" width={17} />
            <Image alt="" aria-hidden="true" height={13} src="/figma-home/battery.svg" width={27} />
          </div>
        </header>

        {step === "success" ? (
          <div className={styles.successScreen}>
            <section className={styles.successHero}>
              <button
                aria-label="Quay lại bước xác nhận"
                className={styles.backButton}
                onClick={handleBack}
                type="button"
              >
                ‹
              </button>

              <div className={styles.successBadge}>
                <div className={styles.successBadgeInner}>✓</div>
              </div>
              <h1 className={styles.successTitle}>Mua thành công</h1>
              <p className={styles.successSubtitle}>
                Vé của bạn đã sẵn sàng. Hãy đến xe và quét QR để mở khóa.
              </p>
            </section>

            <section className={styles.successCard}>
              <div className={styles.successCardHeader}>
                <div>
                  <p className={styles.successCardEyebrow}>Bước tiếp theo</p>
                  <h2>Quét mã QR trên xe</h2>
                </div>
                <span className={styles.successTicketPill}>{ticketLabel}</span>
              </div>

              <p className={styles.successCardCopy}>
                Đưa tem QR của xe vào khung quét trong ứng dụng TNGo để bắt đầu chuyến đi.
              </p>

              <div className={styles.scanPreview}>
                <div className={styles.qrPreview}>
                  <div className={styles.qrCorners} />
                  <span>Tem QR trên xe</span>
                </div>
                <div className={styles.phonePreview}>
                  <div className={styles.phoneCamera} />
                  <div className={styles.phoneScannerFrame} />
                  <span>Màn quét QR</span>
                </div>
              </div>

              <p className={styles.scanNote}>
                Sau khi quét thành công, xe sẽ tự mở khóa.
              </p>
            </section>

            <section className={styles.successFooter}>
              <button className={styles.primaryCta} onClick={handleContinueToRental} type="button">
                <span>Thuê xe ngay</span>
                <span className={styles.ctaAmount}>{formatCurrency(totalAmount)}đ</span>
                <span className={styles.ctaArrow}>→</span>
              </button>
            </section>
          </div>
        ) : (
          <>
            <section className={styles.hero}>
              <button
                aria-label="Quay lại bước trước"
                className={styles.backButton}
                onClick={handleBack}
                type="button"
              >
                ‹
              </button>
              <Image
                alt="TNGo"
                className={styles.heroLogo}
                height={145}
                priority
                src="/subscriptions/tngo-hero.svg"
                width={260}
              />
            </section>

            <div className={styles.content}>
              <section className={styles.tabGroup} aria-label="Chọn loại gói cước">
                {TAB_ORDER.map((tab) => {
                  const isActive = tab === activeTab;
                  return (
                    <button
                      className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ""}`}
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      type="button"
                    >
                      {TAB_CONFIG[tab].label}
                    </button>
                  );
                })}
              </section>

              <section className={styles.planList} aria-label="Danh sách gói cước">
                {activePlans.map((plan) => {
                  const isSelected = plan.id === selectedPlan.id;
                  return (
                    <button
                      className={`${styles.planCard} ${isSelected ? styles.planCardSelected : ""}`}
                      key={plan.id}
                      onClick={() => handlePlanSelect(plan.id)}
                      type="button"
                    >
                      <Image
                        alt=""
                        aria-hidden="true"
                        className={styles.planIcon}
                        height={64}
                        src="/subscriptions/vehicle-icon.svg"
                        width={64}
                      />

                      <div className={styles.planInfo}>
                        <div className={styles.planHeader}>
                          <p className={styles.planTitle}>{plan.title}</p>
                          <span
                            className={`${styles.selectionDot} ${isSelected ? styles.selectionDotActive : ""}`}
                            aria-hidden="true"
                          />
                        </div>
                        <p className={styles.planVariant}>{plan.variantLabel}</p>
                        <div className={styles.planMeta}>
                          <p className={styles.planPrice}>{plan.priceLabel}</p>
                          <p className={styles.planMinutes}>{plan.minutesLabel}</p>
                        </div>
                        <div className={styles.planSubMeta}>
                          <p>{plan.overtimeLabel}</p>
                          <p>{plan.durationUnit}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </section>

              <button className={styles.promoButton} type="button">
                <span>Mã khuyến mãi</span>
                <span className={styles.promoArrow}>→</span>
              </button>
            </div>

            <section className={styles.footer}>
              <div className={styles.quantityRow}>
                <p>Số vé</p>
                <div className={styles.quantityControls}>
                  <button
                    aria-label="Giảm số vé"
                    className={styles.quantityButton}
                    disabled={quantity === 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    type="button"
                  >
                    −
                  </button>
                  <span className={styles.quantityValue}>{quantity}</span>
                  <button
                    aria-label="Tăng số vé"
                    className={styles.quantityButton}
                    onClick={() => setQuantity((current) => current + 1)}
                    type="button"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.accountRow}>
                <div className={styles.accountInfo}>
                  <span className={styles.walletDot}>◼</span>
                  <div>
                    <p className={styles.accountLabel}>Primary Account</p>
                    <p className={styles.accountBalance}>100.000đ</p>
                  </div>
                </div>
                <button aria-label="Tùy chọn khác" className={styles.moreButton} type="button">
                  …
                </button>
              </div>

              <button className={styles.primaryCta} onClick={handleOpenConfirmation} type="button">
                <span>{selectedPlan.ctaLabel}</span>
                <span className={styles.ctaAmount}>{formatCurrency(totalAmount)}đ</span>
                <span className={styles.ctaArrow}>→</span>
              </button>

              <p className={styles.disclaimer}>{selectedPlan.disclaimer}</p>
            </section>
          </>
        )}

        {step === "confirm" ? (
          <div className={styles.confirmOverlay}>
            <section className={styles.confirmSheet} aria-label="Xác nhận gói cước">
              <div className={styles.sheetHandle} />
              <div className={styles.confirmHeader}>
                <h2>Xác nhận gói cước</h2>
                <p>Kiểm tra lại thông tin gói đang chọn trước khi đăng ký.</p>
              </div>

              <div className={styles.confirmPlanCard}>
                <div>
                  <p className={styles.confirmPlanLabel}>{ticketLabel}</p>
                  <h3>{selectedPlan.title}</h3>
                  <p className={styles.confirmPlanSubLabel}>{selectedPlan.variantLabel}</p>
                </div>
                <strong>{selectedPlan.priceLabel}</strong>
              </div>

              <div className={styles.confirmRows}>
                <div className={styles.confirmRow}>
                  <span>Loại vé</span>
                  <strong>{ticketLabel}</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Số vé</span>
                  <strong>{quantity} vé</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Nguồn thanh toán</span>
                  <strong>Primary Account</strong>
                </div>
                <div className={styles.confirmRow}>
                  <span>Tổng thanh toán</span>
                  <strong>{formatCurrency(totalAmount)}đ</strong>
                </div>
              </div>

              <p className={styles.confirmNote}>
                Hạn sử dụng 60 phút kể từ thời điểm mở khóa xe.
              </p>

              <button className={styles.primaryCta} onClick={handleConfirmPurchase} type="button">
                <span>{selectedPlan.ctaLabel}</span>
                <span className={styles.ctaAmount}>{formatCurrency(totalAmount)}đ</span>
                <span className={styles.ctaArrow}>→</span>
              </button>

              <button className={styles.secondaryCta} onClick={handleBack} type="button">
                Quay lại chọn gói
              </button>
            </section>
          </div>
        ) : null}

        <div className={styles.homeIndicatorArea} aria-hidden="true">
          <div className={styles.homeIndicator} />
        </div>
      </section>
    </main>
  );
}
