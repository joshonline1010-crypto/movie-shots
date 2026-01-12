# Movie Shots Production System

## Overview

A complete system for analyzing movie scenes, extracting shots, generating video assets, and managing the production pipeline. Works with any movie/scene.

---

## Quick Start

```bash
# 1. Start the server
cd "C:\Users\yodes\Documents\Production-System\MOVIE SHOTS\tools"
node server.js

# 2. Open browser
http://localhost:3333
```

---

## Folder Structure

```
MOVIE SHOTS/
├── browser.html              # Main UI - scene browser & timeline
├── tools/
│   ├── server.js             # API server (port 3333)
│   ├── whisper-transcribe.js # OpenAI Whisper transcription
│   ├── split-dialogue.js     # Split dialogue by word timing
│   ├── fix-models.js         # Model selection based on speaker visibility
│   ├── mark-chains.js        # Mark chained shots
│   └── update-dialogue.js    # Update shots with dialogue
├── scenes/
│   └── [scene_id]/
│       ├── [scene_id].json         # Main scene data
│       ├── [scene_id]_master.json  # Backup/master copy
│       ├── analysis_3fps/          # Extracted frames at 3fps
│       ├── whisper_transcript.json # Dialogue with timestamps
│       ├── SET_PROMPTS.md          # Empty set generation prompts
│       ├── character_prompts.txt   # Character reference prompts
│       └── source_audio.wav        # Extracted audio (optional)
└── docs/
    └── *.md                        # Documentation
```

---

## Creating a New Scene

### Step 1: Extract Frames

```bash
# Create scene folder
mkdir scenes/[scene_id]
mkdir scenes/[scene_id]/analysis_3fps

# Extract frames at 3fps (recommended for fast-cut editing)
ffmpeg -i source_video.mp4 -vf "fps=3" scenes/[scene_id]/analysis_3fps/frame_%04d.jpg

# For slow/dramatic scenes, use 1-2fps instead
ffmpeg -i source_video.mp4 -vf "fps=1" scenes/[scene_id]/analysis_3fps/frame_%04d.jpg
```

**Frame timing at 3fps:** Each frame = 0.333 seconds

### Step 2: Create Scene JSON

Create `scenes/[scene_id].json`:

```json
{
  "scene_id": "my_scene",
  "name": "Scene Name",
  "description": "Brief description",
  "extraction": {
    "fps": 3,
    "total_frames": 314,
    "total_duration_sec": 104.67,
    "frame_duration_sec": 0.333
  },
  "aspect_ratio": "2.35:1",
  "director": "Director Name",
  "year": 2024,

  "character_references": {
    "character_id": {
      "id": "character_id",
      "name": "Character Name",
      "costume": "Description of costume",
      "generate_prompt": "Professional character reference sheet..."
    }
  },

  "shots": [
    {
      "shot_id": "shot_001",
      "order": 1,
      "timing": {
        "start_frame": 1,
        "end_frame": 10,
        "duration_frames": 10,
        "actual_duration_sec": 3.33,
        "generation_duration_sec": 5,
        "cut_strategy": "trim_to_3.3s"
      },
      "camera": {
        "start_framing": "MCU",
        "end_framing": "MS",
        "movement": "zoom_out",
        "movement_speed": "slow"
      },
      "subject_primary": {
        "who": "character_id",
        "body_action": "Description of action",
        "facial_start": "expression",
        "facial_end": "expression"
      },
      "environment": {
        "location": "location_name",
        "visible_elements": ["element1", "element2"],
        "lighting": "lighting description"
      },
      "props": {
        "items": ["prop1", "prop2"],
        "interaction": "How character interacts with props"
      },
      "audio": {
        "dialog": "The spoken words",
        "speaker": "character_id"
      },
      "transition_in": "cut",
      "transition_out": "cut",
      "model": "kling-o1",
      "photo_prompt_start": "Detailed image prompt for start frame...",
      "photo_prompt_end": "Detailed image prompt for end frame...",
      "motion_prompt": "Camera and action description, then settles"
    }
  ]
}
```

### Step 3: Transcribe Dialogue (Optional)

```bash
# Download audio from YouTube
cd scenes/[scene_id]
yt-dlp -x --audio-format wav -o "source_audio.%(ext)s" "https://youtube.com/watch?v=VIDEO_ID"

# Transcribe with FAL Wizper
curl -X POST "https://fal.run/fal-ai/wizper" \
  -H "Authorization: Key YOUR_FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "UPLOADED_AUDIO_URL", "task": "transcribe", "chunk_level": "segment"}'
```

### Step 4: Run Processing Scripts

```bash
cd tools

# Split dialogue precisely across shots
node split-dialogue.js

# Fix model selection based on speaker visibility
node fix-models.js

# Mark chained shots
node mark-chains.js
```

### Step 5: Create Set Prompts

Create `scenes/[scene_id]/SET_PROMPTS.md`:

```markdown
# Empty Set Prompts - [Scene Name]

### 1. LOCATION NAME
```
Empty location description, specific details, lighting, aspect ratio, no people
```

### 2. ANOTHER LOCATION
```
Another empty location prompt...
```
```

---

## Model Selection Guide

| Condition | Model | Reason |
|-----------|-------|--------|
| Speaker ON SCREEN + static camera | **Seedance 1.5** | Lip sync needed |
| Speaker ON SCREEN + camera moving | **Kling O1** | Movement + some lip sync |
| Speaker OFF SCREEN (voiceover) | **Kling 2.6** | No lip sync needed |
| Camera zoom/push/pull + state change | **Kling O1** | Needs start + end frame |
| Action/motion, no dialogue | **Kling 2.6** | Standard video gen |
| Whip pan/transition | **Kling 2.6** | Motion blur |

