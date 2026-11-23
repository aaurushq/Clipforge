import os
import time
import requests
from typing import Dict, Any, List, Optional
from src.config import ASSEMBLY_AI_API_KEY, GEMINI_API_KEY, GEMINI_MODEL

def transcribe_with_assemblyai(audio_path: str, progress_callback: Optional[Any] = None) -> Dict[str, Any]:
    """Transcribe audio using AssemblyAI API with word-level timestamps."""
    if not ASSEMBLY_AI_API_KEY:
        raise ValueError("ASSEMBLY_AI_API_KEY not configured.")

    if progress_callback:
        progress_callback(25.0, "Uploading audio to transcription service...")

    headers = {"authorization": ASSEMBLY_AI_API_KEY}
    
    # 1. Upload audio file
    with open(audio_path, "rb") as f:
        upload_resp = requests.post(
            "https://api.assemblyai.com/v2/upload",
            headers=headers,
            data=f
        )
    upload_resp.raise_for_status()
    upload_url = upload_resp.json()["upload_url"]

    # 2. Submit transcription job
    if progress_callback:
        progress_callback(30.0, "Transcribing speech and extracting timestamps...")

    transcript_req = {
        "audio_url": upload_url,
        "auto_chapters": False,
        "punctuate": True,
        "format_text": True,
        "dual_channel": False,
    }
    
    submit_resp = requests.post(
        "https://api.assemblyai.com/v2/transcript",
        headers=headers,
        json=transcript_req
    )
    submit_resp.raise_for_status()
    transcript_id = submit_resp.json()["id"]

    # 3. Poll for completion
    polling_endpoint = f"https://api.assemblyai.com/v2/transcript/{transcript_id}"
    while True:
        poll_resp = requests.get(polling_endpoint, headers=headers)
        poll_resp.raise_for_status()
        result = poll_resp.json()
        status = result.get("status")

        if status == "completed":
            words = []
            for w in result.get("words", []):
                words.append({
                    "text": w["text"],
                    "start": w["start"] / 1000.0, # convert ms to seconds
                    "end": w["end"] / 1000.0,
                    "confidence": w.get("confidence", 1.0)
                })
            
            return {
                "text": result.get("text", ""),
                "words": words,
                "confidence": result.get("confidence", 1.0)
            }
        elif status == "error":
            raise RuntimeError(f"AssemblyAI transcription error: {result.get('error')}")

        if progress_callback:
            progress_callback(35.0, "Analyzing audio speech patterns...")
        time.sleep(3)

def transcribe_audio(audio_path: str, progress_callback: Optional[Any] = None) -> Dict[str, Any]:
    """Main transcription entry point."""
    if ASSEMBLY_AI_API_KEY:
        try:
            return transcribe_with_assemblyai(audio_path, progress_callback)
        except Exception as e:
            print(f"AssemblyAI failed: {e}")
            raise e
    else:
        raise ValueError("No transcription API key provided. Please set ASSEMBLY_AI_API_KEY in backend/.env")
