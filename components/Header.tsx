"use client";

import { useEffect, useState } from "react";

interface Props {
  lastFetched: string | null;
  onAdminClick: () => void;
}

export default function Header({ lastFetched, onAdminClick }: Props) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);

  useEffect(() => {
    if (!lastFetched) return;
    const update = () => {
      const diff = Math.floor((Date.now() - new Date(lastFetched).getTime()) / 1000);
      setSecondsAgo(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lastFetched]);

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur border-b border-white/10">
      <div className="flex items-center gap-3">
        <img
          src="https://www.freelogovectors.net/wp-content/uploads/2025/04/masters-logo-freelogovectors.net_.png"
          alt="Masters logo"
          className="h-8 md:h-10 w-auto object-contain"
        />
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white">
          2025 Masters Calcutta
        </h1>
        <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
          <span className="w-1.5 h-1.5 bg-white rounded-full inline-block" />
          LIVE
        </span>
      </div>

      <div className="flex items-center gap-3">
        {secondsAgo !== null && (
          <span className="text-gray-400 text-xs hidden sm:block">
            Updated {secondsAgo}s ago
          </span>
        )}
        <button
          onClick={onAdminClick}
          className="text-xl hover:scale-110 transition-transform"
          title="Admin — log bonus point"
          aria-label="Open admin panel"
        >
          ⭐
        </button>
      </div>
    </header>
  );
}
