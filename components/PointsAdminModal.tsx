"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TEAMS } from "@/lib/calcutta-data";
import { ALL_MEMBERS, PointEvent } from "@/lib/points-rules";
import type { PendingSlot } from "@/app/api/pending-points/route";

const ALL_GOLFERS = [
  "Aaron Rai", "Adam Scott", "Akshay Bhatia", "Aldrich Potgieter", "Alex Noren",
  "Andrew Novak", "Angel Cabrera", "Ben Griffin", "Brandon Holtz", "Brian Campbell",
  "Brian Harman", "Brooks Koepka", "Bubba Watson", "Cameron Smith", "Cameron Young",
  "Carlos Ortiz", "Casey Jarvis", "Charl Schwartzel", "Chris Gotterup", "Collin Morikawa",
  "Corey Conners", "Daniel Berger", "Danny Willett", "Davis Riley", "Dustin Johnson",
  "Ethan Fang", "Fifa Laopakdee", "Fred Couples", "Gary Woodland", "Harris English",
  "Harry Hall", "Haotong Li", "Hideki Matsuyama", "Jackson Herrington", "Jacob Bridgeman",
  "Jake Knapp", "Jason Day", "J.J. Spaun", "John Keefer", "Jon Rahm", "Jordan Spieth",
  "Jose Maria Olazabal", "Justin Rose", "Justin Thomas", "Keegan Bradley",
  "Kristoffer Reitan", "Kurt Kitayama", "Ludvig Aberg", "Marco Penge", "Mason Howell",
  "Mateo Pulcini", "Matt Fitzpatrick", "Matt McCarty", "Maverick McNealy",
  "Max Greyserman", "Max Homa", "Michael Brennan", "Michael Kim", "Mike Weir",
  "Min Woo Lee", "Naoyuki Kataoka", "Nicolas Echavarria", "Nicolai Hojgaard",
  "Nick Taylor", "Patrick Cantlay", "Patrick Reed", "Rasmus Hojgaard",
  "Rasmus Neergaard-Petersen", "Robert MacIntyre", "Rory McIlroy", "Russell Henley",
  "Ryan Fox", "Ryan Gerard", "Sam Burns", "Sami Valimaki", "Sam Stevens",
  "Scottie Scheffler", "Sepp Straka", "Sergio Garcia", "Shane Lowry", "Si Woo Kim",
  "Sungjae Im", "Tommy Fleetwood", "Tom McKibbin", "Tyrrell Hatton", "Viktor Hovland",
  "Vijay Singh", "Wyndham Clark", "Xander Schauffele", "Zach Johnson",
];


const REASONS = [
  "Eagle", "Birdie - Hole 2 (Thu)", "Birdie - Hole 11 (Fri)",
  "Birdie - Hole 12 (Sat)", "Birdie - Hole 13 (Sun)", "Other",
];

function holeFromReason(r: string): string {
  const m = r.match(/Hole (\d+)/);
  return m ? m[1] : "";
}

const GOLFER_TEAM_MAP = new Map<string, string>();
for (const team of TEAMS) {
  for (const g of team.golfers) GOLFER_TEAM_MAP.set(g.name.toLowerCase(), team.name);
}

interface Props {
  onClose: () => void;
  onAdd: (event: PointEvent) => void;
}

interface TriggerGroup {
  triggerKey: string;
  golfer: string;
  team: string;
  round: number;
  hole: number;
  type: "EAGLE" | "BIRDIE" | "EAGLE_BIRDIE";
  reason: string;
  slots: PendingSlot[];
  isDemo: boolean;
}

const AUTH_KEY = "calcutta_admin_member";

