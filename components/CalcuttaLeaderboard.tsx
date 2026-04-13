"use client";

import { useEffect, useState, useCallback } from "react";
import { TEAMS, PRIZE_STRUCTURE } from "@/lib/calcutta-data";
import { GolferResult } from "@/lib/espn-api";
import ScoreCell from "./ScoreCell";
import MemberAvatar from "./MemberAvatar";

interface Props {
  golfers: GolferResult[];
}

interface TeamRanking {
  teamId: string;
  teamName: string;
  color: string;
  members: string[];
  bestGolfer: string;
  bestScore: number;
  bestScoreDisplay: string;
  totalPaid: number;
  estimatedPrize: number | null;
  prizeLabel: string;
}

const PLACE_PRIZES = [
  PRIZE_STRUCTURE.payouts[0].amount,
  PRIZE_STRUCTURE.payouts[1].amount,
  PRIZE_STRUCTURE.payouts[2].amount,
  PRIZE_STRUCTURE.payouts[3].amount,
];

export default function CalcuttaLeaderboard({ golfers }: Props) {
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  const fetchAvatars = useCallback(async () => {
    try {
      const res = await fetch("/api/avatars");
      const data = await res.json();
      if (data.avatars) setAvatars(data.avatars);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleAvatarUploaded = (member: string, url: string) => {
    setAvatars((prev) => ({ ...prev, [member]: url }));
  };

  const scoreMap = new Map<string, GolferResult>();
  for (const g of golfers) {
    scoreMap.set(g.name.toLowerCase().trim(), g);
  }

  const rankings: TeamRanking[] = TEAMS.map((team) => {
    let bestScore = Infinity;
    let bestGolfer = "";
    let bestScoreDisplay = "E";
    const totalPaid = team.golfers.reduce((s, g) => s + g.paid, 0);

    for (const g of team.golfers) {
      const result = scoreMap.get(g.name.toLowerCase().trim());
      if (!result) continue;
      if (["cut", "withdrawn", "dq"].includes(result.status)) continue;
      if (result.scoreToPar < bestScore) {
        bestScore = result.scoreToPar;
        bestGolfer = result.name;
        bestScoreDisplay = result.score;
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      color: team.color,
      members: team.members,
      bestGolfer: bestGolfer || "—",
      bestScore: bestScore === Infinity ? 999 : bestScore,
      bestScoreDisplay: bestScore === Infinity ? "—" : bestScoreDisplay,
      totalPaid,
      estimatedPrize: null,
      prizeLabel: "",
    };
  }).sort((a, b) => a.bestScore - b.bestScore);

  const labels = ["🥇 1st", "🥈 2nd", "🥉 3rd", "4th"];
  for (let i = 0; i < Math.min(4, rankings.length); i++) {
    if (rankings[i].bestScore < 999) {
      rankings[i].estimatedPrize = PLACE_PRIZES[i];
      rankings[i].prizeLabel = labels[i];
    }
  }

  return (
    <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#c9a84c] inline-block" />
        <h2 className="text-white font-bold text-sm uppercase tracking-wider">
          Calcutta Leaderboard
        </h2>
      </div>

      <div className="overflow-y-auto overflow-x-hidden max-h-[500px]">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
              <th className="px-2 py-2 text-left w-6">#</th>
              <th className="px-2 py-2 text-left">Team</th>
              <th className="px-2 py-2 text-right w-12">Score</th>
              <th className="px-2 py-2 text-right w-14">Prize</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((r, i) => (
              <tr
                key={r.teamId}
                className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                  i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                }`}
              >
                <td className="px-3 py-2">
                  <span className="text-gray-400 text-xs font-mono">{i + 1}</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${r.color}`} />
                    <div className="min-w-0">
                      <div className="text-white font-semibold text-xs leading-tight truncate">
                        {r.teamName}
                      </div>
                      <div className="text-gray-500 text-[10px] truncate">
                        {r.bestGolfer !== "—" ? r.bestGolfer : "No active golfers"}
                      </div>
                      {/* Member avatars */}
                      <div className="flex gap-1 mt-1.5">
                        {r.members.map((m) => (
                          <MemberAvatar
                            key={m}
                            member={m}
                            url={avatars[m]}
                            onUploaded={handleAvatarUploaded}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  {r.bestScore < 999 ? (
                    <ScoreCell
                      scoreToPar={r.bestScore}
                      display={r.bestScoreDisplay}
                    />
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {r.estimatedPrize !== null ? (
                    <div>
                      <div className="text-[#c9a84c] font-bold text-xs whitespace-nowrap">
                        ${r.estimatedPrize.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                      </div>
                      <div className="text-gray-500 text-[10px] whitespace-nowrap">{r.prizeLabel}</div>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
