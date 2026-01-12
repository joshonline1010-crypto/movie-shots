# Video Analysis System - Detailed Shot Breakdown

## Overview

Capture EVERY detail: camera moves, body movements, prop interactions, timing, transitions.

---

## TOOLS (All Free or Already Paid)

### 1. Frame Extraction - FFmpeg (FREE)
```bash
# 3fps for fast editing (Edgar Wright style)
ffmpeg -i video.mp4 -vf "fps=3" frames/frame_%04d.jpg

# With timecode overlay (helps with timing)
ffmpeg -i video.mp4 -vf "fps=3,drawtext=text='%{pts\:hms}':fontsize=24:fontcolor=white:x=10:y=10" frames/frame_%04d.jpg
```

### 2. Video Analysis - Claude Vision (ALREADY PAID)
Send frame batches to Claude for detailed analysis.
No extra cost - part of existing Claude usage.

### 3. Audio Transcription - Whisper (FREE)
```bash
# Install
pip install openai-whisper

# Transcribe
whisper video.mp4 --model base --output_format json
```

### 4. Motion Detection - OpenCV (FREE)
```python
import cv2
import numpy as np

def detect_camera_motion(frame1, frame2):
    """Detect zoom, pan, tracking between frames"""
    gray1 = cv2.cvtColor(frame1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(frame2, cv2.COLOR_BGR2GRAY)

    # Optical flow
    flow = cv2.calcOpticalFlowFarneback(gray1, gray2, None, 0.5, 3, 15, 3, 5, 1.2, 0)

    # Analyze flow vectors
    mag, ang = cv2.cartToPolar(flow[..., 0], flow[..., 1])
    avg_mag = np.mean(mag)
    avg_ang = np.mean(ang)

    # Classify motion
    if avg_mag < 1:
        return "static"
    elif avg_mag > 10:
        return "whip_pan"
    else:
        # Check flow direction
        h, w = flow.shape[:2]
        center_flow = flow[h//3:2*h//3, w//3:2*w//3]

        # Zoom detection (flow radiates from/to center)
        # Pan detection (uniform horizontal flow)
        # Tracking detection (subject moves, background blurs)

        return analyze_motion_type(center_flow, flow)
```

### 5. FAL Video Understanding - CHEAP ($0.01/5sec)
```json
{
  "model": "fal-ai/video-understanding",
  "input": {
    "video_url": "https://...",
    "prompt": "Describe every camera movement, character action, and prop interaction in detail. Include: zoom direction, pan speed, body movements, facial expressions, what characters are holding and how they interact with props.",
    "detailed_analysis": true
  }
}
```

---

## ANALYSIS TEMPLATE

For EACH shot, capture:

```json
{
  "shot_id": "shot_001",

  "timing": {
    "start_timecode": "00:00:00.000",
    "end_timecode": "00:00:02.500",
    "duration_sec": 2.5
  },

  "framing": {
    "start_type": "extreme-close-up",
    "end_type": "medium-two-shot",
    "start_frame": "frame_0001.jpg",
    "end_frame": "frame_0008.jpg"
  },

  "camera": {
    "movement": "zoom-out",
    "direction": "pulling back",
    "speed": "medium",
    "style": "smooth"
  },

  "subject": {
    "who": ["Ed"],
    "body_position": "sitting on couch",
    "body_action": "spinning shovel in hands, rotating it vertically",
    "hand_action": "gripping shovel handle, rotating wrist",
    "head_action": "nodding while speaking",
    "facial_expression": "skeptical, eyebrow raised",
    "eye_direction": "looking at Shaun (off-screen right)"
  },

  "props": {
    "items": ["shovel"],
    "interaction": "holding vertically, spinning/rotating in hands",
    "state": "clean wooden handle, metal blade"
  },

  "secondary_subjects": [
    {
      "who": "Shaun",
      "visibility": "enters frame at end",
      "action": "standing, listening"
    }
  ],

  "audio": {
    "dialog": "We take Pete's car...",
    "speaker": "Ed",
    "sfx": null,
    "music": null
  },

  "lighting": {
    "type": "practical daylight",
    "direction": "window left",
    "mood": "flat, naturalistic"
  },

  "transition": {
    "type": "cut",
    "to_next": "match on action"
  },

  "prompts": {
    "photo_prompt": "Extreme close-up of heavyset man with dark messy hair and stubble, wearing dirty beige 'I GOT WOOD' t-shirt, spinning wooden-handled shovel in hands, skeptical expression with raised eyebrow, sitting on brown leather couch, teal walls behind, soft daylight from window left, shallow depth of field, 2.35:1 cinematic",

    "motion_prompt": "Slow zoom out revealing second person, man spins shovel in hands while speaking, head nods, expression shifts from skeptical to considering, camera pulls back to two-shot, then settles",

    "model": "kling-o1",
    "needs_end_frame": true
  }
}
```

