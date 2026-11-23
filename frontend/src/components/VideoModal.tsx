"use client";

import React, { useEffect } from "react";
import { X, Download, Flame, Eye, Share2, Sparkles, TrendingUp } from "lucide-react";
import { ScoreRing } from "./ScoreRing";

interface ClipItem {
  id: string;
  clip_order: number;
  filename: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  hook_title: string;
  start_time: string;
  end_time: string;
  duration: number;
  virality_score: number;
  hook_score: number;
  engagement_score: number;
  value_score: number;
  shareability_score: number;
  hook_type: string;
  mood?: string;
  bgm_description?: string;
  sfx_cues?: any[];
  reasoning: string;
}

export function VideoModal({
  clip,
  onClose,
}: {
  clip: ClipItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!clip) return null;

  const scoreBars = [
    { label: "Hook Trigger", score: clip.hook_score, icon: Flame },
    { label: "Engagement", score: clip.engagement_score, icon: TrendingUp },
    { label: "Value Arc", score: clip.value_score, icon: Sparkles },
    { label: "Shareability", score: clip.shareability_score, icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12141a] shadow-2xl md:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-black/60 text-white/80 backdrop-blur transition hover:bg-black/90 hover:text-white"
        >
          <X className="size-5" />
        </button>

        {/* 9:16 Video Player Column */}
        <div className="relative flex items-center justify-center bg-black p-4 md:w-[420px] md:shrink-0">
          <video
            src={clip.video_url}
            controls
            autoPlay
            playsInline
            className="max-h-[55vh] w-auto rounded-xl object-contain shadow-lg md:max-h-[80vh]"
          />
        </div>

        {/* Details & Virality Analytics Column */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand">
                  {clip.hook_type || "Hook"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {clip.start_time} – {clip.end_time} · {clip.duration}s
                </span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-white">
                {clip.hook_title || clip.title}
              </h2>
            </div>

            {/* Virality Score Card */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center gap-4">
                <ScoreRing score={clip.virality_score} size={54} strokeWidth={4} />
                <div>
                  <div className="text-base font-semibold text-white">
                    {clip.virality_score}/100 Virality Score
                  </div>
                  <p className="text-xs text-muted-foreground">
                    High likelihood of hitting TikTok & Reels algorithms
                  </p>
                </div>
              </div>

              {/* Breakdown Bars */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
                {scoreBars.map((bar) => (
                  <div key={bar.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <bar.icon className="size-3 text-brand" />
                        {bar.label}
                      </span>
                      <span className="font-semibold text-white">{bar.score}/25</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-500"
                        style={{ width: `${(bar.score / 25) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Mood & Soundtrack Details */}
            {clip.mood && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">🎵 Auto Mood Soundtrack</span>
                  <span className="rounded-full bg-brand/20 px-2 py-0.5 font-bold uppercase tracking-wider text-brand">
                    {clip.mood}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
                  <span>🎶 Track: <strong className="text-white">{clip.bgm_description || "Dynamic Beat"}</strong></span>
                  <span>🔊 SFX: <strong className="text-white">{clip.sfx_cues?.length || 0} Cues Mixed</strong></span>
                </div>
              </div>
            )}

            {/* AI Reasoning */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                AI Strategic Analysis
              </h4>
              <p className="text-sm leading-relaxed text-zinc-300">
                {clip.reasoning}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-4">
            <a
              href={clip.video_url}
              download={clip.filename}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand/90"
            >
              <Download className="size-4" /> Download 1080p Clip
            </a>
            <button
              onClick={onClose}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
