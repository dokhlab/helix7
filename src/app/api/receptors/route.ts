import { NextRequest, NextResponse } from "next/server";
import { listReceptors } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  try {
    const result = await listReceptors({
      classCode: p.get("class") ?? undefined,
      grafs: p.get("grafs") ?? undefined,
      tdl: p.get("tdl") ?? undefined,
      organSystem: p.get("system") ?? undefined,
      hasStructure: p.get("hasStructure") === "1",
      includeOlfactory: p.get("olfactory") === "1",
      search: p.get("q") ?? undefined,
      sort: (p.get("sort") as "score" | "gene" | "structures" | "ligands") ?? undefined,
      page: p.get("page") ? Number(p.get("page")) : undefined,
      pageSize: p.get("pageSize") ? Number(p.get("pageSize")) : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: "database unavailable", detail: String(err) },
      { status: 503 },
    );
  }
}