export default function PointsAdminModal({ onClose, onAdd }: Props) {
  const [authed, setAuthed] = useState(false);
  const [loggedInMember, setLoggedInMember] = useState("");
  const [selectedMemberAuth, setSelectedMemberAuth] = useState("");
  const [otpStep, setOtpStep] = useState<"select" | "verify">("select");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const MEMBERS = Object.keys({
    "Alex": 1, "Morgan": 1, "Jordan": 1, "Casey": 1, "Riley": 1,
    "Taylor": 1, "Jamie": 1, "Drew": 1, "Avery": 1, "Quinn": 1,
    "Parker": 1, "Blake": 1, "Reese": 1, "Sage": 1, "River": 1,
    "Finley": 1, "Harper": 1, "Elliott": 1, "Brooks": 1, "Lane": 1,
    "Piper": 1, "Dallas": 1, "Hayden": 1,
  });

  // Check localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY);
    if (saved) { setAuthed(true); setLoggedInMember(saved); }
  }, []);

  const handleSendCode = async () => {
    if (!selectedMemberAuth) return;
    setSending(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: selectedMemberAuth }),
      });
      if (!res.ok) {
        const d = await res.json();
        setOtpError(d.error ?? "Failed to send code");
        return;
      }
      setOtpStep("verify");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async (val: string) => {
    if (val.length < 6) return;
    setVerifying(true);
    setOtpError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member: selectedMemberAuth, code: val }),
      });
      if (!res.ok) {
        setOtpError("Incorrect or expired code");
        setTimeout(() => setOtp(""), 600);
        return;
      }
      localStorage.setItem(AUTH_KEY, selectedMemberAuth);
      setLoggedInMember(selectedMemberAuth);
      setAuthed(true);
    } finally {
      setVerifying(false);
    }
  };

  const [groups, setGroups] = useState<TriggerGroup[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  // assignedTo per slot id
  const [quickAssigns, setQuickAssigns] = useState<Record<string, string>>({});
  const [quickSubmitting, setQuickSubmitting] = useState<string | null>(null);
  const [loggedSlotIds, setLoggedSlotIds] = useState<Set<string>>(new Set());
  const [golferSearch, setGolferSearch] = useState("");

  const [showManual, setShowManual] = useState(false);
  const [golfer, setGolfer] = useState("");
  const [golferSuggestions, setGolferSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [round, setRound] = useState("1");
  const [hole, setHole] = useState("");
  const [earnedByTeam, setEarnedByTeam] = useState(TEAMS[0].name);
  const [assignedTo, setAssignedTo] = useState("Lane");
  const [submitting, setSubmitting] = useState(false);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await fetch(`/api/pending-points?t=${Date.now()}`);
      const data = await res.json();
      const slots: PendingSlot[] = data.slots ?? [];

      // Group by triggerKey
      const groupMap = new Map<string, TriggerGroup>();
      for (const slot of slots) {
        if (!groupMap.has(slot.triggerKey)) {
          groupMap.set(slot.triggerKey, {
            triggerKey: slot.triggerKey,
            golfer: slot.golfer,
            team: slot.team,
            round: slot.round,
            hole: slot.hole,
            type: slot.type,
            reason: slot.reason,
            slots: [],
            isDemo: slot.isDemo ?? false,
          });
        }
        groupMap.get(slot.triggerKey)!.slots.push(slot);
      }
      setGroups([...groupMap.values()]);

      // Init quickAssigns
      const init: Record<string, string> = {};
      for (const slot of slots) {
        if (!slot.alreadyLogged) init[slot.id] = "Lane";
      }
      setQuickAssigns(init);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleGolferChange = (val: string) => {
    setGolfer(val);
    if (!val.trim()) { setGolferSuggestions([]); setShowSuggestions(false); return; }
    const matches = ALL_GOLFERS.filter((g) => g.toLowerCase().includes(val.toLowerCase()));
    setGolferSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectGolfer = (name: string) => {
    setGolfer(name);
    setShowSuggestions(false);
    const team = GOLFER_TEAM_MAP.get(name.toLowerCase());
    if (team) {
      setEarnedByTeam(team);
      // earnedByTeam updated; assignedByMember is always the logged-in member
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logEvent = async (body: Record<string, unknown>): Promise<PointEvent> => {
    const fallback: PointEvent = {
      id: `local-${Date.now()}-${Math.random()}`,
      golfer: (body.golfer as string) ?? "",
      reason: (body.reason as string) ?? "",
      round: Number(body.round) || 1,
      hole: Number(body.hole) || 0,
      earnedByTeam: (body.earnedByTeam as string) ?? "",
      assignedByMember: (body.assignedByMember as string) ?? "",
      assignedTo: (body.assignedTo as string) ?? "",
      timestamp: new Date().toISOString(),
      isComplete: false,
    };
    try {
      const res = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { onAdd(fallback); return fallback; }
      const data = await res.json();
      const event = data.event ?? fallback;
      onAdd(event);
      return event;
    } catch {
      onAdd(fallback);
      return fallback;
    }
  };

  const handleQuickLog = async (slot: PendingSlot) => {
    setQuickSubmitting(slot.id);
    try {
      const base = {
        golfer: slot.golfer,
        round: slot.round,
        hole: slot.hole,
        earnedByTeam: slot.team,
        assignedByMember: slot.assignedByMember,
      };
      if (slot.count === 2) {
        const holeMatch = slot.reason.match(/Hole (\d+)/);
        const dayMatch = slot.reason.match(/\(([^)]+)\)/);
        await Promise.all([
          logEvent({ ...base, reason: "Eagle", assignedTo: quickAssigns[`${slot.id}-0`] ?? "Lane" }),
          logEvent({ ...base, reason: `Birdie - Hole ${holeMatch?.[1] ?? slot.hole} (${dayMatch?.[1] ?? ""})`, assignedTo: quickAssigns[`${slot.id}-1`] ?? "Lane" }),
        ]);
      } else {
        await logEvent({ ...base, reason: slot.reason, assignedTo: quickAssigns[slot.id] ?? "Lane" });
      }
      setLoggedSlotIds((prev) => new Set(prev).add(slot.id));
      await fetchPending();
    } finally {
      setQuickSubmitting(null);
    }
  };

  const handleManualSubmit = async () => {
    if (!golfer.trim()) return;
    setSubmitting(true);
    try {
      const logged = await logEvent({ golfer, reason, round: Number(round), hole: Number(hole), earnedByTeam, assignedByMember: loggedInMember, assignedTo });
      if (logged) onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending = groups.reduce((n, g) => n + g.slots.filter((s) => !s.alreadyLogged).length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0f1a0f] border border-white/20 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">⭐ Points Admin</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* OTP auth screen */}
          {!authed && (
            <div className="flex flex-col items-center gap-5 py-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🔒</div>
                <h3 className="text-white font-bold text-base">
                  {otpStep === "select" ? "Who are you?" : `Code sent to ${selectedMemberAuth}`}
                </h3>
                {otpStep === "verify" && (
                  <p className="text-gray-400 text-xs mt-1">Enter the 6-digit code from your SMS</p>
                )}
              </div>

              {otpStep === "select" && (
                <>
                  <select
                    value={selectedMemberAuth}
                    onChange={(e) => setSelectedMemberAuth(e.target.value)}
                    className="w-48 bg-black/50 border border-white/20 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-[#006747]"
                  >
                    <option value="">Select your name…</option>
                    {MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <button
                    onClick={handleSendCode}
                    disabled={!selectedMemberAuth || sending}
                    className="bg-[#006747] hover:bg-[#005538] disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-lg transition-colors"
                  >
                    {sending ? "Sending…" : "Send Code"}
                  </button>
                  <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10 w-full">
                    <button
                      onClick={() => {
                        localStorage.setItem(AUTH_KEY, "Demo");
                        setLoggedInMember("Demo");
                        setAuthed(true);
                      }}
                      className="text-gray-400 hover:text-white text-xs underline underline-offset-2 transition-colors"
                    >
                      Continue as Demo
                    </button>
                    <p className="text-gray-600 text-[10px] text-center max-w-[200px]">
                      In the live version, participants authenticate via SMS code before logging events.
                    </p>
                  </div>
                </>
              )}

              {otpStep === "verify" && (
                <>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(val);
                      setOtpError("");
                      handleVerifyOtp(val);
                    }}
                    placeholder="000000"
                    className={`w-40 bg-black/50 border rounded-lg px-3 py-2.5 text-white text-center text-2xl tracking-widest focus:outline-none placeholder-gray-700 ${
                      otpError ? "border-red-500 animate-pulse" : "border-white/20 focus:border-[#006747]"
                    }`}
                    autoFocus
                    disabled={verifying}
                  />
                  <button
                    onClick={() => { setOtpStep("select"); setOtp(""); setOtpError(""); }}
                    className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                  >
                    ← Back
                  </button>
                </>
              )}

              {otpError && <p className="text-red-400 text-xs">{otpError}</p>}
            </div>
          )}

          {authed && (
            <>
              {/* Detected Events */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-bold text-sm uppercase tracking-wide">Detected Events</h3>
                  <div className="flex items-center gap-2">
                    {totalPending > 0 && (
                      <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {totalPending} unassigned
                      </span>
                    )}
                    <button onClick={fetchPending} className="text-gray-500 hover:text-white text-xs transition-colors">
                      ↻ refresh
                    </button>
                  </div>
                </div>

                {!pendingLoading && groups.length > 0 && (
                  <input
                    type="text"
                    value={golferSearch}
                    onChange={(e) => setGolferSearch(e.target.value)}
                    placeholder="Search player…"
                    className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#006747] mb-3"
                  />
                )}

                {pendingLoading ? (
                  <p className="text-gray-500 text-sm text-center py-4">Scanning ESPN data…</p>
                ) : groups.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-4">No qualifying events found yet.</p>
                ) : (
                  <div className="space-y-3">
                    {groups.filter((g) =>
                      g.golfer.toLowerCase().includes(golferSearch.toLowerCase()) &&
                      (g.isDemo || g.slots.some((s) => s.assignedByMember === loggedInMember))
                    ).sort((a, b) => a.team.localeCompare(b.team)).map((group) => {
                      const mySlots = group.isDemo
                        ? group.slots.slice(0, 1)  // show one representative slot per demo event
                        : group.slots.filter((s) => s.assignedByMember === loggedInMember);
                      const allLogged = mySlots.every((s) => s.alreadyLogged || loggedSlotIds.has(s.id));
                      return (
                        <div
                          key={group.triggerKey}
                          className={`rounded-xl border ${allLogged ? "border-white/5 opacity-60" : "border-[#006747]/40"}`}
                        >
                          {/* Trigger header */}
                          <div className={`px-3 py-2 rounded-t-xl flex items-center gap-2 ${allLogged ? "bg-white/[0.02]" : "bg-[#006747]/15"}`}>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${group.type === "BIRDIE" ? "bg-[#006747] text-white" : "bg-[#c9a84c] text-black"}`}>
                              {group.type === "EAGLE_BIRDIE" ? "EAGLE+BIRDIE ×2" : group.type}
                            </span>
                            <span className="text-white text-sm font-semibold flex-1 truncate">{group.golfer}</span>
                            {group.isDemo && (
                              <span className="text-[9px] font-semibold text-gray-500 border border-white/10 px-1 py-0.5 rounded flex-shrink-0">DEMO</span>
                            )}
                            <span className="text-gray-500 text-xs flex-shrink-0">R{group.round}·H{group.hole}</span>
                          </div>
                          <div className="px-3 pb-1 pt-0.5">
                            <span className="text-gray-500 text-[10px]">{group.team}</span>
                          </div>

                          {/* One row per team member */}
                          <div className="divide-y divide-white/5 border-t border-white/5">
                            {mySlots.map((slot) => (
                              <div key={slot.id} className="px-3 py-2 flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-300 text-xs font-semibold w-16 flex-shrink-0">{slot.assignedByMember}</span>
                                  {slot.alreadyLogged || loggedSlotIds.has(slot.id) ? (
                                    <span className="text-green-500 text-xs font-semibold">✓ Assigned</span>
                                  ) : slot.count === 2 ? (
                                    /* Two dropdowns for eagle-on-birdie-hole */
                                    <div className="flex-1 flex flex-col gap-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[#c9a84c] text-[10px] font-bold w-10 flex-shrink-0">Eagle</span>
                                        <select
                                          value={quickAssigns[`${slot.id}-0`] ?? "John"}
                                          onChange={(e) => setQuickAssigns((prev) => ({ ...prev, [`${slot.id}-0`]: e.target.value }))}
                                          className="flex-1 bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#006747] min-w-0"
                                        >
                                          {ALL_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-green-400 text-[10px] font-bold w-10 flex-shrink-0">Birdie</span>
                                        <select
                                          value={quickAssigns[`${slot.id}-1`] ?? "John"}
                                          onChange={(e) => setQuickAssigns((prev) => ({ ...prev, [`${slot.id}-1`]: e.target.value }))}
                                          className="flex-1 bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#006747] min-w-0"
                                        >
                                          {ALL_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                      </div>
                                      <button
                                        onClick={() => handleQuickLog(slot)}
                                        disabled={quickSubmitting === slot.id}
                                        className="self-end bg-[#006747] hover:bg-[#005538] disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                      >
                                        {quickSubmitting === slot.id ? "…" : "Log both"}
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <select
                                        value={quickAssigns[slot.id] ?? "John"}
                                        onChange={(e) => setQuickAssigns((prev) => ({ ...prev, [slot.id]: e.target.value }))}
                                        className="flex-1 bg-black/50 border border-white/20 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-[#006747] min-w-0"
                                      >
                                        {ALL_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                      <button
                                        onClick={() => handleQuickLog(slot)}
                                        disabled={quickSubmitting === slot.id}
                                        className="flex-shrink-0 bg-[#006747] hover:bg-[#005538] disabled:opacity-50 text-white text-xs font-bold px-3 py-1 rounded-lg transition-colors"
                                      >
                                        {quickSubmitting === slot.id ? "…" : "Log"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Manual Log */}
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={() => setShowManual((o) => !o)}
                  className="w-full flex items-center justify-between text-gray-400 hover:text-white text-sm transition-colors"
                >
                  <span className="font-semibold">Log Manually</span>
                  <span>{showManual ? "▲" : "▼"}</span>
                </button>

                {showManual && (
                  <div className="flex flex-col gap-3 mt-3">
                    <label className="text-gray-400 text-xs uppercase tracking-wide">Golfer Name</label>
                    <div className="relative" ref={suggestionsRef}>
                      <input
                        type="text" value={golfer}
                        onChange={(e) => handleGolferChange(e.target.value)}
                        onFocus={() => golfer && golferSuggestions.length > 0 && setShowSuggestions(true)}
                        placeholder="e.g. Rory McIlroy"
                        className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#006747]"
                        autoComplete="off"
                      />
                      {showSuggestions && (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-[#0f1a0f] border border-white/20 rounded-lg overflow-hidden shadow-xl max-h-40 overflow-y-auto">
                          {golferSuggestions.map((name) => (
                            <button key={name} type="button" onMouseDown={() => selectGolfer(name)}
                              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors">
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <label className="text-gray-400 text-xs uppercase tracking-wide">Reason</label>
                    <select value={reason} onChange={(e) => { setReason(e.target.value); const h = holeFromReason(e.target.value); if (h) setHole(h); }}
                      className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]">
                      {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Round</label>
                        <select value={round} onChange={(e) => setRound(e.target.value)}
                          className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]">
                          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>Round {n}</option>)}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1">Hole</label>
                        <input type="number" min={1} max={18} value={hole} onChange={(e) => setHole(e.target.value)}
                          placeholder="1–18" className="w-full bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#006747]" />
                      </div>
                    </div>

                    <label className="text-gray-400 text-xs uppercase tracking-wide">Earned By Team</label>
                    <select value={earnedByTeam} onChange={(e) => { setEarnedByTeam(e.target.value); }}
                      className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]">
                      {TEAMS.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>

                    <label className="text-gray-400 text-xs uppercase tracking-wide">Assigned By</label>
                    <div className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-gray-300 text-sm">{loggedInMember}</div>

                    <label className="text-gray-400 text-xs uppercase tracking-wide">Assigned To</label>
                    <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                      className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#006747]">
                      {ALL_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <button onClick={handleManualSubmit} disabled={submitting || !golfer.trim()}
                      className="bg-[#006747] hover:bg-[#005538] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors">
                      {submitting ? "Logging…" : "Log Bonus Point"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
