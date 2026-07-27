import { NextRequest, NextResponse } from "next/server";
import { getBioactivities, getReceptor } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const receptor = await getReceptor(id);
    if (!receptor) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    if (req.nextUrl.searchParams.get("bioactivities") === "1") {
      const bio = await getBioactivities(receptor._id);
      return NextResponse.json({ receptor, bioactivities: bio });
    }
    return NextResponse.json({ receptor });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
