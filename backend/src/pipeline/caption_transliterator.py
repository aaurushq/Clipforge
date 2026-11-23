import os
import re
import json
from typing import List, Dict, Any
from google import genai
from src.config import GEMINI_API_KEY, GEMINI_MODEL

def has_devanagari(text: str) -> bool:
    """Checks if text contains Hindi Devanagari characters."""
    return bool(re.search(r'[\u0900-\u097F]', text))

def transliterate_to_hinglish_if_needed(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    If transcript contains Hindi / Devanagari or spoken Hindi, convert words to natural Roman Hinglish.
    If transcript is English, keep it as English.
    Preserves exact 1:1 timestamps.
    """
    if not words:
        return words

    full_text = " ".join(w["text"] for w in words[:100])
    
    # Check if Devanagari is present or if we should verify language
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or GEMINI_API_KEY
    if not api_key:
        return words

    try:
        client = genai.Client(api_key=api_key)

        prompt = f"""You are a professional subtitle linguist for viral social media clips (Shorts, Reels, TikTok).
Rule 1: If the input text is in Hindi (Devanagari or Romanized), convert it into modern, clean, popular HINGLISH in English alphabet / Roman script (e.g. "Bhai ye video dekh kar pagal ho jaoge", NEVER Devanagari "भाई").
Rule 2: If the input text is in ENGLISH, keep it EXACTLY AS ENGLISH with correct spelling.
Rule 3: Return a JSON array of words matching the input length exactly: [{len(words)} words].

Input words list:
{json.dumps([w["text"] for w in words])}

Output ONLY a JSON array of strings in the exact same order:
["word1", "word2", ...]"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "temperature": 0.2
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

        converted_words = json.loads(content)
        if isinstance(converted_words, list) and len(converted_words) == len(words):
            result = []
            for original, new_text in zip(words, converted_words):
                result.append({
                    **original,
                    "text": str(new_text).strip()
                })
            return result
        else:
            return words
    except Exception as e:
        print(f"Hinglish transliteration fallback: {e}")
        return words
