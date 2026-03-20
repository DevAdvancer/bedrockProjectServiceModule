import { NextRequest, NextResponse } from "next/server";
import {
  createDealService,
  listDealServices,
} from "@/lib/deal-service-store";
import { parseDealServicePayload } from "@/lib/deal-services";
import { getErrorMessage, HttpError } from "@/lib/http-error";

export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get("dealId")?.trim() ?? "";

  try {
    const result = await listDealServices(dealId);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsedPayload = parseDealServicePayload(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }

    const preferredId =
      typeof payload?.id === "string" ? payload.id.trim() : undefined;

    const result = await createDealService(parsedPayload.data, preferredId);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

