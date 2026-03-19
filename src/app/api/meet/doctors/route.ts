import { NextResponse } from "next/server";
import { WithContext } from "@/lib/api/with-context";
import { ListOnlineDoctorsUseCase } from "@/data/meet";

// GET /api/meet/doctors — list doctors with availability:"available"
export const GET = WithContext(async () => {
  const doctors = await new ListOnlineDoctorsUseCase().execute();
  return NextResponse.json(doctors);
});
