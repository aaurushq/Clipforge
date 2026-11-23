import json
import re
from typing import Dict, Any, List
from google import genai
from src.config import GEMINI_API_KEY, GEMINI_MODEL

def analyze_transcript_for_clips(
    transcript_data: Dict[str, Any],
    video_title: str,
    target_duration: str = "medium",  # "short" (15-30s), "medium" (30-60s), "long" (60-90s)
    progress_callback: Any = None
) -> List[Dict[str, Any]]:
    """
    Uses Google Gemini 3 Flash / 2.5 Flash to analyze speech transcript and pick the highest virality segments.
    """
    import os
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or GEMINI_API_KEY
    if not api_key:
        raise ValueError("GEMINI_API_KEY / GOOGLE_API_KEY is not configured.")

    client = genai.Client(api_key=api_key)

    # Format transcript with timestamps
    words = transcript_data.get("words", [])
    if not words:
        # Fallback if no words array
        raise ValueError("No transcript words with timestamps available.")

    # Compress into timestamped chunks (e.g. 5-10 second intervals) so prompt is lightweight
    chunks = []
    current_chunk = []
    current_start = words[0]["start"]
    
    for w in words:
        current_chunk.append(w["text"])
        if w["end"] - current_start >= 8.0:
            chunks.append(f"[{round(current_start, 1)}s - {round(w['end'], 1)}s]: {' '.join(current_chunk)}")
            current_chunk = []
            current_start = w["end"]
    if current_chunk:
        chunks.append(f"[{round(current_start, 1)}s - {round(words[-1]['end'], 1)}s]: {' '.join(current_chunk)}")

    transcript_summary = "\n".join(chunks)

    # Duration guidance
    dur_guidance = {
        "short": "between 15 and 30 seconds",
        "medium": "between 30 and 60 seconds",
        "long": "between 60 and 90 seconds"
    }.get(target_duration, "between 30 and 60 seconds")

    system_instruction = """You are a world-class viral video strategist and short-form editor for TikTok, YouTube Shorts, and Instagram Reels.
Your task is to identify the most engaging, viral, high-retention moments from the provided video transcript.

Each clip MUST:
1. Have a strong, instantaneous hook in the first 3 seconds (curiosity gap, shocking fact, punchline, bold statement, or conflict).
2. Have a coherent narrative arc (Hook -> Core Value / Story -> Punchline / Climax).
3. Be within the target duration length.
4. Have an exact start_time and end_time matching the spoken words.

You must score each clip based on:
- virality_score (1-100 overall score)
- hook_score (1-25)
- engagement_score (1-25)
- value_score (1-25)
- shareability_score (1-25)
- hook_type ("Shock", "Curiosity", "Question", "Controversy", "Story", "Punchline")
- mood: Exactly one of ["energetic", "dramatic", "funny", "motivational", "chill"] reflecting the emotional tone of the clip.
- bgm_description: Short 2-3 word label for matching background music (e.g. "Hype Synthwave", "Tense Drone", "Playful Bounce").
- sfx_cues: Array of sound effect placements relative to the clip start (0.0 to clip duration). Types allowed: ["whoosh", "pop", "boom", "ding"].
  Example: [{"type": "whoosh", "offset": 0.4}, {"type": "boom", "offset": 12.8}]

Respond with ONLY a raw JSON array of objects, with NO markdown formatting, no backticks, no markdown codeblocks."""

    prompt = f"""Video Title: {video_title}
Target Clip Duration: {dur_guidance}

Transcript with timestamps:
{transcript_summary}

Select the top 3 to 6 best viral clips.
Output JSON format:
[
  {{
    "title": "Short punchy title (max 6 words)",
    "hook_title": "All-caps engaging hook headline (e.g. HE ACTUALLY DID THIS?!)",
    "start_time": 45.2,
    "end_time": 88.5,
    "duration": 43.3,
    "virality_score": 96,
    "hook_score": 25,
    "engagement_score": 24,
    "value_score": 23,
    "shareability_score": 24,
    "hook_type": "Shock",
    "mood": "energetic",
    "bgm_description": "Hype Synth Beat",
    "sfx_cues": [
      {{"type": "whoosh", "offset": 0.5}},
      {{"type": "boom", "offset": 14.2}}
    ],
    "reasoning": "Clear explanation of why this clip will hook viewers and retain audience attention."
  }}
]"""

    if progress_callback:
        progress_callback(55.0, "AI evaluating virality, hook triggers, and retention...")

    # Query Gemini
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
        config={
            "system_instruction": system_instruction,
            "response_mime_type": "application/json",
            "temperature": 0.4
        }
    )

    content = response.text.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()

    clips = json.loads(content)
    return clips
