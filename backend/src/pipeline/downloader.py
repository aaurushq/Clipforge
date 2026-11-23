import os
import re
import yt_dlp
from typing import Dict, Any, Callable, Optional
from pathlib import Path

def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "", name).strip()

def get_video_info(url: str) -> Dict[str, Any]:
    """Fetch video metadata quickly without downloading the full video."""
    ydl_opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "web", "ios"]
            }
        }
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        return {
            "id": info.get("id"),
            "title": info.get("title", "Untitled Video"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail"),
            "channel": info.get("uploader", "YouTube Creator"),
            "view_count": info.get("view_count", 0),
            "is_live": info.get("is_live", False),
        }

def download_video(
    url: str,
    output_dir: Path,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> Dict[str, Any]:
    """
    Download video or audio using yt-dlp with mobile client anti-bot bypass.
    """
    def ydl_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
            downloaded = d.get('downloaded_bytes', 0)
            percent = (downloaded / total) * 100
            speed = d.get('speed', 0)
            speed_str = f" ({round(speed / 1024 / 1024, 1)} MB/s)" if speed else ""
            if progress_callback:
                progress_callback(min(percent, 99.0), f"Downloading video stream{speed_str}...")

    out_template = str(output_dir / "%(id)s.%(ext)s")
    
    ydl_opts = {
        "format": "bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
        "outtmpl": out_template,
        "progress_hooks": [ydl_hook],
        "quiet": True,
        "no_warnings": True,
        "extractor_args": {
            "youtube": {
                "player_client": ["android", "web", "ios"]
            }
        }
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        filename = ydl.prepare_filename(info)
        # Ensure it exists with extension
        actual_path = Path(filename)
        if not actual_path.exists():
            # sometimes merged into .mp4
            mp4_path = actual_path.with_suffix(".mp4")
            if mp4_path.exists():
                actual_path = mp4_path

        return {
            "id": info.get("id"),
            "title": info.get("title", "Untitled Video"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail"),
            "file_path": str(actual_path),
        }

def extract_audio(video_path: str, output_audio_path: str) -> str:
    """Extract 16kHz mono audio optimized for speech recognition."""
    import subprocess
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", "-b:a", "64k",
        output_audio_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    return output_audio_path
