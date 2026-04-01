import Image from "next/image";
import Link from "next/link";
import styles from "./home-screen.module.css";

type PlanCard = {
  title: string;
  price: string;
};

type QuickAction = {
  title: string;
  subtitle: string;
  href?: string;
  dark?: boolean;
};

type NavItem = {
  label: string;
  href?: string;
  active?: boolean;
};

const PLAN_CARDS: PlanCard[] = [
  {
    title: "Vé lượt xe đạp",
    price: "10.000đ/60 phút",
  },
  {
    title: "Vé ngày xe đạp",
    price: "50.000đ/450 phút",
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    title: "Trạm xe",
    subtitle: "Thông tin các trạm xe",
  },
  {
    title: "QR",
    subtitle: "Mở khóa xe ngay",
    href: "/demo",
    dark: true,
  },
];

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", active: true },
  { label: "Station" },
  { label: "Scan QR", href: "/demo" },
  { label: "History" },
  { label: "More" },
];

function NavItemView({ item }: { item: NavItem }) {
  const content = (
    <>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.navIcon}
        height={24}
        src={item.active ? "/figma-home/nav-home.svg" : "/figma-home/nav-default.svg"}
        width={24}
      />
      <span className={`${styles.navLabel} ${item.active ? styles.navLabelActive : ""}`}>
        {item.label}
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link className={styles.navButton} href={item.href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={styles.navButton} type="button">
      {content}
    </button>
  );
}

function QuickActionCard({ action }: { action: QuickAction }) {
  const content = (
    <>
      <div className={styles.quickActionCopy}>
        <h3>{action.title}</h3>
        <p>{action.subtitle}</p>
      </div>
      <Image
        alt=""
        aria-hidden="true"
        className={styles.bikeLogo}
        height={64}
        src="/figma-home/bike-logo.png"
        width={64}
      />
    </>
  );

  const className = `${styles.quickActionCard} ${action.dark ? styles.quickActionCardDark : ""}`;

  if (action.href) {
    return (
      <Link className={className} href={action.href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={className} type="button">
      {content}
    </button>
  );
}

export default function HomeScreen() {
  return (
    <main className={styles.page}>
      <section className={styles.phone} aria-label="TNGo home screen live demo">
        <header className={styles.statusBar}>
          <div className={styles.statusTime}>9:41</div>
          <div className={styles.statusIcons}>
            <Image alt="" aria-hidden="true" height={12} src="/figma-home/cellular.svg" width={19} />
            <Image alt="" aria-hidden="true" height={12} src="/figma-home/wifi.svg" width={17} />
            <Image alt="" aria-hidden="true" height={13} src="/figma-home/battery.svg" width={27} />
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.topSection}>
            <div className={styles.profileRow}>
              <p className={styles.profileName}>Nhật Nam</p>
              <button aria-label="Tài khoản" className={styles.profileButton} type="button">
                <Image alt="" aria-hidden="true" height={16} src="/figma-home/user-icon.svg" width={16} />
              </button>
            </div>

            <button className={styles.searchBar} type="button">
              <span className={styles.searchPlaceholder}>
                Tìm mọi thứ bạn cần tại đây (Vd: Gói cước, trạm xe, lịch sử..
              </span>
              <Image alt="" aria-hidden="true" height={16} src="/figma-home/search-icon.svg" width={16} />
            </button>
          </section>

          <section className={styles.balanceCard}>
            <div className={styles.balanceCopy}>
              <p className={styles.balanceLabel}>Số tiền của bạn</p>
              <strong className={styles.balanceValue}>4,000</strong>
            </div>
            <button className={styles.topUpButton} type="button">
              Nạp tiền
            </button>
          </section>

          <section className={styles.planSection}>
            <div className={styles.sectionHeader}>
              <h2>Các gói cước</h2>
              <button className={styles.inlineLink} type="button">
                view all
              </button>
            </div>

            <div className={styles.planGrid}>
              {PLAN_CARDS.map((plan) => (
                <article className={styles.planCard} key={plan.title}>
                  <div className={styles.planImage}>
                    <Image
                      alt=""
                      aria-hidden="true"
                      className={styles.planPlaceholder}
                      height={160}
                      src="/figma-home/image-placeholder.png"
                      width={160}
                    />
                  </div>
                  <div className={styles.planCopy}>
                    <h3>{plan.title}</h3>
                    <p>{plan.price}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.quickActionGrid}>
            {QUICK_ACTIONS.map((action) => (
              <QuickActionCard action={action} key={action.title} />
            ))}
          </section>

          <section className={styles.promoBanner} aria-label="Promotion banner">
            <Image
              alt=""
              aria-hidden="true"
              className={styles.bannerPlaceholder}
              height={160}
              src="/figma-home/image-placeholder.png"
              width={160}
            />
            <span>Promotion Banner</span>
          </section>
        </div>

        <nav className={styles.bottomNav} aria-label="Bottom navigation">
          {NAV_ITEMS.map((item) => (
            <NavItemView item={item} key={item.label} />
          ))}
        </nav>

        <div className={styles.homeIndicatorArea} aria-hidden="true">
          <div className={styles.homeIndicator} />
        </div>
      </section>
    </main>
  );
}
