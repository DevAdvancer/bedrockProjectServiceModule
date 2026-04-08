import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage, HttpError } from "@/lib/http-error";
import { parseServiceMapPayload } from "@/lib/service-map-payload";
import {
  deleteServiceMap,
  updateServiceMap,
} from "@/lib/service-map-store";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const parsedPayload = parseServiceMapPayload(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }

    const result = await updateServiceMap(id, parsedPayload.data);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteServiceMap(id);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}
