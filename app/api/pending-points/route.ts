import { NextResponse } from "next/server";
import { TEAMS } from "@/lib/calcutta-data";
import { POINTS_RULES } from "@/lib/points-rules";
import { supabase } from "@/lib/supabase";

export const revalidate = 0;

const ESPN_LEADERBOARD =
  "https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga";
const ESPN_CORE_BASE =
  "https://sports.core.api.espn.com/v2/sports/golf/leagues/pga";

// One slot per team member per trigger event
export interface PendingSlot {
  id: string;            // golfer-round-hole-type-member (unique per slot)
  triggerKey: string;    // golfer-round-hole (groups slots from same event)
  golfer: string;
  team: string;
  round: number;
  hole: number;
  type: "EAGLE" | "BIRDIE" | "EAGLE_BIRDIE";
  reason: string;
  assignedByMember: string; // which team member this slot belongs to
  alreadyLogged: boolean;
  count: number;         // 2 for eagle-on-birdie-hole, 1 otherwise
  isDemo?: boolean;      // true for static demo slots shown outside active tournaments
}

// Static demo slots shown when no live ESPN events are detected
const DEMO_EVENTS: Array<{ golfer: string; team: string; round: number; hole: number; type: PendingSlot["type"]; reason: string; count: number }> = [
  { golfer: "Scottie Scheffler", team: "The Majors",     round: 2, hole: 7,  type: "EAGLE",       reason: "Eagle",                   count: 1 },
  { golfer: "Rory McIlroy",      team: "Eagle Squadron", round: 1, hole: 2,  type: "BIRDIE",      reason: "Birdie - Hole 2 (Thu)",    count: 1 },
  { golfer: "Collin Morikawa",   team: "Fairway Kings",  round: 3, hole: 12, type: "EAGLE_BIRDIE",reason: "Eagle on Birdie Hole 12 (Sat)", count: 2 },
];

function buildDemoSlots(loggedSet: Set<string>): PendingSlot[] {
  const slots: PendingSlot[] = [];
  for (const ev of DEMO_EVENTS) {
    const teamObj = TEAMS.find((t) => t.name === ev.team);
    const members = teamObj?.members ?? ["Alex", "Morgan"];
    for (const member of members) {
      const triggerKey = `demo-${ev.golfer.replace(/\s/g, "")}-${ev.round}-${ev.hole}`;
      const id = `${triggerKey}-${member.toLowerCase().replace(/\s/g, "")}`;
      slots.push({
        id,
        triggerKey,
        golfer: ev.golfer,
        team: ev.team,
        round: ev.round,
        hole: ev.hole,
        type: ev.type,
        reason: ev.reason,
        assignedByMember: member,
        alreadyLogged: loggedSet.has(`${normalizeName(ev.golfer)}-${ev.round}-${ev.hole}-${normalizeName(member)}`),
        count: ev.count,
        isDemo: true,
      });
    }
  }
  return slots;
}

