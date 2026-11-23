import os
import wave
import math
import struct
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = BASE_DIR / "assets"
BGM_DIR = ASSETS_DIR / "bgm"
SFX_DIR = ASSETS_DIR / "sfx"

BGM_DIR.mkdir(parents=True, exist_ok=True)
SFX_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 44100

def save_wav_to_mp3(samples, wav_path, mp3_path):
    # Normalize samples to 16-bit PCM
    max_val = max(abs(s) for s in samples) if samples else 1.0
    if max_val == 0:
        max_val = 1.0
    
    scale = 32767.0 * 0.95 / max_val
    pcm_data = bytearray()
    for s in samples:
        val = int(s * scale)
        val = max(-32768, min(32767, val))
        pcm_data.extend(struct.pack('<h', val))
        pcm_data.extend(struct.pack('<h', val)) # stereo duplicate

    with wave.open(str(wav_path), 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_data)

    # Convert to MP3 using FFmpeg
    cmd = [
        "ffmpeg", "-y", "-i", str(wav_path),
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(mp3_path)
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    if wav_path.exists():
        wav_path.unlink()

# --- SFX GENERATORS ---

def generate_whoosh():
    """Airy frequency-swept whoosh transition sound."""
    duration = 0.5
    num_samples = int(SAMPLE_RATE * duration)
    samples = []
    import random
    random.seed(42)

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        progress = t / duration
        # Envelope: rise up, then fall quickly
        env = math.sin(progress * math.pi) ** 2
        # Swept noise filter emulation
        sweep_freq = 300 + 1500 * math.sin(progress * math.pi)
        noise = (random.random() * 2 - 1) * 0.4
        tone = math.sin(2 * math.pi * sweep_freq * t) * 0.6
        samples.append((noise + tone) * env)
    
    wav_path = SFX_DIR / "temp_whoosh.wav"
    mp3_path = SFX_DIR / "whoosh.mp3"
    save_wav_to_mp3(samples, wav_path, mp3_path)
    print("Generated whoosh.mp3")

def generate_pop():
    """Sharp, playful pop/click for text appearance."""
    duration = 0.15
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 35) # quick decay
        freq = 600 * math.exp(-t * 18) + 120 # pitch drops fast
        tone = math.sin(2 * math.pi * freq * t)
        samples.append(tone * env)

    wav_path = SFX_DIR / "temp_pop.wav"
    mp3_path = SFX_DIR / "pop.mp3"
    save_wav_to_mp3(samples, wav_path, mp3_path)
    print("Generated pop.mp3")

def generate_boom():
    """Deep 808 sub-bass impact for plot twists / shocking moments."""
    duration = 1.4
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.2)
        freq = 85.0 * math.exp(-t * 4.0) + 42.0 # drops from 127Hz to 42Hz
        tone = math.sin(2 * math.pi * freq * t)
        # soft saturation
        tone = math.tanh(tone * 1.5)
        samples.append(tone * env)

    wav_path = SFX_DIR / "temp_boom.wav"
    mp3_path = SFX_DIR / "boom.mp3"
    save_wav_to_mp3(samples, wav_path, mp3_path)
    print("Generated boom.mp3")

def generate_ding():
    """High clarity chime/ding for value insights or wins."""
    duration = 1.0
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 4.5)
        f1 = math.sin(2 * math.pi * 1760.0 * t) * 0.7
        f2 = math.sin(2 * math.pi * 3520.0 * t) * 0.3
        samples.append((f1 + f2) * env)

    wav_path = SFX_DIR / "temp_ding.wav"
    mp3_path = SFX_DIR / "ding.mp3"
    save_wav_to_mp3(samples, wav_path, mp3_path)
    print("Generated ding.mp3")

# --- BGM GENERATORS (15-second Seamless Loops) ---

