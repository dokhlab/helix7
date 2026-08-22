import { NextRequest, NextResponse } from "next/server";
import { nonGpcrNote, searchReceptors } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const hits = await searchReceptors(q, 10);
    return NextResponse.json({ hits, note: nonGpcrNote(q) });
  } catch {
    return NextResponse.json({ hits: [], note: null }, { status: 503 });
  }
}
