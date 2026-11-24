"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowRight,
  SlidersHorizontal,
  Paperclip,
  Check,
  ChevronDown,
  AlertCircle,
  Loader2,
  FileVideo,
  X,
  Play,
  Film,
  Sparkles,
} from "lucide-react";

interface RecentTask {
  id: string;
  title: string;
  status: string;
  duration: number;
  thumbnail: string | null;
  created_at: number;
  clips?: any[];
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [subtitles, setSubtitles] = useState(true);
  const [bgm, setBgm] = useState(true);
  const [sfx, setSfx] = useState(true);
  const [effects, setEffects] = useState(true);
  const [transitions, setTransitions] = useState(true);
  const [cropMode, setCropMode] = useState<"blur_fill" | "center_crop">("blur_fill");
  const [showSettings, setShowSettings] = useState(false);

  // Recent tasks
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract YouTube Thumbnail
  const getYouTubeThumbnail = (link: string): string | null => {
    try {
      const match = link.match(
        /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/
      );
      return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
    } catch {
      return null;
    }
  };

  const ytThumb = getYouTubeThumbnail(url);

  // Fetch recent tasks from backend
  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRecentTasks(data))
      .catch((err) => console.error("Error fetching tasks:", err));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim() && !file) {
      setError("Please paste a valid YouTube video link or upload a video file.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      let createdTaskId = "";

      if (file) {
        // Upload file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("length", length);
        formData.append("subtitles", String(subtitles));
        formData.append("bgm", String(bgm));
        formData.append("sfx", String(sfx));
        formData.append("effects", String(effects));
        formData.append("transitions", String(transitions));
        formData.append("crop_mode", cropMode);

        const res = await fetch("/api/tasks/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to upload video file.");
        }

        const data = await res.json();
        createdTaskId = data.id;
      } else {
        // YouTube URL
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: url.trim(),
            length,
            subtitles,
            bgm,
            sfx,
            effects,
            transitions,
            crop_mode: cropMode,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to create clipping task.");
        }

        const data = await res.json();
        createdTaskId = data.id;
      }

      router.push(`/tasks/${createdTaskId}`);
    } catch (err: any) {
      if (err.message === "Failed to fetch" || err.message?.includes("fetch")) {
        setError("Backend server is offline or not responding. Please run start.bat to launch ClipForge servers.");
      } else {
        setError(err.message || "An error occurred while creating the task.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Hero Heading */}
      <div className="mt-8 text-center sm:mt-14">
        <h1 className="font-display text-2xl font-normal text-muted-foreground sm:text-3xl">
          Drop in a long video. Get back captioned, ready-to-post clips.
        </h1>
      </div>

      {/* Main Input Composer Card */}
      <div className="relative mt-8 w-full max-w-3xl">
        <form
          onSubmit={handleSubmit}
          className="relative rounded-2xl border border-border bg-card p-3 shadow-lg transition-all focus-within:border-brand/40 sm:p-4"
        >
          {/* Top row: Video thumbnail + Input */}
          <div className="flex items-center gap-3">
            {file ? (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand">
                <FileVideo className="size-6" />
              </div>
            ) : ytThumb ? (
              <img
                src={ytThumb}
                alt="Thumbnail"
                className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Film className="size-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              {file ? (
                <div className="flex items-center justify-between pr-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB · Ready to clip
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSubmit();
                    }
                  }}
                  placeholder="Paste a YouTube link or drop a file"
                  className="h-11 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70"
                />
              )}
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setFile(e.target.files[0]);
                setUrl("");
              }
            }}
          />

          {/* Bottom Controls Row */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              {/* Upload Button */}
              {!file && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <Paperclip className="size-3.5" />
                  <span>Upload</span>
                </button>
              )}

              {/* Preset Settings Dropdown Pill */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted/80 px-3 text-xs font-medium text-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <SlidersHorizontal className="size-3.5 text-brand" />
                  <span>
                    {length === "short" ? "Short (15–30s)" : length === "long" ? "Long (60–90s)" : "Medium (30–60s)"} ·{" "}
                    Captions: {subtitles ? "Hinglish/English" : "Off"}
                    {bgm ? " · 🎵 BGM" : ""}
                    {sfx ? " · 🔊 SFX" : ""}
                    {effects ? " · ⚡ FX" : ""}
                    {transitions ? " · ✨ Trans" : ""} · 9:16
                  </span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </button>

                {/* Settings Popover */}
                {showSettings && (
                  <div className="absolute left-0 top-10 z-30 w-72 rounded-2xl border border-border bg-card p-4 shadow-2xl backdrop-blur-md">
                    <div className="space-y-4">
                      {/* Length */}
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Clip Length
                        </p>
                        <div className="grid grid-cols-3 gap-1">
                          {(["short", "medium", "long"] as const).map((l) => (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setLength(l)}
                              className={`rounded-lg py-1.5 text-xs font-medium transition ${
                                length === l
                                  ? "bg-brand text-white"
                                  : "bg-muted text-foreground hover:bg-muted/80"
                              }`}
                            >
                              {l === "short" ? "15-30s" : l === "medium" ? "30-60s" : "60-90s"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Captions */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-xs font-medium text-foreground">Animated Captions</span>
                          <span className="block text-[10px] text-muted-foreground">Auto: Hinglish for Hindi · English for English</span>
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

                      {/* Auto BGM */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-xs font-medium text-foreground">Auto BGM (Mood-Matched)</span>
                          <span className="block text-[10px] text-muted-foreground">Smart audio ducking to 15%</span>
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

                      {/* Auto SFX */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-xs font-medium text-foreground">Auto SFX (Punches & Whooshes)</span>
                          <span className="block text-[10px] text-muted-foreground">Accurately timed transition hits</span>
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

                      {/* Visual Effects (Dynamic Zooms & Progress Bar) */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-xs font-medium text-foreground">⚡ Dynamic Zooms & Progress Bar</span>
                          <span className="block text-[10px] text-muted-foreground">Attention-hook punch zoom & bottom timer bar</span>
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

                      {/* Transitions (Hook Flash & Fade) */}
                      <div className="flex items-center justify-between border-t border-border/60 pt-3">
                        <div>
                          <span className="block text-xs font-medium text-foreground">✨ Hook Transitions & Flash</span>
                          <span className="block text-[10px] text-muted-foreground">Clean opening hook scene transitions</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTransitions(!transitions)}
                          className={`h-5 w-9 rounded-full transition-colors ${
                            transitions ? "bg-brand" : "bg-muted-foreground/30"
                          } relative`}
                        >
                          <span
                            className={`block size-4 rounded-full bg-white transition-transform ${
                              transitions ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Framing */}
                      <div className="border-t border-border/60 pt-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Framing Layout
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => setCropMode("blur_fill")}
                            className={`rounded-lg p-2 text-left transition ${
                              cropMode === "blur_fill"
                                ? "border border-brand/50 bg-brand/10 text-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            <span className="font-semibold">Full 9:16</span>
                            <span className="block text-[10px] text-muted-foreground">Blur background</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCropMode("center_crop")}
                            className={`rounded-lg p-2 text-left transition ${
                              cropMode === "center_crop"
                                ? "border border-brand/50 bg-brand/10 text-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            <span className="font-semibold">Center Crop</span>
                            <span className="block text-[10px] text-muted-foreground">Direct fill</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Action: Shortcut + Submit */}
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted-foreground sm:inline-block">
                ⌘ ↵
              </span>
              <button
                type="submit"
                disabled={isSubmitting || (!url.trim() && !file)}
                className="flex size-9 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ArrowUp className="size-4 stroke-[2.5]" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Error Alert Box */}
        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400 shadow-sm">
            <AlertCircle className="size-5 shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Recent Generations Section */}
      <section className="mt-16 w-full max-w-5xl md:mt-24" id="recent-heading">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
            Recent Generations
          </h2>
          {recentTasks.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {recentTasks.length} {recentTasks.length === 1 ? "video" : "videos"} processed
            </span>
          )}
        </div>

        {!mounted || recentTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No clips generated yet. Drop in a video link above to get started!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {recentTasks.map((t) => (
              <a
                key={t.id}
                href={`/tasks/${t.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-brand/40 hover:shadow-xl"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/10 dark:bg-black/50">
                  {t.thumbnail ? (
                    <img
                      src={t.thumbnail}
                      alt={t.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <Film className="size-8 opacity-40" />
                    </div>
                  )}
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur">
                    {t.duration ? `${Math.floor(t.duration / 60)}m` : "Video"}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <h3 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-brand">
                    {t.title}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        t.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : t.status === "failed"
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      ● {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                    <span>{t.clips ? `${t.clips.length} clips` : "Pending"}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