def generate_bgm_track(name, bpm, chord_progression, style="synth"):
    """Generates a pleasant, rhythmic backing loop."""
    duration = 16.0 # 16 seconds loop
    num_samples = int(SAMPLE_RATE * duration)
    samples = [0.0] * num_samples
    beat_dur = 60.0 / bpm
    
    # Render chords
    chord_len = duration / len(chord_progression)
    for c_idx, chord_freqs in enumerate(chord_progression):
        start_t = c_idx * chord_len
        end_t = start_t + chord_len
        start_sample = int(start_t * SAMPLE_RATE)
        end_sample = min(num_samples, int(end_t * SAMPLE_RATE))
        
        for i in range(start_sample, end_sample):
            t = (i - start_sample) / SAMPLE_RATE
            env = min(t / 0.1, 1.0) * min((chord_len - t) / 0.1, 1.0) # smooth fade
            val = 0.0
            for f in chord_freqs:
                if style == "synth":
                    val += math.sin(2 * math.pi * f * (i / SAMPLE_RATE)) * 0.3
                    val += math.sin(2 * math.pi * f * 2 * (i / SAMPLE_RATE)) * 0.1
                elif style == "lofi":
                    val += math.sin(2 * math.pi * f * (i / SAMPLE_RATE)) * 0.4
                    val += math.sin(2 * math.pi * (f * 0.5) * (i / SAMPLE_RATE)) * 0.2
                else: # dramatic
                    val += math.sin(2 * math.pi * f * (i / SAMPLE_RATE)) * 0.4
                    # tremolo
                    val *= (1.0 + 0.3 * math.sin(2 * math.pi * 4.0 * (i / SAMPLE_RATE)))
            samples[i] += val * env * 0.35

    # Add rhythmic kick / pulse
    num_beats = int(duration / beat_dur)
    for b in range(num_beats):
        beat_time = b * beat_dur
        beat_sample = int(beat_time * SAMPLE_RATE)
        # Pulse kick
        kick_samples = int(SAMPLE_RATE * 0.2)
        for k in range(kick_samples):
            idx = beat_sample + k
            if idx < num_samples:
                kt = k / SAMPLE_RATE
                kenv = math.exp(-kt * 22)
                kfreq = 110.0 * math.exp(-kt * 30) + 45.0
                samples[idx] += math.sin(2 * math.pi * kfreq * kt) * kenv * 0.45

    wav_path = BGM_DIR / f"temp_{name}.wav"
    mp3_path = BGM_DIR / f"{name}.mp3"
    save_wav_to_mp3(samples, wav_path, mp3_path)
    print(f"Generated {name}.mp3")

def main():
    print("Generating SFX library...")
    generate_whoosh()
    generate_pop()
    generate_boom()
    generate_ding()

    print("\nGenerating BGM Mood Library...")
    # 1. Energetic / Hype (Am - F - C - G, 124 BPM)
    generate_bgm_track("energetic", 124, [
        [220, 261, 329], # Am
        [174, 220, 261], # F
        [130, 164, 196], # C
        [196, 246, 293]  # G
    ], style="synth")

    # 2. Dramatic / Suspense (Dm - Bb - Gm - A, 90 BPM)
    generate_bgm_track("dramatic", 90, [
        [146, 174, 220], # Dm
        [116, 146, 174], # Bb
        [98, 116, 146],  # Gm
        [110, 138, 164]  # A
    ], style="dramatic")

    # 3. Funny / Playful (C - G - Am - F, 115 BPM)
    generate_bgm_track("funny", 115, [
        [261, 329, 392], # C
        [196, 246, 293], # G
        [220, 261, 329], # Am
        [174, 220, 261]  # F
    ], style="synth")

    # 4. Motivational (D - A - Bm - G, 108 BPM)
    generate_bgm_track("motivational", 108, [
        [146, 185, 220], # D
        [110, 138, 164], # A
        [123, 146, 185], # Bm
        [98, 123, 146]   # G
    ], style="synth")

    # 5. Chill / Lofi (Cmaj7 - Am7 - Dm7 - G7, 85 BPM)
    generate_bgm_track("chill", 85, [
        [130, 164, 196, 246], # Cmaj7
        [110, 130, 164, 196], # Am7
        [146, 174, 220, 261], # Dm7
        [98, 123, 146, 174]   # G7
    ], style="lofi")

    print("\nAll SFX and BGM audio assets generated successfully!")

if __name__ == "__main__":
    main()
