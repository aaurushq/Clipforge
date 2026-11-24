"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Scissors,
  Check,
  Download,
  Loader2,
  Volume2,
  VolumeX,
  Music,
  Zap,
  Sliders,
  Ratio,
  Maximize2,
  Minimize2,
  AlertCircle,
  Film,
} from "lucide-react";

export interface ClipItem {
  id: string;
  clip_order: number;
  filename: string;
  video_url: string;
  thumbnail_url: string;
  title: string;
  hook_title: string;
  start_time: string;
  end_time: string;
  start_seconds?: number;
  end_seconds?: number;
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
  aspect_ratio?: string;
  crop_mode?: string;
  subtitles?: boolean;
  bgm?: boolean;
  sfx?: boolean;
  effects?: boolean;
  transitions?: boolean;
}

interface ClipEditorModalProps {
  taskId: string;
  clip: ClipItem | null;
  isOpen: boolean;
  onClose: () => void;
  onClipUpdated: (updatedClip: ClipItem) => void;
}

const parseTimeString = (timeStr?: string): number => {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return 0;
};

const formatSeconds = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export function ClipEditorModal({
  taskId,
  clip,
  isOpen,
  onClose,
  onClipUpdated,
}: ClipEditorModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Editable settings
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9" | "1:1" | "4:5">("9:16");
  const [cropMode, setCropMode] = useState<"blur_fill" | "center_crop">("blur_fill");
  const [startSeconds, setStartSeconds] = useState<number>(0);
  const [endSeconds, setEndSeconds] = useState<number>(30);
  const [subtitles, setSubtitles] = useState<boolean>(true);
  const [bgm, setBgm] = useState<boolean>(true);
  const [sfx, setSfx] = useState<boolean>(true);
  const [effects, setEffects] = useState<boolean>(true);
  const [transitions, setTransitions] = useState<boolean>(true);
  const [mood, setMood] = useState<string>("energetic");

  // Playback & Render states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderMessage, setRenderMessage] = useState<string>("");
  const [successToast, setSuccessToast] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever clip changes
  useEffect(() => {
    if (clip) {
      const s = clip.start_seconds !== undefined ? clip.start_seconds : parseTimeString(clip.start_time);
      const e = clip.end_seconds !== undefined ? clip.end_seconds : (s + (clip.duration || 30));
      setStartSeconds(Math.max(0, s));
      setEndSeconds(Math.max(s + 5, e));
      setAspectRatio((clip.aspect_ratio as any) || "9:16");
      setCropMode((clip.crop_mode as any) || "blur_fill");
      setSubtitles(clip.subtitles ?? true);
      setBgm(clip.bgm ?? true);
      setSfx(clip.sfx ?? true);
      setEffects(clip.effects ?? true);
      setTransitions(clip.transitions ?? true);
      setMood(clip.mood || "energetic");
      setError(null);
      setSuccessToast(false);
    }
  }, [clip]);

  // Keyboard escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRendering) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isRendering]);

  if (!isOpen || !clip) return null;

  const clipDuration = Math.max(1, endSeconds - startSeconds);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleRerender = async () => {
    if (endSeconds <= startSeconds) {
      setError("End time must be greater than start time.");
      return;
    }
    if (endSeconds - startSeconds < 3) {
      setError("Clip length must be at least 3 seconds.");
      return;
    }

    setIsRendering(true);
    setError(null);
    setRenderMessage("Re-rendering with new aspect ratio, effects & timing...");

    try {
      const res = await fetch(`/api/tasks/${taskId}/clips/${clip.id}/rerender`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_seconds: startSeconds,
          end_seconds: endSeconds,
          aspect_ratio: aspectRatio,
          crop_mode: cropMode,
          subtitles,
          bgm,
          sfx,
          effects,
          transitions,
          mood,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to re-render clip.");
      }

      const data = await res.json();
      if (data.clip) {
        onClipUpdated(data.clip);
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 4000);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during re-rendering.");
    } finally {
      setIsRendering(false);
      setRenderMessage("");
    }
  };

  // Preview container aspect ratio style class
  const getAspectContainerClass = () => {
    switch (aspectRatio) {
      case "16:9":
        return "w-full max-w-[500px] aspect-[16/9]";
      case "1:1":
        return "w-full max-w-[340px] aspect-square";
      case "4:5":
        return "w-full max-w-[320px] aspect-[4/5]";
      case "9:16":
      default:
        return "w-full max-w-[280px] sm:max-w-[300px] aspect-[9/16]";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md sm:p-6 overflow-y-auto">
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:flex-row">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isRendering}
          className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-muted/80 text-foreground backdrop-blur transition hover:bg-muted"
        >
          <X className="size-5" />
        </button>

        {/* Left Column: Live Preview & Aspect Ratio Simulator */}
        <div className="flex flex-col items-center justify-center bg-muted/20 p-6 lg:w-[460px] lg:shrink-0 border-b lg:border-b-0 lg:border-r border-border">
          <div className="flex w-full items-center justify-between pb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Film className="size-3.5 text-brand" /> Live Preview
            </span>
            <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-bold text-brand">
              {aspectRatio} · {cropMode === "blur_fill" ? "Blur Fill" : "Crop"}
            </span>
          </div>

          {/* Dynamic Aspect Ratio Preview Box */}
          <div
            className={`relative flex items-center justify-center overflow-hidden rounded-2xl bg-black shadow-2xl transition-all duration-300 ${getAspectContainerClass()}`}
          >
            <video
              ref={videoRef}
              src={clip.video_url}
              playsInline
              loop
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              className="size-full object-contain"
            />

            {/* Play/Pause overlay button */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity hover:opacity-100"
            >
              <div className="flex size-14 items-center justify-center rounded-full bg-white/90 text-black shadow-xl">
                {isPlaying ? <Pause className="size-6" /> : <Play className="ml-1 size-6 fill-current" />}
              </div>
            </button>

            {/* Overlay Badges on Video Preview */}
            <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-white">
              <span className="rounded bg-black/70 px-2 py-0.5 backdrop-blur font-medium">
                ⏱ {formatSeconds(clipDuration)} ({startSeconds.toFixed(1)}s – {endSeconds.toFixed(1)}s)
              </span>
              <div className="flex items-center gap-1">
                {subtitles && (
                  <span className="rounded bg-brand/90 px-1.5 py-0.5 font-bold shadow text-[10px]">
                    CC
                  </span>
                )}
                {bgm && (
                  <span className="rounded bg-amber-500/90 px-1.5 py-0.5 font-bold shadow text-[10px]">
                    🎵 {mood}
                  </span>
                )}
                {effects && (
                  <span className="rounded bg-indigo-500/90 px-1.5 py-0.5 font-bold shadow text-[10px]">
                    ⚡ FX
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Video Duration / Scrubber bar */}
          <div className="mt-4 flex w-full max-w-[340px] items-center justify-between text-xs text-muted-foreground">
            <span>Trimmed Length: <strong className="text-foreground">{clipDuration.toFixed(1)}s</strong></span>
            <button
              type="button"
              onClick={togglePlay}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
            >
              {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 fill-current" />}
              {isPlaying ? "Pause Preview" : "Play Clip"}
            </button>
          </div>
        </div>

        {/* Right Column: Customization Controls & Re-render */}
        <div className="flex flex-1 flex-col justify-between overflow-y-auto p-6 lg:p-8">
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand">
                  Clip Studio Editor
                </span>
                <span className="text-xs text-muted-foreground">
                  Task #{taskId.slice(0, 8)} · Clip #{clip.clip_order}
                </span>
              </div>
              <h2 className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
                {clip.hook_title || clip.title}
              </h2>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-300">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success Notification */}
            {successToast && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="size-4 shrink-0" />
                <span className="font-semibold">Clip successfully re-rendered and updated in 1080p!</span>
              </div>
            )}

            {/* Section 1: Aspect Ratio Selection */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                1. Aspect Ratio Format
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  {
                    id: "9:16",
                    title: "9:16 Vertical",
                    desc: "Reels / Shorts / TikTok",
                  },
                  {
                    id: "16:9",
                    title: "16:9 Landscape",
                    desc: "YouTube / Desktop",
                  },
                  {
                    id: "1:1",
                    title: "1:1 Square",
                    desc: "Instagram / LinkedIn",
                  },
                  {
                    id: "4:5",
                    title: "4:5 Portrait",
                    desc: "Instagram Feed",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAspectRatio(item.id as any)}
                    className={`flex flex-col rounded-xl border p-3 text-left transition ${
                      aspectRatio === item.id
                        ? "border-brand bg-brand/10 ring-1 ring-brand"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <span className="text-xs font-bold text-foreground">{item.title}</span>
                    <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Trimming Controls */}
            <div>
              <div className="flex items-center justify-between pb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  2. Trimming & Time Range
                </label>
                <span className="text-xs font-medium text-brand">
                  Total: {clipDuration.toFixed(1)}s
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4">
                {/* Start Time Control */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Start Time (sec)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setStartSeconds((prev) => Math.max(0, parseFloat((prev - 0.5).toFixed(1))))}
                      className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={startSeconds}
                      onChange={(e) => setStartSeconds(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1 text-center text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setStartSeconds((prev) => parseFloat((prev + 0.5).toFixed(1)))}
                      className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <span className="block text-[10px] text-muted-foreground text-center">
                    {formatSeconds(startSeconds)}
                  </span>
                </div>

                {/* End Time Control */}
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">End Time (sec)</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEndSeconds((prev) => Math.max(startSeconds + 1, parseFloat((prev - 0.5).toFixed(1))))}
                      className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.5"
                      min={startSeconds + 1}
                      value={endSeconds}
                      onChange={(e) => setEndSeconds(parseFloat(e.target.value) || (startSeconds + 5))}
                      className="w-full rounded-lg border border-border bg-card px-2.5 py-1 text-center text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                    />
                    <button
                      type="button"
                      onClick={() => setEndSeconds((prev) => parseFloat((prev + 0.5).toFixed(1)))}
                      className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-xs font-bold hover:bg-muted"
                    >
                      +
                    </button>
                  </div>
                  <span className="block text-[10px] text-muted-foreground text-center">
                    {formatSeconds(endSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Framing & Video Style */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                3. Video Framing Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCropMode("blur_fill")}
                  className={`rounded-xl border p-3 text-left transition ${
                    cropMode === "blur_fill"
                      ? "border-brand bg-brand/10 ring-1 ring-brand text-foreground"
                      : "border-border bg-card hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="block text-xs font-bold">✨ Blur Fill (Recommended)</span>
                  <span className="block text-[10px] opacity-80">
                    Preserves entire frame with frosted blur background
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCropMode("center_crop")}
                  className={`rounded-xl border p-3 text-left transition ${
                    cropMode === "center_crop"
                      ? "border-brand bg-brand/10 ring-1 ring-brand text-foreground"
                      : "border-border bg-card hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <span className="block text-xs font-bold">🔍 Center Direct Crop</span>
                  <span className="block text-[10px] opacity-80">
                    Fills frame directly with centered zoom
                  </span>
                </button>
              </div>
            </div>

            {/* Section 4: Production Audio & Visual FX Toggles */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                4. Effects, Captions & Audio
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Subtitles Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <span className="block text-xs font-bold text-foreground">Animated Subtitles</span>
                    <span className="block text-[10px] text-muted-foreground">Yellow word-by-word highlight</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubtitles(!subtitles)}
                    className={`h-5 w-9 rounded-full transition-colors ${
                      subtitles ? "bg-brand" : "bg-muted-foreground/30"
                    } relative`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white transition-transform ${
                        subtitles ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Auto BGM Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <span className="block text-xs font-bold text-foreground">Background Music</span>
                    <span className="block text-[10px] text-muted-foreground">Smart audio ducking</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBgm(!bgm)}
                    className={`h-5 w-9 rounded-full transition-colors ${
                      bgm ? "bg-brand" : "bg-muted-foreground/30"
                    } relative`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white transition-transform ${
                        bgm ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* SFX Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <span className="block text-xs font-bold text-foreground">Sound FX (Whoosh / Hits)</span>
                    <span className="block text-[10px] text-muted-foreground">Scene transition punches</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSfx(!sfx)}
                    className={`h-5 w-9 rounded-full transition-colors ${
                      sfx ? "bg-brand" : "bg-muted-foreground/30"
                    } relative`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white transition-transform ${
                        sfx ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                {/* Visual Zooms & Progress Bar */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <span className="block text-xs font-bold text-foreground">Punch Zooms & Timer Bar</span>
                    <span className="block text-[10px] text-muted-foreground">High retention visual hooks</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEffects(!effects)}
                    className={`h-5 w-9 rounded-full transition-colors ${
                      effects ? "bg-brand" : "bg-muted-foreground/30"
                    } relative`}
                  >
                    <span
                      className={`block size-4 rounded-full bg-white transition-transform ${
                        effects ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Mood Selector if BGM enabled */}
              {bgm && (
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <span className="block text-xs font-semibold text-foreground">
                    🎵 Music Mood Theme
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: "energetic", label: "⚡ Energetic / Hype" },
                      { id: "motivational", label: "💡 Motivational" },
                      { id: "dramatic", label: "🕵️ Dramatic / Suspense" },
                      { id: "funny", label: "🎭 Funny / Quirky" },
                      { id: "chill", label: "☕ Chill / Lo-fi" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMood(m.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          mood === m.id
                            ? "bg-brand text-white shadow"
                            : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <a
              href={clip.video_url}
              download={clip.filename}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Download className="size-3.5" /> Download Current (.mp4)
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isRendering}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRerender}
                disabled={isRendering}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-brand/90 disabled:opacity-50"
              >
                {isRendering ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{renderMessage || "Re-rendering clip..."}</span>
                  </>
                ) : (
                  <>
                    <Scissors className="size-3.5" />
                    <span>Re-render & Export ({aspectRatio})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
