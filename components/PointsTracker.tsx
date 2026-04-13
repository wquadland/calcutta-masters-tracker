"use client";

import { useState, useEffect, useCallback } from "react";
import { TEAMS } from "@/lib/calcutta-data";
import { PointEvent } from "@/lib/points-rules";
import type { PendingSlot } from "@/app/api/pending-points/route";

interface Props {
  events: PointEvent[];
  onEdit: (event: PointEvent) => void;
  onToggleComplete?: (event: PointEvent) => void;
}

const teamColorMap = new Map(TEAMS.map((t) => [t.name, t.color]));

export default function PointsTracker({ events, onEdit, onToggleComplete }: Props) {
  const [tab, setTab] = useState<"leaderboard" | "history">("leaderboard");
  const [detectedByTeam, setDetectedByTeam] = useState<Map<string, number>>(new Map());
  const [detectedAssignedByTeam, setDetectedAssignedByTeam] = useState<Map<string, number>>(new Map());
  const [selectedMember, setSelectedMember] = useState<string | null>(null);

  interface CompletionLogEntry {
    member: string;
    action: "complete" | "undo";
    pendingAfter: number;
    completeAfter: number;
    timestamp: Date;
  }
  const [completionLog, setCompletionLog] = useState<CompletionLogEntry[]>([]);

  const fetchDetected = useCallback(async () => {
    try {
      const res = await fetch("/api/pending-points");
      const data = await res.json();
      const slots: PendingSlot[] = data.slots ?? [];
      const pending = new Map<string, number>();
      const assigned = new Map<string, number>();
      for (const s of slots) {
        if (s.alreadyLogged) {
          assigned.set(s.team, (assigned.get(s.team) ?? 0) + 1);
        } else {
          pending.set(s.team, (pending.get(s.team) ?? 0) + 1);
        }
      }
      setDetectedByTeam(pending);
      setDetectedAssignedByTeam(assigned);
    } catch { /* ignore */ }
  }, []);

  const fetchCompletionLog = useCallback(async () => {
    try {
      const res = await fetch("/api/point-redemption-log");
      const data = await res.json();
      const entries = (data.log ?? []).map((row: Record<string, unknown>) => ({
        member: row.member as string,
        action: row.action as "complete" | "undo",
        pendingAfter: row.pending_after as number,
        completeAfter: row.complete_after as number,
        timestamp: new Date(row.created_at as string),
      }));
      setCompletionLog(entries);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchDetected(); fetchCompletionLog(); }, [fetchDetected, fetchCompletionLog]);

  // Earned: both counts come from the same ESPN detection source so they add up correctly
  const allEarned = new Set([...detectedAssignedByTeam.keys(), ...detectedByTeam.keys()]);
  const earnedRanked = [...allEarned]
    .map((t) => ({
      team: t,
      complete: detectedAssignedByTeam.get(t) ?? 0,
      pending: detectedByTeam.get(t) ?? 0,
    }))
    .sort((a, b) => (b.complete + b.pending) - (a.complete + a.pending));

  // Assigned: split by complete/pending per member
  const assignedPending = new Map<string, number>();
  const assignedComplete = new Map<string, number>();
  for (const e of events) {
    if (e.isComplete) {
      assignedComplete.set(e.assignedTo, (assignedComplete.get(e.assignedTo) ?? 0) + 1);
    } else {
      assignedPending.set(e.assignedTo, (assignedPending.get(e.assignedTo) ?? 0) + 1);
    }
  }
  const allAssigned = new Set([...assignedPending.keys(), ...assignedComplete.keys()]);
  const assignedRanked = [...allAssigned]
    .map((m) => ({ member: m, pending: assignedPending.get(m) ?? 0, complete: assignedComplete.get(m) ?? 0 }))
    .sort((a, b) => (b.pending + b.complete) - (a.pending + a.complete));

  const unassigned = [...detectedByTeam.values()].reduce((a, b) => a + b, 0);
  const pending = events.filter((e) => !e.isComplete).length;
  const complete = events.filter((e) => e.isComplete).length;

  return (
    <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-lg">⭐</span>
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">Miles Tracker</h2>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {unassigned > 0 && (
            <span className="bg-red-600/80 text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wide flex items-center justify-center">
              {unassigned} Unassigned
            </span>
          )}
          {pending > 0 && (
            <span className="bg-yellow-600/80 text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wide flex items-center justify-center">
              {pending} Pending
            </span>
          )}
          {complete > 0 && (
            <span className="bg-green-700/60 text-white text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wide flex items-center justify-center">
              {complete} Done
            </span>
          )}
        </div>
      </div>

      <div className="flex border-b border-white/10">
        {(["leaderboard", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              tab === t ? "text-white border-b-2 border-[#006747]" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-3">
        {tab === "leaderboard" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2 font-semibold">Earned (by team)</p>
              {earnedRanked.length === 0 && <p className="text-gray-600 text-xs">None yet</p>}
              {earnedRanked.map(({ team, complete, pending }, i) => (
                <div key={team} className="flex items-start gap-1.5 mb-1.5">
                  <span className="text-gray-400 text-[10px] w-4 mt-0.5">{i + 1}</span>
                  <span className={`w-2 h-2 rounded-sm flex-shrink-0 mt-1 ${teamColorMap.get(team) ?? "bg-gray-600"}`} />
                  <span className="text-white text-xs flex-1 leading-tight">{team}</span>
                  <span className="flex items-center gap-0.5 flex-shrink-0">
                    {pending > 0 && <span className="text-red-400 font-bold text-xs">{pending}</span>}
                    {pending > 0 && complete > 0 && <span className="text-gray-600 text-[10px]">/</span>}
                    {complete > 0 && <span className="text-green-400 font-bold text-xs">{complete}</span>}
                  </span>
                </div>
              ))}
              <p className="text-gray-600 text-[9px] mt-2">🔴 unassigned · 🟢 assigned</p>
            </div>
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2 font-semibold">Assigned (to member)</p>
              {assignedRanked.length === 0 && <p className="text-gray-600 text-xs">None yet</p>}
              {assignedRanked.map(({ member, pending, complete }, i) => (
                <div key={member} className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-gray-400 text-[10px] w-4">{i + 1}</span>
                  <button
                    onClick={() => setSelectedMember(member)}
                    className="text-white text-xs flex-1 text-left hover:text-[#c9a84c] transition-colors"
                  >{member}</button>
                  {pending > 0 && <span className="text-yellow-400 font-bold text-xs">{pending}</span>}
                  {pending > 0 && complete > 0 && <span className="text-gray-600 text-[10px]">/</span>}
                  {complete > 0 && <span className="text-green-400 font-bold text-xs">{complete}</span>}
                </div>
              ))}
              <p className="text-gray-600 text-[9px] mt-2">🟡 pending · 🟢 done</p>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.length === 0 && completionLog.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No point events logged yet</p>
            )}
            {[
              ...completionLog.map((entry, i) => ({ kind: "completion" as const, ts: entry.timestamp.getTime(), i, entry })),
              ...events.map((e) => ({ kind: "event" as const, ts: new Date(e.timestamp).getTime(), e })),
            ]
              .sort((a, b) => b.ts - a.ts)
              .map((item) => item.kind === "completion" ? (
                <div key={`c-${item.i}`} className="rounded-lg px-3 py-2 text-xs bg-white/[0.03] border border-white/10 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.entry.action === "complete" ? "bg-green-400" : "bg-yellow-400"}`} />
                  <span className="flex-1 text-gray-300">
                    <span className="text-white font-semibold">{item.entry.member}</span>
                    {item.entry.action === "complete" ? " redeemed a point" : " moved a point back to pending"}
                    {" — "}
                    <span className="text-yellow-400 font-bold">{item.entry.pendingAfter}</span>
                    <span className="text-gray-600"> : </span>
                    <span className="text-green-400 font-bold">{item.entry.completeAfter}</span>
                  </span>
                  <span className="text-gray-600 flex-shrink-0">
                    {item.entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ) : (
                <div
                  key={item.e.id}
                  className={`rounded-lg px-3 py-2 text-xs border ${
                    item.e.isComplete ? "bg-white/[0.02] border-white/5" : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400">R{item.e.round}</span>
                    {item.e.hole > 0 && <span className="text-gray-400">• Hole {item.e.hole}</span>}
                    <span className="text-gray-600 ml-auto text-[10px]">
                      {new Date(item.e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <button
                      onClick={() => onEdit(item.e)}
                      className="text-gray-500 hover:text-white transition-colors"
                      title="Edit this event"
                    >
                      ✏️
                    </button>
                  </div>
                  <div className="text-white font-medium">
                    {item.e.golfer}
                    <span className="text-gray-400 font-normal"> — {item.e.reason}</span>
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    <span
                      className={`inline-block px-1 rounded text-[10px] font-semibold ${
                        teamColorMap.get(item.e.earnedByTeam) ?? "bg-gray-700"
                      } text-white mr-1`}
                    >
                      {item.e.earnedByTeam}
                    </span>
                    <span className="text-gray-500 text-[10px]">{item.e.assignedByMember} →</span>{" "}
                    <span className="text-white font-semibold">{item.e.assignedTo}</span>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* Member quick-toggle modal */}
      {selectedMember && (() => {
        const pending = events
          .filter((e) => e.assignedTo === selectedMember && !e.isComplete)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const complete = events.filter((e) => e.assignedTo === selectedMember && e.isComplete);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setSelectedMember(null)}>
            <div className="bg-[#0f1a0f] border border-white/20 rounded-2xl w-full max-w-xs shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <h3 className="text-white font-bold text-sm">⭐ {selectedMember}</h3>
                <button onClick={() => setSelectedMember(null)} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
              </div>
              <div className="px-4 py-4 space-y-3">
                {/* Counts */}
                <div className="flex items-center justify-center gap-6 py-2">
                  <div className="text-center">
                    <div className="text-red-400 font-bold text-2xl">{pending.length}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wide">Pending</div>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div className="text-center">
                    <div className="text-green-400 font-bold text-2xl">{complete.length}</div>
                    <div className="text-gray-500 text-[10px] uppercase tracking-wide">Complete</div>
                  </div>
                </div>
                {/* Actions */}
                <button
                  disabled={pending.length === 0}
                  onClick={async () => {
                    const evt = pending[0];
                    onToggleComplete?.(evt);
                    const entry = {
                      member: selectedMember,
                      action: "complete" as const,
                      pendingAfter: pending.length - 1,
                      completeAfter: complete.length + 1,
                      timestamp: new Date(),
                    };
                    setCompletionLog((prev) => [entry, ...prev]);
                    fetch("/api/point-redemption-log", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        pointEventId: evt.id,
                        member: selectedMember,
                        action: "complete",
                        pendingAfter: entry.pendingAfter,
                        completeAfter: entry.completeAfter,
                      }),
                    }).then(async (r) => { if (!r.ok) console.error("completion-log POST failed", await r.text()); }).catch(console.error);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors bg-green-700/60 text-green-300 hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Mark one redeemed →
                </button>
                <button
                  disabled={complete.length === 0}
                  onClick={async () => {
                    const evt = complete[0];
                    onToggleComplete?.(evt);
                    const entry = {
                      member: selectedMember,
                      action: "undo" as const,
                      pendingAfter: pending.length + 1,
                      completeAfter: complete.length - 1,
                      timestamp: new Date(),
                    };
                    setCompletionLog((prev) => [entry, ...prev]);
                    fetch("/api/point-redemption-log", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        pointEventId: evt.id,
                        member: selectedMember,
                        action: "undo",
                        pendingAfter: entry.pendingAfter,
                        completeAfter: entry.completeAfter,
                      }),
                    }).then(async (r) => { if (!r.ok) console.error("completion-log POST failed", await r.text()); }).catch(console.error);
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-colors bg-white/10 text-gray-300 hover:bg-red-700/40 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Move one back to pending
                </button>

                {/* Pending points list */}
                {pending.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide font-semibold mb-2">Pending points</p>
                    <div className="space-y-1.5 overflow-y-auto max-h-48">
                    {pending.map((e, i) => (
                      <div key={e.id} className={`flex items-start gap-2 text-[11px] rounded-lg px-2.5 py-1.5 ${i === 0 ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-white/[0.03]"}`}>
                        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${i === 0 ? "bg-yellow-400" : "bg-gray-600"}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-semibold">{e.golfer}</span>
                          <span className="text-gray-500"> · {e.reason}</span>
                          <div className="text-gray-600 text-[10px] mt-0.5">
                            from <span className="text-gray-400">{e.assignedByMember}</span>
                            {" · "}
                            {new Date(e.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
                            {" "}
                            {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
