import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PointEvent } from "@/lib/points-rules";

function rowToEvent(row: Record<string, unknown>): PointEvent {
  return {
    id: row.id as string,
    golfer: row.golfer as string,
    reason: row.reason as string,
    round: row.round as number,
    hole: row.hole as number,
    earnedByTeam: row.earned_by_team as string,
    assignedByMember: (row.assigned_by_member as string) ?? "",
    assignedTo: row.assigned_to as string,
    timestamp: row.created_at as string,
    isComplete: (row.is_complete as boolean) ?? false,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (body.golfer !== undefined) updates.golfer = body.golfer;
    if (body.reason !== undefined) updates.reason = body.reason;
    if (body.round !== undefined) updates.round = Number(body.round);
    if (body.hole !== undefined) updates.hole = Number(body.hole);
    if (body.earnedByTeam !== undefined) updates.earned_by_team = body.earnedByTeam;
    if (body.assignedByMember !== undefined) updates.assigned_by_member = body.assignedByMember;
    if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
    if (body.isComplete !== undefined) updates.is_complete = body.isComplete;

    const { data, error } = await supabase
      .from("point_events")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: rowToEvent(data) });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { error } = await supabase.from("point_events").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
