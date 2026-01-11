# Frame-to-Scene Workflow

Convert any video clip into a complete scene definition with AI-ready prompts.

---

## Overview

This workflow extracts frames from a video at 1fps, analyzes them to identify distinct shots, and generates:
- **Photo prompts**: Full descriptions to regenerate each shot as an AI image
- **Motion prompts**: Animation instructions for video generation
- **Model selection**: Automatic routing to seedance-1.5 (dialog), kling-o1 (transitions), or kling-2.6 (action)

---

## Step-by-Step Process

### 1. Extract Frames from Video

Use ffmpeg to extract frames at 1 frame per second:

```bash
# Create frames folder
mkdir -p "scenes/[scene_name]/frames"

# Extract frames at 1fps
ffmpeg -i "source_video.mp4" -vf "fps=1" "scenes/[scene_name]/frames/frame_%03d.jpg"
```

**Tips:**
- 1fps captures every cut in typical editing
- For fast-cut sequences (Edgar Wright style), use 2fps
- ~105 frames = ~105 second video

### 2. Analyze Frames with AI Agents

Launch multiple agents to analyze frame batches in parallel:

```
Agent 1: Analyze frames 1-35
Agent 2: Analyze frames 36-70
Agent 3: Analyze frames 71-105
```

**Agent Instructions:**
```
Analyze these extracted frames and identify distinct shots.
For each shot, provide:

1. shot_id: Unique identifier (shot_001, shot_002, etc.)
2. order: Sequence number
3. frames: Which frames belong to this shot (e.g., "1-3", "4", "5-8")
4. shot_type: wide/medium/closeup/extreme-closeup/insert
5. subject: Who/what is in frame
6. location: Where this shot takes place
7. dialog: Any spoken lines (if character is talking)
8. photo_prompt: Complete description to GENERATE this image from scratch
9. motion_prompt: Animation description ending with "then settles" or "then holds"
10. model: seedance-1.5 (if dialog), kling-2.6 (if action/motion)

CRITICAL: Look for:
- Shot changes (different framing/angle)
- Whip pans, match cuts, insert shots
- Character movements
- Dialog moments
```

### 3. Compile Scene JSON

Merge agent outputs into a single scene file:

```json
{
  "scene_id": "scene_name",
  "name": "Scene Title",
  "description": "What happens in this scene",
  "duration_estimate": 105,
  "location": "Primary location",
  "time_of_day": "day/night",
  "mood": "comedic/tense/dramatic",
  "color_palette": "desaturated-cool/warm/neutral",
  "aspect_ratio": "2.35:1",
  "director": "Director Name",

  "character_references": {
    "character_id": {
      "id": "character_id",
      "name": "Character Name",
      "description": "Physical description",
      "costume": "What they're wearing",
      "generate_prompt": "Full prompt to generate character reference sheet"
    }
  },

  "shots": [
    {
      "shot_id": "shot_001",
      "order": 1,
      "frames": "1-2",
      "shot_type": "medium",
      "subject": "Character",
      "location": "flat",
      "start_frame": "scenes/scene_name/frames/frame_001.jpg",
      "duration": 3,
      "model": "seedance-1.5",
      "dialog": "Line of dialog...",
      "photo_prompt": "Complete description...",
      "motion_prompt": "Character movement, then settles",
      "transition_out": "cut",
      "narrative_beat": "story_beat"
    }
  ]
}
```

### 4. View in Browser

1. Start the server:
```bash
cd "C:\Users\yodes\Documents\Production-System\MOVIE SHOTS"
node tools/server.js
```

2. Open browser: `http://localhost:3333/browser.html`

3. Click "Scenes" tab, then click your scene to view timeline

---

## Key Files

