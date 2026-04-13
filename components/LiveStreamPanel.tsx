"use client";

import { useState } from "react";
import { GolferResult } from "@/lib/espn-api";
import ScoreCell from "./ScoreCell";
import PrizeBreakdown from "./PrizeBreakdown";

interface Props {
  golfers: GolferResult[];
}

export default function LiveStreamPanel({ golfers }: Props) {
  const [streamError, setStreamError] = useState(false);

  // Recent score feed: last 10 active golfers sorted by score
  const feed = [...golfers]
    .filter((g) => g.status === "active" || g.status === "complete")
    .sort((a, b) => a.scoreToPar - b.scoreToPar)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-4">
      {/* Live Stream */}
      <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse" />
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">
            Live Stream
          </h2>
        </div>

        {streamError ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-12 px-6"
            style={{ background: "linear-gradient(135deg, #0f1a0f 0%, #1a2e1a 100%)" }}
          >
            <div className="text-4xl">⛳</div>
            <p className="text-gray-300 text-center text-sm">
              Stream not live — visit Masters.com for official coverage
            </p>
            <a
              href="https://www.masters.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#006747] hover:bg-[#005538] text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Go to Masters.com →
            </a>
          </div>
        ) : (
          <div className="p-3">
            <iframe
              src="https://www.youtube.com/embed/live_stream?channel=UCsx6OQSR1-ZlGS_zRpLtVfw"
              className="w-full aspect-video rounded-lg border border-white/10"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              onError={() => setStreamError(true)}
            />
            <p className="text-gray-500 text-xs mt-2 text-center">
              If the stream appears unavailable,{" "}
              <button
                onClick={() => setStreamError(true)}
                className="text-[#c9a84c] underline"
              >
                click here
              </button>{" "}
              to see the Masters.com link.
            </p>
          </div>
        )}
      </div>

      {/* Recent Score Feed */}
      <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#006747] inline-block" />
          <h2 className="text-white font-bold text-sm uppercase tracking-wider">
            Score Feed
          </h2>
          <span className="text-gray-500 text-xs ml-auto">Top 10 active</span>
        </div>

        <div className="divide-y divide-white/5">
          {feed.length === 0 && (
            <div className="px-4 py-4 text-gray-500 text-sm text-center">
              No scores yet
            </div>
          )}
          {feed.map((g) => (
            <div
              key={g.id}
              className="px-4 py-2.5 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div>
                <span className="text-white text-sm font-medium">{g.name}</span>
                <span className="text-gray-500 text-xs ml-2">R{g.round}</span>
              </div>
              <ScoreCell
                scoreToPar={g.scoreToPar}
                display={g.score}
                status={g.status}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prize Breakdown */}
      <PrizeBreakdown />
    </div>
  );
}
