import { DEMO_VEHICLES, type VehiclesResponse } from "@/lib/demo-data";

export async function GET() {
  const payload: VehiclesResponse = {
    vehicles: DEMO_VEHICLES,
    fetchedAt: new Date().toISOString(),
  };

  return Response.json(payload);
}
