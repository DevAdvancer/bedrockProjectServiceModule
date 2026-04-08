import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage, HttpError } from "@/lib/http-error";
import { parseServiceMapPayload } from "@/lib/service-map-payload";
import {
  createServiceMap,
  listServiceMaps,
} from "@/lib/service-map-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const includeInactive =
    request.nextUrl.searchParams.get("includeInactive") === "true";

  try {
    const maps = await listServiceMaps({ includeInactive });
    return NextResponse.json({ maps });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const existingMaps = await listServiceMaps({ includeInactive: true });
    const parsedPayload = parseServiceMapPayload(payload, existingMaps.length + 1);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }

    const result = await createServiceMap(parsedPayload.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
