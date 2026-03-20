import { NextRequest, NextResponse } from "next/server";
import {
  deleteDealService,
  updateDealService,
} from "@/lib/deal-service-store";
import { parseDealServicePayload } from "@/lib/deal-services";
import { getErrorMessage, HttpError } from "@/lib/http-error";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const parsedPayload = parseDealServicePayload(payload);

    if (!parsedPayload.success) {
      return NextResponse.json({ error: parsedPayload.error }, { status: 400 });
    }

    const result = await updateDealService(id, parsedPayload.data);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteDealService(id);
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

