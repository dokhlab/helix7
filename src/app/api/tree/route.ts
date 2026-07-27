import { NextResponse } from "next/server";
import { getTree } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tree = await getTree();
    if (!tree) return NextResponse.json({ error: "not built" }, { status: 404 });
    return NextResponse.json(tree);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 503 });
  }
}