---

## Prompt Templates

### Photo Prompt (Start Frame)
```
[FRAMING] of [SUBJECT DESCRIPTION] in [LOCATION], wearing [COSTUME],
[ACTION/POSE], [VISIBLE ELEMENTS], [LIGHTING], [ASPECT RATIO] cinematic
```

### Photo Prompt (End Frame) - For Kling O1
```
[END FRAMING] of [SUBJECT] in [LOCATION], [END POSE/POSITION],
[CHANGED ELEMENTS], [LIGHTING], [ASPECT RATIO] cinematic
```

### Motion Prompt (Video)
```
[CAMERA MOVEMENT] [DIRECTION], [SUBJECT ACTION], [SECONDARY ACTIONS],
[PROP INTERACTIONS], then [SETTLES/HOLDS]
```

### Speaking Motion (Seedance)
```
Character speaks expressively, mouth moving naturally, [GESTURES],
[BODY LANGUAGE], then settles
```

### Voiceover Motion (Kling)
```
[ACTION DESCRIPTION], no dialogue action needed, then settles
```

---

## Short Shot Strategies

| Actual Duration | Strategy |
|-----------------|----------|
| 0.3-1.0s | Generate 5s → ffmpeg cut to exact |
| 1.0-2.5s | Generate 5s → cut |
| 2.5-5.0s | Generate 5s → slight trim |
| 5.0-10.0s | Generate exact duration |
| 10.0s+ | Split into multiple shots |

### FFmpeg Commands

```bash
# Cut to exact duration
ffmpeg -i shot_raw.mp4 -t 2.0 -c copy shot_final.mp4

# Speed up (2x for half duration)
ffmpeg -i shot_raw.mp4 -filter:v "setpts=0.5*PTS" shot_fast.mp4

# Concatenate all shots
ffmpeg -f concat -safe 0 -i shots_list.txt -c copy scene_final.mp4
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/scenes` | List all scenes |
| `GET /api/scene/[id]` | Get scene JSON |
| `GET /api/scene/[id]/assets` | Get characters, sets, props with screenshots |
| `GET /api/scene/[id]/build` | Get execution plan with frame refs |
| `GET /api/scene/[id]/dialogue` | Get dialogue status |

---

## UI Features

### Tabs
- **Screenshots** - Extracted frames, click to enlarge
- **Characters** - Character refs with screenshots + generation prompts
- **Sets/Backgrounds** - Location prompts with screenshots
- **Props** - Props with screenshots (consolidated)
- **Dialogue** - Dialogue status, speakers, word counts

### Timeline View
- Frame thumbnails (START/END or CHAIN)
- Shot info with frame numbers
- Speaker status (🎤 ON CAM / 🔊 V/O)
- Model + reason
- Photo/Video prompts (click to copy)
- Asset tags (characters, location, props)
- Yellow chain indicator (⛓) for linked shots

---

## Chained Shots

Shots are **chained** when they use the last frame of the previous shot as reference. Indicated by yellow ⛓ icon.

**Chain criteria:**
- Same location + overlapping characters
- Same speaker continuing
- Adjacent frames (no gap)
- No breaking transition (whip_pan, wipe, dissolve)

---

## Cost Estimate

| Item | Cost | Time |
|------|------|------|
| Image (nano-banana) | $0.03 | ~18s |
| 4K Upscale | $0.05 | ~12s |
| Video (Kling 2.6, 5s) | $0.35 | ~45s |
| Video (Kling O1, 5s) | $0.35 | ~60s |
| Video (Seedance, 5s) | $0.35 | ~45s |
| Whisper (FAL) | ~$0.01/min | ~5s |

---

## Files Reference

| File | Purpose |
|------|---------|
| `server.js` | API server with all endpoints |
| `whisper-transcribe.js` | OpenAI Whisper transcription |
| `split-dialogue.js` | Split dialogue by word timing (~3.5 words/sec) |
| `fix-models.js` | Set model based on speaker ON/OFF screen |
| `mark-chains.js` | Mark shots that chain from previous |
| `update-dialogue.js` | Update shots with dialogue data |

---

## Workflow Summary

```
1. EXTRACT FRAMES
   ffmpeg → analysis_3fps/

2. CREATE SCENE JSON
   Define shots, characters, locations

3. TRANSCRIBE DIALOGUE
   yt-dlp → FAL Wizper → whisper_transcript.json

4. PROCESS DATA
   split-dialogue.js → fix-models.js → mark-chains.js

5. REVIEW IN UI
   http://localhost:3333

6. GENERATE ASSETS
   Character refs → Empty sets → Composite frames

7. GENERATE VIDEOS
   Seedance (lip sync) / Kling O1 (movement) / Kling 2.6 (action)

8. POST-PROCESS
   ffmpeg cut → concatenate → add audio
```

---

## Tips

1. **Always end motion prompts with "then settles" or "then holds"** - prevents infinite motion
2. **Generate 5s minimum** - cut in post, never generate exact short durations
3. **Use 2K resolution** - 4K just upscales and hits API limits
4. **Chain shots for continuity** - use last frame as start of next
5. **Speaker ON SCREEN = Seedance** - needs lip sync
6. **Speaker OFF SCREEN = Kling** - voiceover, no lip sync
