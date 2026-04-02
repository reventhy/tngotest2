export type HistoryTab = "transactions" | "trips";

export type TripHistoryItem = {
  id: string;
  vehicle: string;
  date: string;
  dateTime: string;
  status: string;
  distance: string;
  duration: string;
  payment: string;
  carbonSaved: string;
  calories: string;
  packageType: string;
  debt: string;
  mainAccountDelta: string;
  promoAccountDelta: string;
  balanceAfter: string;
};

export type TransactionHistoryItem = {
  id: string;
  title: string;
  status: string;
  account: string;
  date: string;
  amount: string;
  amountStatus: string;
};

export const TRIP_HISTORY: TripHistoryItem[] = [
  {
    id: "007202603201918",
    vehicle: "X290-24.007",
    date: "20/03/2026",
    dateTime: "19:18 - 19:25",
    status: "Đã hoàn tất",
    distance: "1.2 km",
    duration: "8 phút",
    payment: "10.000đ",
    carbonSaved: "0,01 kg",
    calories: "3,21 cal",
    packageType: "Vé lượt",
    debt: "0",
    mainAccountDelta: "-10.000",
    promoAccountDelta: "-0",
    balanceAfter: "90000đ",
  },
  {
    id: "007202603180840",
    vehicle: "X315-24.118",
    date: "18/03/2026",
    dateTime: "08:40 - 08:56",
    status: "Đã hoàn tất",
    distance: "2.1 km",
    duration: "16 phút",
    payment: "15.000đ",
    carbonSaved: "0,03 kg",
    calories: "5,84 cal",
    packageType: "Vé ngày",
    debt: "0",
    mainAccountDelta: "-15.000",
    promoAccountDelta: "-0",
    balanceAfter: "85000đ",
  },
  {
    id: "007202603152102",
    vehicle: "X102-23.564",
    date: "15/03/2026",
    dateTime: "21:02 - 21:11",
    status: "Đã hoàn tất",
    distance: "0.9 km",
    duration: "9 phút",
    payment: "10.000đ",
    carbonSaved: "0,01 kg",
    calories: "2,95 cal",
    packageType: "Vé lượt",
    debt: "0",
    mainAccountDelta: "-10.000",
    promoAccountDelta: "-0",
    balanceAfter: "100000đ",
  },
];

export const TRANSACTION_HISTORY: TransactionHistoryItem[] = [
  {
    id: "TX240320001",
    title: "Thanh toán chuyến đi",
    status: "Hoàn tất",
    account: "TK chính",
    date: "20/03/2026",
    amount: "-10.000đ",
    amountStatus: "Đã trừ",
  },
  {
    id: "TX180320002",
    title: "Thanh toán chuyến đi",
    status: "Hoàn tất",
    account: "TK chính",
    date: "18/03/2026",
    amount: "-15.000đ",
    amountStatus: "Đã trừ",
  },
];