function normalizeName(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

const DAY_LABELS: Record<number, string> = { 1: "Thu", 2: "Fri", 3: "Sat", 4: "Sun" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const lb = await fetchJson(ESPN_LEADERBOARD);
    if (!lb) return NextResponse.json({ slots: [] });

    const event = lb?.events?.[0];
    if (!event) return NextResponse.json({ slots: [] });

    const eventId: string = event.id;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const competitors: { id: string; name: string }[] = (event.competitions?.[0]?.competitors ?? []).map((c: any) => ({
      id: c.id as string,
      name: c.athlete?.displayName ?? "",
    }));

    const nameMap = new Map<string, { id: string; name: string }>();
    for (const c of competitors) nameMap.set(normalizeName(c.name), c);

    // Match Calcutta golfers to ESPN IDs
    const calcuttaGolfers: { name: string; team: string; members: string[]; espnId: string; espnName: string }[] = [];
    for (const team of TEAMS) {
      for (const g of team.golfers) {
        const match = nameMap.get(normalizeName(g.name));
        if (match) {
          calcuttaGolfers.push({ name: g.name, team: team.name, members: team.members, espnId: match.id, espnName: match.name });
        }
      }
    }

    // Fetch linescores in parallel
    const results = await Promise.allSettled(
      calcuttaGolfers.map(async (g) => {
        const url = `${ESPN_CORE_BASE}/events/${eventId}/competitions/${eventId}/competitors/${g.espnId}/linescores`;
        const data = await fetchJson(url);
        return data ? { golfer: g, data } : null;
      })
    );

    // Build birdie hole sets per round
    const birdieHolesByRound = new Map<number, Set<number>>();
    for (const rule of POINTS_RULES.birdieHoles) {
      birdieHolesByRound.set(rule.round, new Set(rule.holes));
    }

    // Detect qualifying triggers and expand to one slot per team member
    const slots: PendingSlot[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const { golfer, data } = result.value;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const roundItem of (data?.items ?? []) as any[]) {
        const roundNum: number = roundItem.period;
        const birdieHoles = birdieHolesByRound.get(roundNum) ?? new Set<number>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const hole of (roundItem.linescores ?? []) as any[]) {
          const holeNum: number = hole.period;
          const scoreType: string = hole.scoreType?.name ?? "";
          let type: "EAGLE" | "BIRDIE" | "EAGLE_BIRDIE" | null = null;
          let reason = "";

          const isEagle = scoreType === "EAGLE" || scoreType === "HOLE_IN_ONE";
          const isBirdieHole = birdieHoles.has(holeNum);

          if (isEagle && isBirdieHole) {
            type = "EAGLE_BIRDIE";
            reason = `Eagle on Birdie Hole ${holeNum} (${DAY_LABELS[roundNum] ?? `R${roundNum}`})`;
          } else if (isEagle) {
            type = "EAGLE";
            reason = "Eagle";
          } else if (scoreType === "BIRDIE" && isBirdieHole) {
            type = "BIRDIE";
            reason = `Birdie - Hole ${holeNum} (${DAY_LABELS[roundNum] ?? `R${roundNum}`})`;
          }

          if (!type) continue;

          const triggerKey = `${golfer.espnId}-${roundNum}-${holeNum}`;
          const count = type === "EAGLE_BIRDIE" ? 2 : 1;

          // One slot per team member
          for (const member of golfer.members) {
            slots.push({
              id: `${triggerKey}-${member.toLowerCase().replace(/\s/g, "")}`,
              triggerKey,
              golfer: golfer.espnName,
              team: golfer.team,
              round: roundNum,
              hole: holeNum,
              type,
              reason,
              assignedByMember: member,
              alreadyLogged: false,
              count,
            });
          }
        }
      }
    }

    // Cross-check with logged events: match on golfer + round + hole + assigned_by_member
    const { data: logged } = await supabase
      .from("point_events")
      .select("golfer, round, hole, assigned_by_member");

    const loggedSet = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (logged ?? []).map((e: any) =>
        `${normalizeName(e.golfer)}-${e.round}-${e.hole}-${normalizeName(e.assigned_by_member ?? "")}`
      )
    );

    const withStatus = slots.map((s) => ({
      ...s,
      alreadyLogged: loggedSet.has(
        `${normalizeName(s.golfer)}-${s.round}-${s.hole}-${normalizeName(s.assignedByMember)}`
      ),
    }));

    // If ESPN detected no real events, append static demo slots so the UI is always demonstrable
    const finalSlots = withStatus.length === 0
      ? buildDemoSlots(loggedSet)
      : withStatus;

    // Sort: pending first, then by round/hole/member
    finalSlots.sort((a, b) => {
      if (a.alreadyLogged !== b.alreadyLogged) return a.alreadyLogged ? 1 : -1;
      if (a.round !== b.round) return a.round - b.round;
      if (a.hole !== b.hole) return a.hole - b.hole;
      return a.assignedByMember.localeCompare(b.assignedByMember);
    });

    return NextResponse.json({ slots: finalSlots });
  } catch (err) {
    console.error("pending-points error:", err);
    return NextResponse.json({ slots: buildDemoSlots(new Set()) });
  }
}
