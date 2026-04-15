import { NextResponse } from "next/server";
import { parseESPNLeaderboard, parseEventMeta } from "@/lib/espn-api";

export const revalidate = 60;

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga";

export async function GET() {
  try {
    const res = await fetch(ESPN_URL, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      return NextResponse.json(
        { golfers: [], error: true, lastFetched: new Date().toISOString() },
        { status: 200 }
      );
    }

    const data = await res.json();
    const golfers = parseESPNLeaderboard(data);
    const { eventStatus, nextEventDate, eventName } = parseEventMeta(data);

    return NextResponse.json({
      golfers,
      error: false,
      lastFetched: new Date().toISOString(),
      eventStatus,
      nextEventDate,
      eventName,
    });
  } catch {
    return NextResponse.json(
      { golfers: [], error: true, lastFetched: new Date().toISOString() },
      { status: 200 }
    );
  }
}
