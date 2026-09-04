import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const logId = Number(id);

  if (!Number.isInteger(logId)) {
    return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
  }

  const result = db.prepare(`DELETE FROM log_entries WHERE log_id = ?`).run(logId);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
