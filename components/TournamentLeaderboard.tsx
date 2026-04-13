"use client";

import { useState } from "react";
import { GolferResult } from "@/lib/espn-api";
import { findTeamForGolfer } from "@/lib/utils";
import ScoreCell from "./ScoreCell";
import TeamBadge from "./TeamBadge";
import { scoreColor } from "@/lib/utils";

interface Props {
  golfers: GolferResult[];
}

export default function TournamentLeaderboard({ golfers }: Props) {
  const [open, setOpen] = useState(false);

  const displayed = [...golfers]
    .filter((g) => !["cut", "withdrawn", "dq"].includes(g.status))
    .sort((a, b) => a.scoreToPar - b.scoreToPar)
    .slice(0, 20);

  const leader = displayed[0];

  return (
    <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors text-left"
      >
        <span className="w-2 h-2 rounded-full bg-[#006747] inline-block flex-shrink-0" />
        <h2 className="text-white font-bold text-sm uppercase tracking-wider flex-1">
          Tournament Leaderboard
        </h2>
        {!open && leader && (
          <span className="text-gray-400 text-xs truncate">
            {leader.name} · <span className={`font-bold ${scoreColor(leader.scoreToPar)}`}>{leader.score}</span>
          </span>
        )}
        <span className="text-gray-400 text-sm flex-shrink-0">{open ? "▲" : "▼"}</span>
      </button>

      {open && <div className="border-t border-white/10 overflow-y-auto lg:max-h-[calc(100vh-200px)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
              <th className="px-3 py-2 text-left w-8">Pos</th>
              <th className="px-3 py-2 text-left">Golfer</th>
              <th className="px-3 py-2 text-right w-12">Score</th>
              <th className="px-3 py-2 text-right w-8">R</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                  Loading scores…
                </td>
              </tr>
            )}
            {displayed.map((g, i) => {
              const team = findTeamForGolfer(g.name);
              const isElim = ["cut", "withdrawn", "dq"].includes(g.status);
              return (
                <tr
                  key={g.id}
                  className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                    i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                  }`}
                >
                  <td className="px-3 py-2 text-gray-400 text-xs font-mono">
                    {g.position || i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <div className={`font-medium ${isElim ? "text-gray-500 line-through" : "text-white"}`}>
                      {g.name}
                    </div>
                    {team && (
                      <div className="mt-0.5">
                        <TeamBadge team={team} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ScoreCell
                      scoreToPar={g.scoreToPar}
                      display={g.score}
                      status={g.status}
                    />
                  </td>
                  <td className="px-3 py-2 text-right text-gray-400 text-xs">
                    {g.status === "cut"
                      ? "CUT"
                      : g.status === "withdrawn"
                      ? "WD"
                      : g.status === "dq"
                      ? "DQ"
                      : `R${g.round}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>}
    </div>
  );
}
