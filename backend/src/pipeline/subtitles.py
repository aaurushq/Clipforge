from typing import List, Dict, Any
from pathlib import Path

def format_ass_time(seconds: float) -> str:
    """Format seconds into ASS timestamp format: H:MM:SS.cs"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{hrs}:{mins:02d}:{secs:02d}.{cs:02d}"

def generate_ass_subtitles(
    words: List[Dict[str, Any]],
    clip_start: float,
    clip_end: float,
    output_path: Path,
    style_name: str = "bold_yellow"
) -> str:
    """
    Generates word-level animated ASS subtitles for 9:16 vertical video.
    Each phrase is 3-5 words, highlighting the current word as spoken in vivid yellow.
    """
    # Filter words inside the clip duration
    clip_words = [
        w for w in words
        if w["start"] >= (clip_start - 0.2) and w["end"] <= (clip_end + 0.5)
    ]

    # Re-normalize timestamps relative to clip start (0.0s)
    normalized_words = []
    for w in clip_words:
        n_start = max(0.0, w["start"] - clip_start)
        n_end = max(n_start + 0.1, w["end"] - clip_start)
        normalized_words.append({
            "text": w["text"].strip(),
            "start": n_start,
            "end": n_end
        })

    # Group into short punchy lines (3-4 words per subtitle card)
    word_groups = []
    chunk_size = 3
    for i in range(0, len(normalized_words), chunk_size):
        chunk = normalized_words[i:i + chunk_size]
        if chunk:
            word_groups.append(chunk)

    # Build ASS Content
    ass_header = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,72,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,6,3,2,60,60,340,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    dialogue_lines = []

    for group in word_groups:
        group_start = group[0]["start"]
        group_end = group[-1]["end"] + 0.15
        start_ts = format_ass_time(group_start)
        end_ts = format_ass_time(group_end)

        # For each word in the group, we can display the group with that word highlighted
        for idx, active_word in enumerate(group):
            w_start = format_ass_time(active_word["start"])
            # active word until next word start or group end
            if idx + 1 < len(group):
                w_end = format_ass_time(group[idx + 1]["start"])
            else:
                w_end = format_ass_time(active_word["end"] + 0.1)

            # Build line: active word is colored yellow &H0000FFFF&, other words are white &H00FFFFFF&
            line_parts = []
            for j, word_item in enumerate(group):
                word_text = word_item["text"].upper()
                if j == idx:
                    # Pop & Highlight
                    line_parts.append(f"{{\\c&H0022FFFF&\\fscx110\\fscy110}}{word_text}{{\\rDefault}}")
                else:
                    line_parts.append(word_text)

            text_content = " ".join(line_parts)
            dialogue_lines.append(f"Dialogue: 0,{w_start},{w_end},Default,,0,0,0,,{text_content}")

    full_ass = ass_header + "\n".join(dialogue_lines) + "\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_ass)

    return str(output_path)
