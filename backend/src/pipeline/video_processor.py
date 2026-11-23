import subprocess
from pathlib import Path
from typing import Dict, Any, Optional

def cut_and_render_clip(
    source_video_path: str,
    start_time: float,
    end_time: float,
    output_clip_path: str,
    subtitle_ass_path: Optional[str] = None,
    aspect_ratio: str = "9:16",
    crop_mode: str = "blur_fill"  # "blur_fill" or "center_crop"
) -> Dict[str, Any]:
    """
    Extracts clip from source, reframes to 9:16 (1080x1920), burns animated subtitles, and exports MP4.
    """
    duration = end_time - start_time
    out_path = Path(output_clip_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # Prepare video filter
    # 1. 9:16 Reframing
    if crop_mode == "blur_fill":
        # Split: background blurred + scaled to fill, foreground centered
        vf_base = (
            "[0:v]split=2[bg_in][fg_in];"
            "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:20[bg];"
            "[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[base]"
        )
        current_stream = "[base]"
    else:
        # Direct center crop
        vf_base = "[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920[base]"
        current_stream = "[base]"

    # 2. Add subtitles if available
    if subtitle_ass_path and Path(subtitle_ass_path).exists():
        # Escape path for FFmpeg filter on Windows
        clean_ass = str(subtitle_ass_path).replace("\\", "/").replace(":", "\\:")
        vf_filter = f"{vf_base};{current_stream}ass='{clean_ass}'[outv]"
        map_opt = ["[outv]"]
    else:
        vf_filter = f"{vf_base}"
        map_opt = [current_stream]

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-to", str(end_time),
        "-i", source_video_path,
        "-filter_complex", vf_filter,
        "-map", map_opt[0],
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(out_path)
    ]

    subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 3. Generate thumbnail image
    thumb_path = out_path.with_suffix(".jpg")
    thumb_cmd = [
        "ffmpeg", "-y",
        "-ss", "0.5",
        "-i", str(out_path),
        "-vframes", "1",
        "-q:v", "2",
        str(thumb_path)
    ]
    subprocess.run(thumb_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    return {
        "clip_path": str(out_path),
        "thumbnail_path": str(thumb_path),
        "duration": duration
    }
