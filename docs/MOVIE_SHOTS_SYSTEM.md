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

## INT/EXT Auto-Detection

Each shot is automatically tagged as **INT** (interior) or **EXT** (exterior) based on location keywords.

**EXT Keywords:** street, exterior, driveway, garden, outside, outdoor, yard, parking, sidewalk, road, alley

**INT Keywords:** interior, inside, room, flat, apartment, house, pub, bar, kitchen, bedroom, bathroom, office, hall, corridor

| Location Example | Tag |
|------------------|-----|
| `flat` | INT |
| `suburban_street` | EXT |
| `mums_house_driveway` | EXT |
| `winchester_pub` | INT |
| `garden` | EXT |

---

## Character Screenshot Selection

The system auto-selects the BEST screenshot for each character based on:

| Priority | Score Bonus |
|----------|-------------|
| Close-up (CU, BCU, ECU) | +90-100 |
| Medium Close-up (MCU) | +80 |
| Medium Shot (MS) | +60 |
| Wide Shot (WS, EWS) | +10-20 |
| Primary Subject | +30 |
| Solo Shot (no other characters) | +20 |

**Example Scores:**
- CU + Primary + Solo = 90 + 30 + 20 = **140** (best)
- MS + Secondary = 60 + 0 = **60** (poor)

---

## Prop Filtering & Consolidation

Props are automatically filtered and consolidated in the UI.

**Excluded Props (body parts/set elements):**
- finger, thumb, hand, foot, shoe, feet
- door, window, wall, floor, ceiling
- table, chair, couch, sofa
- zombie, body

**Consolidated Groups:**
| Group | Individual Items |
|-------|------------------|
| `car` | car_door_handle, key, gas_pedal, steering_wheel, car_interior |
| `mug` | tea_mug, mug, COOL_mug |
| `pint_glass` | pint_glass, lager, beer |

---

## Nano Banana Pro Prompt Rules

**ORDER:** Subject → Action → Environment → Style → Camera → Lighting → Technical

```
BAD:  "Shot on ARRI, 85mm, cinematic, a man in a room"
GOOD: "A man standing in living room, golden sunlight from window, 85mm lens"
```

**Key Rules:**
1. Subject FIRST, Technical LAST
2. Lighting = SOURCE ("spotlight from above" not "cinematic lighting")
3. "THIS EXACT CHARACTER" - anchor phrase for character consistency
4. "maintain color grading" - for shot sequences
5. 2K is fastest (4K just upscales from 2K)

---

## Kling Video Prompt Rules

**VIDEO PROMPTS = MOTION ONLY** (image already has all visual info)

```
BAD:  "A chipmunk with green headphones in a forest..."
GOOD: "Character advances. Fire billows. Embers drift."
```

**MUST ADD MOTION ENDPOINTS:**
```
BAD:  "Hair moves in wind" → 99% hang
GOOD: "Hair moves in breeze, then settles back into place"
```

**Key Rules:**
1. ONE camera movement at a time (multiple = warped geometry)
2. Always end with "then settles" or "then holds"
3. Use POWER VERBS: WALKING, BILLOWING, CHARGING (not "moving", "going")

---

## Visual Style Definition (Scene-Level)

Each scene should have a `visual_style` block that applies to ALL prompts:

```json
{
  "visual_style": {
    "camera": "ARRI 435",
    "lens": "Panavision Primo anamorphic",
    "default_focal_length": "35mm",
    "color_grade": "desaturated, teal shadows, warm highlights",
    "lighting_style": "practical sources, overcast daylight exteriors",
    "film_stock_look": "Kodak Vision2 500T",
    "grain": "fine film grain",
    "contrast": "medium contrast, lifted blacks",
    "saturation": "reduced saturation, muted palette",
    "style_suffix": "2.35:1 anamorphic, film grain, desaturated color grade"
  },
  "camera_angles": {
    "CU": { "focal_length": "85mm", "distance": "close", "height": "eye-level" },
    "MCU": { "focal_length": "50mm", "distance": "medium-close", "height": "eye-level" },
    "MS": { "focal_length": "35mm", "distance": "medium", "height": "eye-level" },
    "WS": { "focal_length": "24mm", "distance": "wide", "height": "eye-level" },
    "LOW_ANGLE": { "height": "below-eye-level", "angle": "looking-up" },
    "HIGH_ANGLE": { "height": "above-eye-level", "angle": "looking-down" },
    "DUTCH": { "angle": "tilted-15deg" }
  }
}
```

---

## Prompt Templates

**ALL prompts must end with the scene's `style_suffix` for consistency!**

### Photo Prompt (Start Frame)
```
[FRAMING] of [SUBJECT] in [LOCATION], [ACTION/POSE],
[LENS]mm lens, [LIGHTING SOURCE], [STYLE_SUFFIX]
```

**Example:**
```
CU of man in beige t-shirt drinking from mug, content expression,
85mm lens, warm tungsten pub lighting from above,
2.35:1 anamorphic, film grain, desaturated color grade, Edgar Wright style
```

### Character Reference Prompt
```
Professional character reference sheet, front and 3/4 profile.
[AGE/GENDER/ETHNICITY], [PHYSICAL DESCRIPTION], [COSTUME DETAILS].
Clean white background, studio lighting, [STYLE_SUFFIX]
```

### Empty Set Prompt
```
Empty [LOCATION TYPE], [ARCHITECTURAL DETAILS], [FURNITURE/PROPS],
[LIGHTING SOURCE AND DIRECTION], [ATMOSPHERE],
[STYLE_SUFFIX], no people
```

### Prop Reference Prompt
```
[PROP NAME] isolated on neutral background, [MATERIAL/COLOR/CONDITION],
[SPECIFIC DETAILS], studio lighting, [STYLE_SUFFIX]
```

### Photo Prompt (End Frame) - For Kling O1
```
[END FRAMING] of [SUBJECT] in [LOCATION], [END POSE/POSITION],
[LENS]mm lens, [LIGHTING], maintain color grading, [STYLE_SUFFIX]
```

**TIP: Character/Prop References for END Frame**
- Only send character ref if character is NOT fully visible in START shot
- Only send prop ref if prop is NOT visible in START shot
- If visible in START → model infers appearance, no ref needed
- If entering frame or newly revealed → send ref

| START Frame | END Frame | Send Ref? |
|-------------|-----------|-----------|
| Character fully visible | Same character | ❌ No |
| Character back to camera | Character facing camera | ✅ Yes |
| Prop not in frame | Prop now visible | ✅ Yes |
| Prop visible | Same prop | ❌ No |

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
