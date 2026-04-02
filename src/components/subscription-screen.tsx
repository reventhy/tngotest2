"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./subscription-screen.module.css";

type SubscriptionTab = "single" | "daily" | "monthly";

type SubscriptionPlan = {
  id: string;
  title: string;
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

export default function SubscriptionScreen({
  initialTab = "single",
}: {
  initialTab?: SubscriptionTab;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SubscriptionTab>(initialTab);
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

  function handleTabChange(tab: SubscriptionTab) {
    setActiveTab(tab);
  }

  function handlePlanSelect(planId: string) {
    setSelectedPlanByTab((current) => ({
      ...current,
      [activeTab]: planId,
    }));
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

        <section className={styles.hero}>
          <Link aria-label="Quay lại màn Home" className={styles.backButton} href="/">
            ‹
          </Link>
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
                    <p className={styles.planTitle}>{plan.title}</p>
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

          <button className={styles.primaryCta} onClick={handleContinueToRental} type="button">
            <span>{selectedPlan.ctaLabel}</span>
            <span className={styles.ctaAmount}>{formatCurrency(totalAmount)}đ</span>
            <span className={styles.ctaArrow}>→</span>
          </button>

          <p className={styles.disclaimer}>{selectedPlan.disclaimer}</p>
        </section>

        <div className={styles.homeIndicatorArea} aria-hidden="true">
          <div className={styles.homeIndicator} />
        </div>
      </section>
    </main>
  );
}
