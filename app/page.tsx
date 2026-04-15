"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import TournamentLeaderboard from "@/components/TournamentLeaderboard";
import PointsEarnedPanel from "@/components/PointsEarnedPanel";
import CalcuttaLeaderboard from "@/components/CalcuttaLeaderboard";
import PointsAdminModal from "@/components/PointsAdminModal";
import PointsEditModal from "@/components/PointsEditModal";
import { GolferResult, EventStatus } from "@/lib/espn-api";
import { PointEvent } from "@/lib/points-rules";

export default function Home() {
  const [golfers, setGolfers] = useState<GolferResult[]>([]);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState<EventStatus>("complete");
  const [nextEventDate, setNextEventDate] = useState<string | null>(null);
  const [pointEvents, setPointEvents] = useState<PointEvent[]>([]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PointEvent | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (data.golfers) setGolfers(data.golfers);
      if (data.lastFetched) setLastFetched(data.lastFetched);
      if (data.eventStatus) setEventStatus(data.eventStatus);
      if (data.nextEventDate !== undefined) setNextEventDate(data.nextEventDate);
    } catch { /* silently ignore */ }
  }, []);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch("/api/points");
      const data = await res.json();
      if (data.events) setPointEvents(data.events);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    fetchPoints();
    const id = setInterval(fetchLeaderboard, 60_000);
    return () => clearInterval(id);
  }, [fetchLeaderboard, fetchPoints]);

  const handlePointAdd = (event: PointEvent) => {
    setPointEvents((prev) => [event, ...prev]);
  };

  const handlePointEdit = (updated: PointEvent) => {
    setPointEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handlePointDelete = (id: string) => {
    setPointEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const handleToggleComplete = async (event: PointEvent) => {
    const updated = { ...event, isComplete: !event.isComplete };
    setPointEvents((prev) => prev.map((e) => (e.id === event.id ? updated : e)));
    try {
      await fetch(`/api/points/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplete: updated.isComplete }),
      });
    } catch {
      // revert on failure
      setPointEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastFetched={lastFetched} onAdminClick={() => setShowAdmin(true)} eventStatus={eventStatus} nextEventDate={nextEventDate} />

      <main className="flex-1 p-3 md:p-4 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[1600px] mx-auto">
          {/* Left — Tournament Leaderboard (3rd on mobile) */}
          <div className="lg:col-span-1 order-3 lg:order-1 min-w-0">
            <TournamentLeaderboard golfers={golfers} />
          </div>

          {/* Center — Points Leaders + Tracker + Prize (2nd on mobile) */}
          <div className="lg:col-span-1 order-2 lg:order-2 min-w-0">
            <PointsEarnedPanel
              events={pointEvents}
              onEdit={setEditingEvent}
              onToggleComplete={handleToggleComplete}
            />
          </div>

          {/* Right — Calcutta Leaderboard (1st on mobile) */}
          <div className="lg:col-span-1 order-1 lg:order-3 min-w-0">
            <CalcuttaLeaderboard golfers={golfers} />
          </div>
        </div>
      </main>

      {showAdmin && (
        <PointsAdminModal
          onClose={() => setShowAdmin(false)}
          onAdd={handlePointAdd}
        />
      )}

      {editingEvent && (
        <PointsEditModal
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
          onSave={handlePointEdit}
          onDelete={handlePointDelete}
        />
      )}
    </div>
  );
}
