import { NextResponse } from "next/server";
import { issueDealServiceId } from "@/lib/deal-service-store";

export async function POST() {
  const id = await issueDealServiceId();
  return NextResponse.json({ id });
}

