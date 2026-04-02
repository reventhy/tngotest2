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
    typeLabel: "Xe đạp điện",
    batteryLabel: "Pin 90%",
    fareLabel: "10.000đ / 60 phút",
    status: "available",
    statusLabel: "Khả dụng",
    insuranceLabel: "Trip Care",
    insurancePriceLabel: "1.000đ / 2h",
    insuranceNote: "Xem quyền lợi và điều khoản",
  },
  {
    id: "B18R-11.204",
    qrValue: "TNGO:B18R-11.204",
    typeLabel: "Xe đạp phổ thông",
    batteryLabel: "Pin 68%",
    fareLabel: "8.000đ / 60 phút",
    status: "available",
    statusLabel: "Khả dụng",
    insuranceLabel: "Trip Care",
    insurancePriceLabel: "1.000đ / 2h",
    insuranceNote: "Xem quyền lợi và điều khoản",
  },
  {
    id: "Z88U-05.502",
    qrValue: "TNGO:UNAVAILABLE:Z88U-05.502",
    typeLabel: "Xe đạp điện",
    batteryLabel: "Pin 15%",
    fareLabel: "10.000đ / 60 phút",
    status: "unavailable",
    statusLabel: "Không khả dụng",
    insuranceLabel: "Trip Care",
    insurancePriceLabel: "1.000đ / 2h",
    insuranceNote: "Xem quyền lợi và điều khoản",
    unavailableReason:
      "Xe đang bảo trì, pin yếu hoặc đã được giữ. Hệ thống sẽ gợi ý xe gần nhất khác để bạn quét lại.",
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
