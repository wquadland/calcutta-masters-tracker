"use client";

import { scoreColor } from "@/lib/utils";

interface Props {
  scoreToPar: number;
  display: string;
  status?: string;
}

export default function ScoreCell({ scoreToPar, display, status }: Props) {
  const isElim = status && ["cut", "withdrawn", "dq"].includes(status);
  return (
    <span
      className={`font-bold tabular-nums ${scoreColor(scoreToPar, status)} ${
        isElim ? "line-through opacity-60" : ""
      }`}
    >
      {display}
    </span>
  );
}
