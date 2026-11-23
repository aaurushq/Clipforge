import asyncio
import os
import uuid
import time
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src.config import UPLOAD_DIR, CLIPS_DIR, BASE_DIR
from src.pipeline.downloader import get_video_info, download_video, extract_audio
from src.pipeline.transcriber import transcribe_audio
from src.pipeline.analyzer import analyze_transcript_for_clips
from src.pipeline.subtitles import generate_ass_subtitles
from src.pipeline.video_processor import cut_and_render_clip

app = FastAPI(title="ClipForge API", version="1.0.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve rendered clips and thumbnails
app.mount("/api/clips/file", StaticFiles(directory=str(CLIPS_DIR)), name="clips")

# In-memory task database
tasks_db: Dict[str, Dict[str, Any]] = {}

class TaskCreateRequest(BaseModel):
    url: Optional[str] = None
    length: str = "medium"  # "short", "medium", "long"
    subtitles: bool = True
    aspect_ratio: str = "9:16"
    crop_mode: str = "blur_fill"

def update_task_progress(task_id: str, step: int, progress: float, message: str):
    if task_id in tasks_db:
        tasks_db[task_id]["step"] = step
        tasks_db[task_id]["progress"] = progress
        tasks_db[task_id]["message"] = message
        tasks_db[task_id]["updated_at"] = time.time()

async def run_clipping_pipeline(task_id: str):
    task = tasks_db[task_id]
    task["status"] = "processing"
    
    task_dir = UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    task_clips_dir = CLIPS_DIR / task_id
    task_clips_dir.mkdir(parents=True, exist_ok=True)

    try:
        source_url = task.get("url")
        source_file = task.get("local_file_path")
        
        # ----------------- STEP 0: FETCHING -----------------
        update_task_progress(task_id, 0, 5.0, "Fetching video source...")
        
        if source_url:
            # YouTube download
            def dl_cb(pct, msg):
                # Scale 5 to 20%
                p = 5.0 + (pct * 0.15)
                update_task_progress(task_id, 0, p, msg)

            dl_result = await asyncio.to_thread(download_video, source_url, task_dir, dl_cb)
            video_path = dl_result["file_path"]
            task["title"] = dl_result["title"]
            task["duration"] = dl_result["duration"]
            task["thumbnail"] = dl_result["thumbnail"]
        elif source_file:
            video_path = source_file
        else:
            raise ValueError("No video URL or file provided.")

        update_task_progress(task_id, 0, 20.0, "Source video ready.")

        # ----------------- STEP 1: TRANSCRIBING -----------------
        update_task_progress(task_id, 1, 22.0, "Extracting audio track...")
        audio_path = str(task_dir / "audio.mp3")
        await asyncio.to_thread(extract_audio, video_path, audio_path)

        def trans_cb(pct, msg):
            update_task_progress(task_id, 1, pct, msg)

        update_task_progress(task_id, 1, 28.0, "Transcribing speech and extracting timestamps...")
        transcript_result = await asyncio.to_thread(transcribe_audio, audio_path, trans_cb)
        task["transcript"] = transcript_result

        update_task_progress(task_id, 1, 45.0, "Transcription completed.")

        # ----------------- STEP 2: FINDING MOMENTS -----------------
        update_task_progress(task_id, 2, 48.0, "Finding moments with AI virality model...")
        
        def find_cb(pct, msg):
            update_task_progress(task_id, 2, pct, msg)

        analyzed_clips = await asyncio.to_thread(
            analyze_transcript_for_clips,
            transcript_result,
            task.get("title", "Video"),
            task.get("length", "medium"),
            find_cb
        )

        update_task_progress(task_id, 2, 65.0, f"Found {len(analyzed_clips)} high-retention moments.")

        # ----------------- STEP 3: RENDERING CLIPS -----------------
        update_task_progress(task_id, 3, 67.0, "Rendering vertical 9:16 clips...")
        
        rendered_clips = []
        total_clips = len(analyzed_clips)

        for i, clip_info in enumerate(analyzed_clips):
            clip_num = i + 1
            clip_id = f"clip_{clip_num}"
            out_clip_name = f"{clip_id}.mp4"
            out_clip_path = str(task_clips_dir / out_clip_name)
            
            clip_progress_pct = 65.0 + ((i / total_clips) * 33.0)
            update_task_progress(task_id, 3, clip_progress_pct, f"Creating clip {clip_num}/{total_clips}...")

            # 1. Generate Subtitles ASS file
            ass_path = None
            if task.get("subtitles", True):
                ass_file = task_clips_dir / f"{clip_id}.ass"
                ass_path = generate_ass_subtitles(
                    words=transcript_result.get("words", []),
                    clip_start=clip_info["start_time"],
                    clip_end=clip_info["end_time"],
                    output_path=ass_file
                )

            # 2. Reframe, burn subtitles, render MP4
            render_result = await asyncio.to_thread(
                cut_and_render_clip,
                source_video_path=video_path,
                start_time=clip_info["start_time"],
                end_time=clip_info["end_time"],
                output_clip_path=out_clip_path,
                subtitle_ass_path=ass_path,
                crop_mode=task.get("crop_mode", "blur_fill")
            )

            # Format time strings
            s_min = int(clip_info["start_time"] // 60)
            s_sec = int(clip_info["start_time"] % 60)
            e_min = int(clip_info["end_time"] // 60)
            e_sec = int(clip_info["end_time"] % 60)

            clip_entry = {
                "id": clip_id,
                "clip_order": clip_num,
                "filename": out_clip_name,
                "video_url": f"/api/clips/file/{task_id}/{out_clip_name}",
                "thumbnail_url": f"/api/clips/file/{task_id}/{clip_id}.jpg",
                "title": clip_info.get("title", f"Clip #{clip_num}"),
                "hook_title": clip_info.get("hook_title", f"Clip #{clip_num}"),
                "start_time": f"{s_min:02d}:{s_sec:02d}",
                "end_time": f"{e_min:02d}:{e_sec:02d}",
                "duration": round(clip_info["end_time"] - clip_info["start_time"], 1),
                "virality_score": clip_info.get("virality_score", 90),
                "hook_score": clip_info.get("hook_score", 23),
                "engagement_score": clip_info.get("engagement_score", 22),
                "value_score": clip_info.get("value_score", 22),
                "shareability_score": clip_info.get("shareability_score", 23),
                "hook_type": clip_info.get("hook_type", "Shock"),
                "reasoning": clip_info.get("reasoning", "Engaging hook with dynamic retention."),
                "text": ""
            }
            rendered_clips.append(clip_entry)

        task["clips"] = rendered_clips
        task["status"] = "completed"
        task["step"] = 3
        task["progress"] = 100.0
        task["message"] = f"All {len(rendered_clips)} clips generated successfully!"
        task["completed_at"] = time.time()

    except Exception as e:
        task["status"] = "failed"
        task["error"] = str(e)
        task["message"] = f"Processing failed: {str(e)}"
        print(f"Task {task_id} failed with error: {e}")

@app.post("/api/tasks")
async def create_task(req: TaskCreateRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    
    # Try getting metadata early if YouTube
    title = "Processing Video"
    duration = 0
    thumbnail = None
    
    if req.url:
        try:
            info = await asyncio.to_thread(get_video_info, req.url)
            title = info.get("title", title)
            duration = info.get("duration", 0)
            thumbnail = info.get("thumbnail")
        except Exception as e:
            print(f"Metadata probe warning: {e}")

    task_data = {
        "id": task_id,
        "status": "queued",
        "step": 0,
        "progress": 0.0,
        "message": "Task queued in line...",
        "url": req.url,
        "title": title,
        "duration": duration,
        "thumbnail": thumbnail,
        "length": req.length,
        "subtitles": req.subtitles,
        "crop_mode": req.crop_mode,
        "created_at": time.time(),
        "clips": [],
        "error": None
    }
    
    tasks_db[task_id] = task_data
    background_tasks.add_task(run_clipping_pipeline, task_id)
    
    return task_data

@app.post("/api/tasks/upload")
async def upload_and_create_task(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    length: str = Form("medium"),
    subtitles: bool = Form(True),
    crop_mode: str = Form("blur_fill")
):
    task_id = str(uuid.uuid4())
    task_dir = UPLOAD_DIR / task_id
    task_dir.mkdir(parents=True, exist_ok=True)
    
    dest_path = task_dir / file.filename
    with open(dest_path, "wb") as f:
        content = await file.read()
        f.write(content)

    task_data = {
        "id": task_id,
        "status": "queued",
        "step": 0,
        "progress": 0.0,
        "message": "File uploaded. Starting processing pipeline...",
        "local_file_path": str(dest_path),
        "title": file.filename,
        "duration": 0,
        "thumbnail": None,
        "length": length,
        "subtitles": subtitles,
        "crop_mode": crop_mode,
        "created_at": time.time(),
        "clips": [],
        "error": None
    }

    tasks_db[task_id] = task_data
    background_tasks.add_task(run_clipping_pipeline, task_id)
    return task_data

@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_db[task_id]

@app.get("/api/tasks")
async def list_tasks():
    # Return list sorted by created_at descending
    all_tasks = list(tasks_db.values())
    all_tasks.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return all_tasks

@app.get("/api/tasks/{task_id}/clips")
async def get_task_clips(task_id: str):
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_db[task_id].get("clips", [])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "ClipForge"}
