import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

# API Keys
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
ASSEMBLY_AI_API_KEY = os.getenv("ASSEMBLY_AI_API_KEY", "")

# Directory configurations
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
CLIPS_DIR = DATA_DIR / "clips"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CLIPS_DIR.mkdir(parents=True, exist_ok=True)

# LLM Model default
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
