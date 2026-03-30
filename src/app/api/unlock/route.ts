import { DEMO_VEHICLES, type UnlockResponse } from "@/lib/demo-data";

type UnlockPayload = {
  vehicleId?: string;
  insuranceEnabled?: boolean;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as UnlockPayload;
  const vehicle = DEMO_VEHICLES.find((item) => item.id === payload.vehicleId);

  if (!vehicle) {
    return Response.json(
      {
        success: false,
        message: "Khong tim thay xe trong inventory demo.",
      } satisfies UnlockResponse,
      { status: 404 },
    );
  }

  if (vehicle.status !== "available") {
    return Response.json(
      {
        success: false,
        message: "Xe nay khong kha dung de mo khoa.",
      } satisfies UnlockResponse,
      { status: 409 },
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 1200));

  return Response.json({
    success: true,
    message: `O khoa cua xe ${vehicle.id} da mo. Phien thue demo bat dau trong 60 phut.`,
    sessionId: crypto.randomUUID(),
    insuranceEnabled: Boolean(payload.insuranceEnabled),
    vehicleId: vehicle.id,
  } satisfies UnlockResponse);
}
