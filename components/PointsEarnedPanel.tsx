"use client";

import { PointEvent } from "@/lib/points-rules";
import { TEAMS } from "@/lib/calcutta-data";
import { PRIZE_STRUCTURE } from "@/lib/calcutta-data";
import { useState } from "react";
import PointsTracker from "./PointsTracker";

interface Props {
  events: PointEvent[];
  onEdit: (event: PointEvent) => void;
  onToggleComplete: (event: PointEvent) => void;
}

interface GolferRow {
  golfer: string;
  team: string;
  teamColor: string;
  eagles: number;
  birdies: number;
  total: number;
}

const teamColorMap = new Map(TEAMS.map((t) => [t.name, t.color]));

export default function PointsEarnedPanel({ events, onEdit, onToggleComplete }: Props) {
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [teamsOpen, setTeamsOpen] = useState(false);

  const golferMap = new Map<string, GolferRow>();
  for (const e of events) {
    if (!golferMap.has(e.golfer)) {
      golferMap.set(e.golfer, {
        golfer: e.golfer,
        team: e.earnedByTeam,
        teamColor: teamColorMap.get(e.earnedByTeam) ?? "bg-gray-600",
        eagles: 0,
        birdies: 0,
        total: 0,
      });
    }
    const row = golferMap.get(e.golfer)!;
    if (e.reason === "Eagle") row.eagles++;
    else row.birdies++;
    row.total++;
  }
  const rows = [...golferMap.values()].sort((a, b) => b.total - a.total || b.eagles - a.eagles);

  const teamTally = new Map<string, number>();
  for (const e of events) teamTally.set(e.earnedByTeam, (teamTally.get(e.earnedByTeam) ?? 0) + 1);
  const teamRows = [...teamTally.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      {/* Points Tracker — first on mobile (order-1), second on desktop (lg:order-2) */}
      <div className="order-1 lg:order-2">
        <PointsTracker events={events} onEdit={onEdit} onToggleComplete={onToggleComplete} />
      </div>

      {/* Points Leaders — second on mobile (order-2), first on desktop (lg:order-1) */}
      <div className="order-2 lg:order-1 bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setLeadersOpen((o) => !o)}
          className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors text-left"
        >
          <span className="text-base">⭐</span>
          <h2 className="text-white font-bold text-sm uppercase tracking-wider flex-1">Points Leaders</h2>
          <span className="text-gray-500 text-xs">{events.length} total</span>
          <span className="text-gray-400 text-sm">{leadersOpen ? "▲" : "▼"}</span>
        </button>

        {leadersOpen && rows.length === 0 && (
          <div className="border-t border-white/10 px-4 py-8 text-center text-gray-600 text-sm">No bonus points logged yet</div>
        )}
        {leadersOpen && rows.length > 0 && (
          <div className="border-t border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs uppercase border-b border-white/5">
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Golfer</th>
                  <th className="px-3 py-2 text-center w-10" title="Eagles">🦅</th>
                  <th className="px-3 py-2 text-center w-10" title="Birdies">🐦</th>
                  <th className="px-3 py-2 text-right w-10">Tot</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.golfer} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}`}>
                    <td className="px-3 py-2 text-gray-400 text-xs font-mono">{i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${r.teamColor}`} />
                        <div>
                          <div className="text-white font-medium text-xs leading-tight">{r.golfer}</div>
                          <div className="text-gray-500 text-[10px] truncate">{r.team}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.eagles > 0 ? <span className="text-[#c9a84c] font-bold text-xs">{r.eagles}</span> : <span className="text-gray-700 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {r.birdies > 0 ? <span className="text-green-400 font-bold text-xs">{r.birdies}</span> : <span className="text-gray-700 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-white font-bold text-sm">{r.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {teamRows.length > 0 && (
              <div className="border-t border-white/5 px-3 py-2 flex gap-3 flex-wrap">
                {teamRows.map(([team, count]) => (
                  <div key={team} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-sm ${teamColorMap.get(team) ?? "bg-gray-600"}`} />
                    <span className="text-gray-400 text-[10px] truncate max-w-[80px]">{team}</span>
                    <span className="text-[#c9a84c] text-[10px] font-bold">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prize Breakdown — always last */}
      <div className="order-3 bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setPrizeOpen((o) => !o)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] inline-block" />
            <span className="text-white font-bold text-sm uppercase tracking-wider">Prize Breakdown</span>
            <span className="text-[#c9a84c] font-bold text-sm">${PRIZE_STRUCTURE.totalPot.toLocaleString()}</span>
          </div>
          <span className="text-gray-400 text-sm">{prizeOpen ? "▲" : "▼"}</span>
        </button>
        {prizeOpen && (
          <div className="border-t border-white/10">
            <table className="w-full text-sm">
              <tbody>
                {PRIZE_STRUCTURE.payouts.map((p) => (
                  <tr key={p.label} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-2 text-gray-300">
                      <div>{p.label}</div>
                      {p.label === "1st round leader" && (
                        <div className="text-green-400 text-xs font-semibold mt-0.5">Green Jackets · Iron Legends</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-[#c9a84c] font-semibold align-top">
                      {p.amount > 0 ? `$${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : p.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Team Breakdown */}
      <div className="order-4 bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        <button
          onClick={() => setTeamsOpen((o) => !o)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-white font-bold text-sm uppercase tracking-wider">Team Breakdown</span>
          <span className="text-gray-400 text-sm">{teamsOpen ? "▲" : "▼"}</span>
        </button>
        {teamsOpen && (
          <div className="border-t border-white/10 divide-y divide-white/5">
            {TEAMS.map((team) => (
              <div key={team.id} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${team.color}`} />
                  <span className="text-white font-semibold text-xs">{team.name}</span>
                </div>
                <div className="text-gray-400 text-[11px] leading-relaxed pl-4">
                  {team.members.join(", ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
