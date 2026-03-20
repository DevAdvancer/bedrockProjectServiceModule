import { NextRequest, NextResponse } from "next/server";
import { searchFreshsalesDeals } from "@/lib/freshsales";
import { getErrorMessage, HttpError } from "@/lib/http-error";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ deals: [] });
  }

  try {
    const deals = await searchFreshsalesDeals(query);
    return NextResponse.json({ deals });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    return NextResponse.json({ error: getErrorMessage(error) }, { status });
  }
}

