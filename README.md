# ClipForge ⚡

An independent, proprietary AI-powered video clipping platform built with Next.js, FastAPI, FFmpeg, yt-dlp, and Google Gemini AI.

## Key Features
- **SupoClip-Identical Sleek UI**: Minimalist, dark-mode focused, Apple/Linear-inspired user interface.
- **Multistage Animated Progress**: Real-time progress with iridescent metal-flow bar across 4 processing stages:
  1. `Fetching video`
  2. `Transcribing`
  3. `Finding moments`
  4. `Rendering clips`
- **AI Moment Detection**: Powered by Gemini 3 Flash / 2.5 Flash for detecting high-retention viral segments.
- **9:16 Vertical Video Reframing**: Automated vertical reframing with blurred ambient background or smart center crop.
- **Word-Level Animated Captions**: ASS subtitle engine with active word karaoke highlights.
- **Virality Scoring**: 0-100 Virality Score with Hook, Engagement, Value, and Shareability breakdowns.

## Quick Start
1. Double-click `start.bat` OR run:
```bash
# Terminal 1 (Backend)
cd backend
.venv\Scripts\python.exe -m uvicorn src.main:app --port 8000 --reload

# Terminal 2 (Frontend)
cd frontend
npm run dev
```
2. Open [http://localhost:3000](http://localhost:3000) in your browser.