---

## CLAUDE VISION ANALYSIS PROMPT

When I analyze frames, use this prompt:

```
Analyze these sequential frames from a film. For EACH distinct shot, provide:

## CAMERA
- Start framing (ECU/CU/MCU/MS/MWS/WS/EWS)
- End framing (if changes)
- Camera movement (zoom in/out, pan L/R, tilt up/down, dolly, tracking, static)
- Movement speed (slow/medium/fast/whip)

## SUBJECT PERFORMANCE
- Who is in frame
- Body position (sitting, standing, walking)
- Body ACTION (specific movements - spinning object, gesturing, leaning)
- Hand action (what are hands doing specifically)
- Facial expression
- Eye direction
- Head movement

## PROPS
- What objects are visible
- How are they being HELD
- How are they being USED/MANIPULATED
- Any state changes (clean → bloody, closed → open)

## TIMING
- Approximate duration
- Rhythm (held shot, quick cut, whip pan)

## TRANSITION
- How does it end (cut, whip pan, dissolve, match cut)
- What triggers the cut (action, dialog, beat)

Be EXTREMELY specific about movements. Don't say "holding shovel" - say "gripping shovel handle with both hands, rotating it clockwise while speaking"
```

---

## WORKFLOW: First 10 Seconds Deep Analysis

### Step 1: Extract at 3fps
```bash
ffmpeg -i shaun_the_plan.mp4 -t 10 -vf "fps=3" first_10sec/frame_%04d.jpg
```
Result: ~30 frames for 10 seconds

### Step 2: Extract Audio
```bash
ffmpeg -i shaun_the_plan.mp4 -t 10 -vn -acodec pcm_s16le first_10sec/audio.wav
whisper first_10sec/audio.wav --model base --output_format json
```

### Step 3: Batch Analyze with Claude Vision
Send frames 1-10, then 11-20, then 21-30
Use the detailed prompt above

### Step 4: Detect Camera Motion (Optional)
Run OpenCV optical flow between frame pairs
Auto-detect: static, zoom, pan, whip, tracking

### Step 5: Compile into Scene JSON
Merge all analysis into structured shot data

---

## N8N AUTOMATION WORKFLOW

```
[Video URL Input]
       ↓
[FFmpeg Extract 3fps] → frames/
       ↓
[Whisper Transcribe] → transcript.json
       ↓
[Batch Frames] → groups of 10
       ↓
[Claude Vision Analysis] → per-batch analysis
       ↓
[Merge & Structure] → scene.json
       ↓
[Generate Assets] → characters/, sets/
       ↓
[Composite Shots] → composites/
       ↓
[Generate Videos] → videos/
```

---

## COST BREAKDOWN (FREE/CHEAP)

| Tool | Cost |
|------|------|
| FFmpeg | FREE |
| Whisper | FREE |
| OpenCV | FREE |
| Claude Vision | Already paid (your subscription) |
| FAL Video Understanding | $0.01/5sec (optional, you have credits) |

**Total for detailed 10-second analysis: $0 - $0.02**

---

## QUICK START

```bash
# 1. Create analysis folder
mkdir -p scenes/shaun_the_plan/analysis

# 2. Extract first 10 seconds at 3fps
ffmpeg -i "source_video.mp4" -t 10 -vf "fps=3" "scenes/shaun_the_plan/analysis/frame_%04d.jpg"

# 3. Send frames to Claude for analysis
# (Use the detailed prompt template above)

# 4. Or use FAL for quick analysis
curl -X POST "https://fal.run/fal-ai/video-understanding" \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "VIDEO_URL_HERE",
    "prompt": "Describe every camera movement, body movement, and prop interaction in extreme detail...",
    "detailed_analysis": true
  }'
```

---

## SOURCES

- [FAL Video Understanding API](https://fal.ai/models/fal-ai/video-understanding/api)
- [video-analyzer GitHub](https://github.com/byjlw/video-analyzer) - Free with Llama Vision
- [OpenCV Optical Flow](https://docs.opencv.org/4.x/d4/dee/tutorial_optical_flow.html)
- [Whisper](https://github.com/openai/whisper) - Free speech recognition