| File | Purpose |
|------|---------|
| `browser.html` | Main UI for browsing shots and scenes |
| `tools/server.js` | HTTP server for API endpoints |
| `tools/scene-builder.js` | Converts scene JSON to execution plan |
| `SCENE_SCHEMA.json` | Schema reference for scene files |
| `scenes/[name].json` | Scene definition files |
| `scenes/[name]/frames/` | Extracted frame images |

---

## Model Selection Rules

| Condition | Model | Reason |
|-----------|-------|--------|
| Character has dialog | seedance-1.5 | Lip sync capability |
| Start + end frame | kling-o1 | Smooth transitions |
| Action/motion | kling-2.6 | Dynamic movement |
| Default | kling-2.6 | General purpose |

---

## Photo Prompt Structure

Build prompts in this order:

```
[Subject description] + [Action/Pose] + [Location] + [Lighting] +
[Camera angle] + [Color grade] + [Technical specs]
```

**Example:**
```
Heavyset man with dark messy hair and stubble sitting on brown leather
couch in messy flat, wearing dirty beige t-shirt with faded graphic
print, looking skeptical, zombie body visible on floor behind him,
teal-green walls in background, desaturated cinematic color grading,
soft diffused daylight from window, medium shot composition, film grain,
2.35:1 aspect ratio
```

---

## Motion Prompt Rules

1. **MOTION ONLY** - Don't describe the image, just the movement
2. **ADD ENDPOINTS** - Always end with "then settles" or "then holds"
3. **ONE CAMERA MOVE** - Multiple moves cause geometry warping

**Good:**
```
Character shifts weight slightly, gestures with hands while speaking,
subtle breathing motion, then settles
```

**Bad:**
```
Man in t-shirt moves around (NO! Don't describe subject)
Hair blows in wind (NO! No endpoint)
```

---

## Browser UI Features

- **Frame Thumbnails**: 160x90 boxes showing start/end frames
- **Click-to-Copy**: Click prompts to copy to clipboard
- **Model Tags**: Color-coded model assignments
- **Dialog Display**: Shows character lines
- **Chain Indicators**: Shows when shots chain from previous

---

## Folder Structure

```
MOVIE SHOTS/
├── browser.html           # Main UI
├── SCENE_SCHEMA.json      # Schema reference
├── index.json             # Shot index
├── docs/
│   └── FRAME_TO_SCENE_WORKFLOW.md  # This file
├── scenes/
│   ├── shaun_the_plan.json         # Scene definition
│   └── shaun_the_plan/
│       └── frames/
│           ├── frame_001.jpg
│           ├── frame_002.jpg
│           └── ...
└── tools/
    ├── server.js          # HTTP server
    ├── scene-builder.js   # Execution plan builder
    └── organizer.js       # Shot organization
```

---

## Example: Shaun of the Dead "The Plan"

**Source:** 2-minute YouTube clip
**Frames Extracted:** 105 (1fps)
**Shots Identified:** 69
**Editing Style:** Edgar Wright (whip pans, match cuts, rapid inserts)

**Shot Breakdown:**
- 28 shots with seedance-1.5 (dialog)
- 41 shots with kling-2.6 (action/motion)

**Key Characters:**
- Shaun: Blonde, red tie, dark jacket, blood on cheek
- Ed: Heavyset, beige "I Got Wood" t-shirt, cricket bat
- Barbara: 60s, grey-brown hair, purple top
- Liz: Late 20s, blonde, blue track jacket
- Philip: 50s, zombie makeup, teal polo

---

## Quick Reference Commands

```bash
# Extract frames
ffmpeg -i video.mp4 -vf "fps=1" frames/frame_%03d.jpg

# Start server
node tools/server.js

# Build execution plan
node tools/scene-builder.js --scene scenes/my_scene.json --output plan.json

# View in browser
open http://localhost:3333/browser.html
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Frames not showing | Check path format (use forward slashes) |
| Scene not loading | Verify JSON syntax is valid |
| Wrong model selected | Check dialog field (triggers seedance) |
| Prompts too long | Keep under 200 words for best results |
