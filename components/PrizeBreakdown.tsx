"use client";

import { useState } from "react";
import { PRIZE_STRUCTURE } from "@/lib/calcutta-data";

export default function PrizeBreakdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-black/50 backdrop-blur border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c9a84c] inline-block" />
          <span className="text-white font-bold text-sm uppercase tracking-wider">
            Prize Breakdown
          </span>
          <span className="text-[#c9a84c] font-bold text-sm">
            ${PRIZE_STRUCTURE.totalPot.toLocaleString()}
          </span>
        </div>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-white/10">
          <table className="w-full text-sm">
            <tbody>
              {PRIZE_STRUCTURE.payouts.map((p) => (
                <tr
                  key={p.label}
                  className="border-b border-white/5 hover:bg-white/5"
                >
                  <td className="px-4 py-2 text-gray-300">
                    <div>{p.label}</div>
                    {p.label === "1st round leader" && (
                      <div className="text-green-400 text-xs font-semibold mt-0.5">Green Jackets · Iron Legends</div>
                    )}
                    {p.label === "2nd round leader" && (
                      <div className="text-green-400 text-xs font-semibold mt-0.5">Fairway Kings · Rory McIlroy</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-[#c9a84c] font-semibold align-top">
                    {p.amount > 0
                      ? `$${p.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                      : p.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
