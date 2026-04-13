"use client";

import { useRef, useState, useEffect, ChangeEvent } from "react";

interface Props {
  member: string;
  url?: string;
  onUploaded: (member: string, url: string) => void;
}

export default function MemberAvatar({ member, url, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localUrl, setLocalUrl] = useState(url);

  // Sync when parent loads avatars after mount
  useEffect(() => { setLocalUrl(url); }, [url]);

  const initials = member
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("member", member);
      const res = await fetch("/api/avatars", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setLocalUrl(data.url);
        onUploaded(member, data.url);
      }
    } finally {
      setUploading(false);
      // Reset so same file can be re-selected
      e.target.value = "";
    }
  };

  return (
    <button
      onClick={() => inputRef.current?.click()}
      title={`${member} — click to upload photo`}
      className="relative flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 border-white/20 hover:border-white/60 transition-colors group"
    >
      {localUrl ? (
        <img
          src={localUrl}
          alt={member}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-white/10 flex items-center justify-center text-[10px] font-bold text-gray-300">
          {initials}
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        {uploading ? (
          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-white text-[8px] font-bold">+</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </button>
  );
}
