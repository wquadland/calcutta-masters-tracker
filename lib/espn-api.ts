export interface GolferResult {
  id: string;
  name: string;
  score: string;          // display string: "-8", "+3", "E"
  scoreToPar: number;     // numeric: -8, +3, 0
  position: string;       // "T4", "1", etc.
  round: number;
  status: "active" | "cut" | "withdrawn" | "dq" | "complete";
  teeTime: string;
  roundScores: string[];
}

export type EventStatus = "live" | "upcoming" | "complete";

export interface LeaderboardResult {
  golfers: GolferResult[];
  error: boolean;
  lastFetched: string;
  eventStatus: EventStatus;
  nextEventDate: string | null;
  eventName: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseEventMeta(data: any): { eventStatus: EventStatus; nextEventDate: string | null; eventName: string } {
  try {
    const events = data?.events;
    if (!events || events.length === 0) return { eventStatus: "complete", nextEventDate: null, eventName: "" };

    const event = events.find((e: { name?: string }) =>
      e.name?.toLowerCase().includes("masters")
    ) ?? events[0];

    const state: string = event?.status?.type?.state ?? "post";
    const eventName: string = event?.name ?? event?.shortName ?? "";
    const eventDate: string | null = event?.date ?? null;

    let eventStatus: EventStatus;
    if (state === "in") eventStatus = "live";
    else if (state === "pre") eventStatus = "upcoming";
    else eventStatus = "complete";

    return { eventStatus, nextEventDate: eventDate, eventName };
  } catch {
    return { eventStatus: "complete", nextEventDate: null, eventName: "" };
  }
}

function parseScoreToPar(scoreStr: string | undefined): { display: string; numeric: number } {
  if (!scoreStr || scoreStr === "E" || scoreStr === "0") {
    return { display: "E", numeric: 0 };
  }
  const n = parseInt(scoreStr, 10);
  if (isNaN(n)) return { display: "E", numeric: 0 };
  if (n < 0) return { display: `${n}`, numeric: n };
  if (n > 0) return { display: `+${n}`, numeric: n };
  return { display: "E", numeric: 0 };
}

function parseStatus(statusName: string): GolferResult["status"] {
  const s = statusName.toLowerCase();
  if (s.includes("cut")) return "cut";
  if (s.includes("withdraw") || s === "wd") return "withdrawn";
  if (s.includes("disqualif") || s === "dq") return "dq";
  if (s.includes("complete")) return "complete";
  return "active";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseESPNLeaderboard(data: any): GolferResult[] {
  try {
    const events = data?.events;
    if (!events || events.length === 0) return [];

    // Find the Masters event or fall back to first
    const mastersEvent =
      events.find((e: { name?: string }) =>
        e.name?.toLowerCase().includes("masters")
      ) ?? events[0];

    const competition = mastersEvent?.competitions?.[0];
    if (!competition) return [];

    const competitors = competition.competitors ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return competitors.map((c: any): GolferResult => {
      const name: string = c.athlete?.displayName ?? "Unknown";

      // Score to par is in statistics[], not c.score (which is total strokes)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scoreToParStat = (c.statistics ?? []).find((s: any) => s.name === "scoreToPar");
      const numeric: number = scoreToParStat?.value ?? 0;
      const display: string = scoreToParStat?.displayValue ?? "E";

      const statusName: string = c.status?.type?.name ?? "active";
      const position: string = c.status?.position?.displayName ?? String(c.sortOrder ?? "");
      const teeTime: string = c.status?.teeTime ?? "";

      // Round scores: only linescores that have an actual displayValue (scheduled rounds don't)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roundScores: string[] = (c.linescores ?? [])
        .filter((ls: any) => ls.displayValue !== undefined)
        .map((ls: any) => ls.displayValue ?? "-");

      const round = Math.min(Math.max(roundScores.length, 1), 4);

      return {
        id: c.id ?? name,
        name,
        score: display,
        scoreToPar: numeric,
        position,
        round,
        status: parseStatus(statusName),
        teeTime,
        roundScores,
      };
    });
  } catch {
    return [];
  }
}
