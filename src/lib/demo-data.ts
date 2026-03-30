export type VehicleStatus = "available" | "unavailable";

export type DemoVehicle = {
  id: string;
  qrValue: string;
  typeLabel: string;
  batteryLabel: string;
  fareLabel: string;
  status: VehicleStatus;
  statusLabel: string;
  insuranceLabel: string;
  insurancePriceLabel: string;
  insuranceNote: string;
  unavailableReason?: string;
};

export type VehiclesResponse = {
  vehicles: DemoVehicle[];
  fetchedAt: string;
};

export type UnlockResponse = {
  success: boolean;
  message: string;
  sessionId?: string;
  insuranceEnabled?: boolean;
  vehicleId?: string;
};

export const DEMO_VEHICLES: DemoVehicle[] = [
  {
    id: "X29Q-24.111",
    qrValue: "TNGO:X29Q-24.111",
    typeLabel: "Xe dap dien",
    batteryLabel: "Pin 90%",
    fareLabel: "10k / 60 phut",
    status: "available",
    statusLabel: "Kha dung",
    insuranceLabel: "Bao hiem Trip Care",
    insurancePriceLabel: "1.000d / 2h",
    insuranceNote: "Xem quyen loi va dieu khoan bao hiem",
  },
  {
    id: "B18R-11.204",
    qrValue: "TNGO:B18R-11.204",
    typeLabel: "Xe dap pho thong",
    batteryLabel: "Pin 68%",
    fareLabel: "8k / 60 phut",
    status: "available",
    statusLabel: "Kha dung",
    insuranceLabel: "Bao hiem Trip Care",
    insurancePriceLabel: "1.000d / 2h",
    insuranceNote: "Xem quyen loi va dieu khoan bao hiem",
  },
  {
    id: "Z88U-05.502",
    qrValue: "TNGO:UNAVAILABLE:Z88U-05.502",
    typeLabel: "Xe dap dien",
    batteryLabel: "Pin 15%",
    fareLabel: "10k / 60 phut",
    status: "unavailable",
    statusLabel: "Unavailable",
    insuranceLabel: "Bao hiem Trip Care",
    insurancePriceLabel: "1.000d / 2h",
    insuranceNote: "Xem quyen loi va dieu khoan bao hiem",
    unavailableReason:
      "Xe dang bao tri, pin yeu hoac da duoc giu. He thong se goi y xe gan nhat khac de ban quet lai.",
  },
];

export function findVehicleByQr(
  vehicles: DemoVehicle[],
  rawValue: string,
): DemoVehicle | undefined {
  const normalized = rawValue.trim().toUpperCase();

  return vehicles.find((vehicle) => {
    const candidates = [
      vehicle.qrValue.toUpperCase(),
      vehicle.id.toUpperCase(),
      `TNGO:${vehicle.id}`.toUpperCase(),
      `TNGO:UNAVAILABLE:${vehicle.id}`.toUpperCase(),
    ];

    return (
      candidates.includes(normalized) || normalized.includes(vehicle.id.toUpperCase())
    );
  });
}

export function getPrimaryVehicle(vehicles: DemoVehicle[]): DemoVehicle | null {
  return vehicles.find((vehicle) => vehicle.status === "available") ?? vehicles[0] ?? null;
}
