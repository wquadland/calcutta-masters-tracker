import { TEAMS, Team } from "./calcutta-data";

/** Find which team owns a golfer by display name (fuzzy: case-insensitive, trims accents loosely) */
export function findTeamForGolfer(golferName: string): Team | undefined {
  const normalize = (s: string) => s.toLowerCase().trim();
  const target = normalize(golferName);
  return TEAMS.find((team) =>
    team.golfers.some((g) => normalize(g.name) === target)
  );
}

/** Format a score-to-par number as a display string */
export function formatScore(n: number): string {
  if (n === 0) return "E";
  if (n < 0) return `${n}`;
  return `+${n}`;
}

/** Return Tailwind text color class for score */
export function scoreColor(scoreToPar: number, status?: string): string {
  if (status && ["cut", "withdrawn", "dq"].includes(status)) return "text-gray-500";
  if (scoreToPar < 0) return "text-green-400";
  if (scoreToPar > 0) return "text-red-400";
  return "text-white";
}
