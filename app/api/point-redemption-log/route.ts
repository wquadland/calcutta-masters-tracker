import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export async function GET() {
  const { data, error } = await supabase
    .from("point_redemption_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ log: [], error: error.message }, { status: 500 });
  return NextResponse.json({ log: data ?? [] });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const row: Record<string, unknown> = {
      member: body.member,
      action: body.action,
      pending_after: body.pendingAfter,
      complete_after: body.completeAfter,
    };
    if (body.pointEventId) row.point_event_id = body.pointEventId;

    const { data, error } = await supabase
      .from("point_redemption_log")
      .insert(row)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ entry: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
