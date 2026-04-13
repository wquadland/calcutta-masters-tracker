"use client";

import { Team } from "@/lib/calcutta-data";

interface Props {
  team: Team;
  size?: "sm" | "md";
}

export default function TeamBadge({ team, size = "sm" }: Props) {
  const text = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <span
      className={`${team.color} ${text} rounded font-semibold text-white whitespace-nowrap inline-block max-w-[90px] truncate`}
      title={team.name}
    >
      {team.name}
    </span>
  );
}
