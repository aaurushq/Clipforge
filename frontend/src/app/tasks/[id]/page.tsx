"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Download,
  Flame,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Film,
  AlertTriangle,
  Scissors,
} from "lucide-react";
import { ScoreRing } from "@/components/ScoreRing";
import { VideoModal } from "@/components/VideoModal";
import { ClipEditorModal } from "@/components/ClipEditorModal";

const PIPELINE_STEPS = [
  { id: "fetching", label: "Fetching video", pct: 20 },
  { id: "transcribing", label: "Transcribing", pct: 45 },
  { id: "finding", label: "Finding moments", pct: 65 },
  { id: "rendering", label: "Rendering clips", pct: 100 },
];

export default function TaskPage() {
  const params = useParams();
  const taskId = params.id as string;
  const router = useRouter();

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClip, setSelectedClip] = useState<any>(null);
  const [editingClip, setEditingClip] = useState<any>(null);

  const handleClipUpdated = (updatedClip: any) => {
    setTask((prev: any) => {
      if (!prev) return prev;
      const newClips = (prev.clips || []).map((c: any) =>
        c.id === updatedClip.id ? updatedClip : c
      );
      return { ...prev, clips: newClips };
    });
    setEditingClip(updatedClip);
    if (selectedClip && selectedClip.id === updatedClip.id) {
      setSelectedClip(updatedClip);
    }
  };

  // Poll task status
  useEffect(() => {
    let intervalId: any;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`);
        if (!res.ok) throw new Error("Task not found");
        const data = await res.json();
        setTask(data);
        setLoading(false);

        // Stop polling if completed or failed
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 2000);

    return () => clearInterval(intervalId);
  }, [taskId]);

  if (loading && !task) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Loading video workspace...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <h2 className="text-lg font-bold">Task not found</h2>
        <Link href="/" className="mt-4 rounded-lg bg-brand px-4 py-2 text-sm text-white">
          Back to Home
        </Link>
      </div>
    );
  }

  const currentStep = task.step ?? 0;
  const progress = task.progress ?? 0;
  const isFailed = task.status === "failed";
  const isCompleted = task.status === "completed";
  const clips = task.clips || [];

  // Determine highest scoring clip for "Top Pick"
  let maxScore = 0;
  clips.forEach((c: any) => {
    if (c.virality_score > maxScore) maxScore = c.virality_score;
  });

  return (
    <div className="flex flex-col space-y-8">
      {/* Top Header Bar */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Library
        </Link>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {task.title || "Processing Video"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={`inline-block size-2 rounded-full ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isFailed
                    ? "bg-rose-500"
                    : "animate-pulse bg-brand"
                }`}
              />
              <span>{task.url ? "YouTube" : "Uploaded File"}</span>
              {task.duration ? (
                <>
                  <span>·</span>
                  <span>{Math.floor(task.duration / 60)}m {Math.floor(task.duration % 60)}s source</span>
                </>
              ) : null}
            </div>
          </div>

          {isFailed && (
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/80 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              <RotateCcw className="size-3.5" /> Try Again
            </button>
          )}
        </div>
      </div>

      {/* State 1: Active Processing Progress Panel */}
      {!isCompleted && !isFailed && (
        <section className="relative isolate rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
          {/* Ambient Glow Blob */}
          <div className="aura-blob -top-12 left-1/4 h-56 w-80 rounded-full bg-brand/20 dark:bg-brand/30" />

          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {task.message || "Generating clips..."}
            </h2>
            <span className="text-sm font-semibold tabular-nums text-brand">
              {Math.round(progress)}%
            </span>
          </div>

          {/* Metal-Flow Iridescent Progress Bar */}
          <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="metal-flow h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max(progress, 3)}%` }}
            />
          </div>

          {/* 4 Pipeline Stage Stepper */}
          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
            {PIPELINE_STEPS.map((step, idx) => {
              const isPast = currentStep > idx;
              const isCurrent = currentStep === idx;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-1.5 truncate ${
                    isCurrent
                      ? "font-semibold text-foreground"
                      : isPast
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  {isPast ? (
                    <Check className="size-3.5 shrink-0 text-emerald-500" />
                  ) : isCurrent ? (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-brand" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-muted-foreground/30" />
                  )}
                  <span className="truncate">{step.label}</span>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            You can leave this page — your clips are being rendered in the background and will be waiting in your library.
          </p>

          {/* Skeleton 9:16 Cards Grid Preview */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-rise space-y-2">
                <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-muted/40 ring-1 ring-border">
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-t from-muted to-transparent" />
                </div>
                <div className="h-3 w-4/5 rounded bg-muted" />
                <div className="h-2.5 w-1/2 rounded bg-muted/60" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* State 2: Failed View */}
      {isFailed && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/5 p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="size-7" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">Processing Failed</h2>
          <p className="mt-2 max-w-md text-sm text-rose-600 dark:text-rose-300/80">
            {task.error || "Something went wrong while processing the video."}
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/"
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              Back to Home
            </Link>
          </div>
        </div>
      )}

      {/* State 3: Completed View - Vertical 9:16 Clips Grid */}
      {isCompleted && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
              Generated Clips ({clips.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {clips.map((clip: any) => {
              const isBest = clip.virality_score === maxScore && maxScore > 0;
              const aspectClass =
                clip.aspect_ratio === "16:9"
                  ? "aspect-video"
                  : clip.aspect_ratio === "1:1"
                  ? "aspect-square"
                  : clip.aspect_ratio === "4:5"
                  ? "aspect-[4/5]"
                  : "aspect-[9/16]";

              return (
                <article
                  key={clip.id}
                  onClick={() => setSelectedClip(clip)}
                  className="group animate-rise cursor-pointer space-y-2.5"
                >
                  {/* Dynamic Aspect Ratio Video Thumbnail Box */}
                  <div className={`relative ${aspectClass} overflow-hidden rounded-xl bg-black ring-1 ring-border transition-all duration-300 group-hover:ring-brand/50 group-hover:shadow-2xl`}>
                    <img
                      src={clip.thumbnail_url}
                      alt={clip.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    {/* Top Left: Top Pick Badge */}
                    {isBest && (
                      <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
                        <Flame className="size-3" /> Top Pick
                      </span>
                    )}

                    {/* Top Right: Virality Score Ring */}
                    <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 backdrop-blur">
                      <ScoreRing score={clip.virality_score} size={38} strokeWidth={3} />
                    </span>

                    {/* Center Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex size-12 items-center justify-center rounded-full bg-white text-black shadow-xl">
                        <Play className="ml-0.5 size-5 fill-current" />
                      </div>
                    </div>

                    {/* Bottom Left: Aspect Ratio & Quick Edit */}
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 z-10">
                      <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                        {clip.aspect_ratio || "9:16"}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingClip(clip);
                        }}
                        className="inline-flex items-center gap-0.5 rounded bg-brand/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow backdrop-blur transition hover:bg-brand"
                      >
                        <Scissors className="size-2.5" /> Edit
                      </button>
                    </div>

                    {/* Bottom Right: Duration Badge */}
                    <span className="absolute bottom-2.5 right-2.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white backdrop-blur">
                      {clip.duration}s
                    </span>
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1 px-1">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-brand">
                      {clip.hook_title || clip.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{clip.start_time} – {clip.end_time}</span>
                      {clip.mood && (
                        <span className="text-[10px] font-medium text-brand-foreground/80">
                          {clip.mood === "energetic" ? "⚡ Hype" :
                           clip.mood === "funny" ? "🎭 Funny" :
                           clip.mood === "dramatic" ? "🕵️ Suspense" :
                           clip.mood === "motivational" ? "💡 Inspiring" : "☕ Chill"}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Video Modal Player */}
      <VideoModal
        clip={selectedClip}
        onClose={() => setSelectedClip(null)}
        onOpenEditor={(clip) => {
          setSelectedClip(null);
          setEditingClip(clip);
        }}
      />

      {/* Clip Studio Editor Modal */}
      <ClipEditorModal
        taskId={taskId}
        clip={editingClip}
        isOpen={!!editingClip}
        onClose={() => setEditingClip(null)}
        onClipUpdated={handleClipUpdated}
      />
    </div>
  );
}
