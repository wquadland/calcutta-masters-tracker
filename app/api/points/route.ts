import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { PointEvent } from "@/lib/points-rules";

export const revalidate = 0;

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

export async function GET() {
  const { data, error } = await supabase
    .from("point_events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ events: [], error: error.message }, { status: 500 });
  return NextResponse.json({ events: (data ?? []).map(rowToEvent) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { data, error } = await supabase
      .from("point_events")
      .insert({
        golfer: body.golfer ?? "",
        reason: body.reason ?? "",
        round: Number(body.round) || 1,
        hole: Number(body.hole) || 0,
        earned_by_team: body.earnedByTeam ?? "",
        assigned_by_member: body.assignedByMember ?? "",
        assigned_to: body.assignedTo ?? "",
        is_complete: false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ event: rowToEvent(data) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}
