"use client";

import { useState } from "react";
import { TEAMS } from "@/lib/calcutta-data";
import { ALL_MEMBERS, PointEvent } from "@/lib/points-rules";


const REASONS = [
  "Eagle",
  "Birdie - Hole 2 (Thu)",
  "Birdie - Hole 15 (Fri)",
  "Birdie - Hole 11 (Sat)",
  "Birdie - Hole 12 (Sat)",
  "Birdie - Hole 13 (Sun)",
  "Other",
];

interface Props {
  event: PointEvent;
  onClose: () => void;
  onSave: (updated: PointEvent) => void;
  onDelete: (id: string) => void;
}

export default function PointsEditModal({ event, onClose, onSave, onDelete }: Props) {
  const [authed] = useState(true);

  const [golfer, setGolfer] = useState(event.golfer);
  const [reason, setReason] = useState(REASONS.includes(event.reason) ? event.reason : "Other");
  const [round, setRound] = useState(String(event.round));
  const [hole, setHole] = useState(String(event.hole || ""));
  const [earnedByTeam, setEarnedByTeam] = useState(event.earnedByTeam);
  const [assignedTo, setAssignedTo] = useState(event.assignedTo);
  const [isComplete, setIsComplete] = useState(event.isComplete);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/points/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golfer, reason, round: Number(round), hole: Number(hole), earnedByTeam, assignedTo, isComplete }),
      });
      const data = await res.json();
      if (data.event) { onSave(data.event); onClose(); }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this point event?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/points/${event.id}`, { method: "DELETE" });
      onDelete(event.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0f1a0f] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">✏️ Edit Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {authed && (
            <div className="flex flex-col gap-3">
              {/* Status toggle */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 mb-1">
                <span className="text-white font-semibold text-sm">Status</span>
                <button
                  onClick={() => setIsComplete((v) => !v)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    isComplete
                      ? "bg-green-600 text-white"
                      : "bg-white/10 text-gray-300 hover:bg-white/20"
                  }`}
                >
                  {isComplete ? "✓ Complete" : "⏳ Pending"}
                </button>
              </div>

              <label className="text-gray-400 text-xs uppercase tracking-wide">Golfer</label>
              <input
                type="text"
                value={golfer}
                onChange={(e) => setGolfer(e.target.value)}
                className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
              />

              <label className="text-gray-400 text-xs uppercase tracking-wide">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
              >
                {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Round</label>
                  <select
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
                  >
                    {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Round {n}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Hole</label>
                  <input
                    type="number" min={1} max={18} value={hole}
                    onChange={(e) => setHole(e.target.value)}
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
                  />
                </div>
              </div>

              <label className="text-gray-400 text-xs uppercase tracking-wide">Earned By Team</label>
              <select
                value={earnedByTeam}
                onChange={(e) => setEarnedByTeam(e.target.value)}
                className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
              >
                {TEAMS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>

              <label className="text-gray-400 text-xs uppercase tracking-wide">Assigned To</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]"
              >
                {ALL_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-[#006747] hover:bg-[#005538] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-700/60 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-lg transition-colors"
                >
                  {deleting ? "…" : "🗑"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
