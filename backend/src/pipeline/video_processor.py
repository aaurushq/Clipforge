import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ASSETS_DIR = BASE_DIR / "backend" / "assets"
if not ASSETS_DIR.exists():
    ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets"

BGM_DIR = ASSETS_DIR / "bgm"
SFX_DIR = ASSETS_DIR / "sfx"

def cut_and_render_clip(
    source_video_path: str,
    start_time: float,
    end_time: float,
    output_clip_path: str,
    subtitle_ass_path: Optional[str] = None,
    aspect_ratio: str = "9:16",
    crop_mode: str = "blur_fill",  # "blur_fill" or "center_crop"
    add_bgm: bool = True,
    add_sfx: bool = True,
    mood: str = "energetic",
    sfx_cues: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Extracts clip from source, reframes to 9:16 (1080x1920), burns animated subtitles,
    mixes mood-matched background music with audio ducking, and adds timed sound effects.
    """
    duration = max(1.0, end_time - start_time)
    out_path = Path(output_clip_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 1. Video Filters
    if crop_mode == "blur_fill":
        vf_base = (
            "[0:v]split=2[bg_in][fg_in];"
            "[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:20[bg];"
            "[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[base]"
        )
        current_v = "[base]"
    else:
        vf_base = "[0:v]crop=ih*9/16:ih:(iw-ow)/2:0,scale=1080:1920[base]"
        current_v = "[base]"

    if subtitle_ass_path and Path(subtitle_ass_path).exists():
        clean_ass = str(subtitle_ass_path).replace("\\", "/").replace(":", "\\:")
        vf_filter = f"{vf_base};{current_v}ass='{clean_ass}'[outv]"
        map_v = "[outv]"
    else:
        vf_filter = f"{vf_base}"
        map_v = current_v

    # 2. Audio Processing & Inputs
    extra_inputs = []
    audio_filters = []
    mix_sources = ["[0:a]"]
    next_input_idx = 1

    # BGM handling
    if add_bgm:
        bgm_file = BGM_DIR / f"{mood.lower()}.mp3"
        if not bgm_file.exists():
            bgm_file = BGM_DIR / "energetic.mp3"
        
        if bgm_file.exists():
            extra_inputs.extend(["-stream_loop", "-1", "-i", str(bgm_file)])
            # Ducking volume: 0.14 (14%), fade in 0.6s, fade out 1.0s at end
            fade_out_start = max(0.0, duration - 1.0)
            audio_filters.append(
                f"[{next_input_idx}:a]volume=0.14,afade=t=in:st=0:d=0.6,afade=t=out:st={fade_out_start:.2f}:d=1.0[bgm_ducked]"
            )
            mix_sources.append("[bgm_ducked]")
            next_input_idx += 1

    # SFX handling
    if add_sfx and sfx_cues:
        for cue in sfx_cues[:4]: # Limit to top 4 cues for clean sound
            sfx_type = cue.get("type", "whoosh").lower()
            offset = float(cue.get("offset", 0.0))
            if offset >= duration:
                continue

            sfx_file = SFX_DIR / f"{sfx_type}.mp3"
            if sfx_file.exists():
                extra_inputs.extend(["-i", str(sfx_file)])
                delay_ms = max(0, int(offset * 1000))
                sfx_label = f"sfx_{next_input_idx}"
                # Adelay in milliseconds for left & right channels
                audio_filters.append(
                    f"[{next_input_idx}:a]volume=0.45,adelay={delay_ms}|{delay_ms},apad[{sfx_label}]"
                )
                mix_sources.append(f"[{sfx_label}]")
                next_input_idx += 1

    # Audio filter combining
    if len(mix_sources) > 1:
        mix_str = "".join(mix_sources) + f"amix=inputs={len(mix_sources)}:duration=first:dropout_transition=2[outa]"
        audio_filters.append(mix_str)
        full_filter = f"{vf_filter};{';'.join(audio_filters)}"
        map_a = "[outa]"
    else:
        full_filter = vf_filter
        map_a = "0:a?"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-to", str(end_time),
        "-i", source_video_path,
        *extra_inputs,
        "-filter_complex", full_filter,
        "-map", map_v,
        "-map", map_a,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        str(out_path)
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as e:
        # Fallback without audio mixing if source has audio issues
        fallback_cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-to", str(end_time),
            "-i", source_video_path,
            "-filter_complex", vf_filter,
            "-map", map_v,
            "-map", "0:a?",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "22",
            "-c:a", "aac",
            "-b:a", "192k",
            str(out_path)
        ]
        subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

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
        "duration": duration,
        "mood": mood,
        "has_bgm": add_bgm,
        "has_sfx": add_sfx and bool(sfx_cues)
    }
