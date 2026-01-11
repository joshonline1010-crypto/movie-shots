# MOVIE SHOTS - AI Video Production System

Reference library of cinematic shots + scene builder for AI video generation.

---

## Quick Start (60 seconds)

```bash
# 1. Start the server
cd "C:\Users\yodes\Documents\Production-System\MOVIE SHOTS"
node tools/server.js

# 2. Open browser
http://localhost:3333/browser.html

# 3. Click "Scenes" tab to see scene timelines
```

---

## What's Here

| Folder | Contents |
|--------|----------|
| `directors/` | Screenshots organized by director |
| `scenes/` | Scene definitions + extracted frames |
| `tools/` | Server, scene-builder, organizer scripts |
| `docs/` | Workflow documentation |
| `index.json` | Searchable shot index |

---

## Key Files

| File | Purpose |
|------|---------|
| `browser.html` | Main UI - search shots, view scene timelines |
| `SCENE_SCHEMA.json` | Schema for scene JSON files |
| `tools/server.js` | HTTP server (port 3333) |
| `tools/scene-builder.js` | Converts scene to execution plan |
| `docs/FRAME_TO_SCENE_WORKFLOW.md` | How to extract & analyze frames |

---

## Create a New Scene from Video

### Step 1: Extract Frames
```bash
mkdir -p scenes/[scene_name]/frames
ffmpeg -i source_video.mp4 -vf "fps=1" scenes/[scene_name]/frames/frame_%03d.jpg
```

### Step 2: Analyze with Claude
Ask Claude to:
```
Analyze these frames in scenes/[scene_name]/frames/ and create a scene JSON.
For each shot provide: shot_id, frames, photo_prompt, motion_prompt, model, dialog.
Use multiple agents to analyze in parallel for speed.
```

### Step 3: Save Scene JSON
Save the combined output to `scenes/[scene_name].json`

### Step 4: View in Browser
Open browser, click Scenes tab, click your scene.

---

## Scene JSON Structure

```json
{
  "scene_id": "unique_id",
  "name": "Scene Title",
  "shots": [
    {
      "shot_id": "shot_001",
      "order": 1,
      "start_frame": "scenes/scene_id/frames/frame_001.jpg",
      "duration": 3,
      "model": "seedance-1.5",
      "dialog": "Spoken line...",
      "photo_prompt": "Full image description...",
      "motion_prompt": "Animation, then settles"
    }
  ]
}
```

---

## Model Selection Rules

| Use Case | Model | Why |
|----------|-------|-----|
| Character speaks | seedance-1.5 | Lip sync |
| Start to end frame | kling-o1 | Smooth transitions |
| Action/motion | kling-2.6 | Dynamic movement |

---

## API Endpoints (when server running)

| Endpoint | Returns |
|----------|---------|
| `GET /api/shots` | All indexed shots |
| `GET /api/search?q=term` | Search shots |
| `GET /api/scenes` | List all scenes |
| `GET /api/scene/:id` | Scene definition |
| `GET /api/scene/:id/build` | Execution plan |

---

## Current Scenes

| Scene | Shots | Duration |
|-------|-------|----------|
| `shaun_the_plan` | 69 | ~105s |

---

## Server Commands

```bash
# Start server (required for browser)
node tools/server.js

# Build execution plan only
node tools/scene-builder.js --scene scenes/my_scene.json --output plan.json

# Dry run (preview without executing)
node tools/scene-builder.js --scene scenes/my_scene.json --dry-run
```

---

## Git Commands

```bash
# Check status
git status

# Commit changes
git add -A
git commit -m "Description of changes"

# Push to GitHub
git push origin master
```

**Repo:** https://github.com/joshonline1010-crypto/movie-shots.git

---

## Full Documentation

See `docs/FRAME_TO_SCENE_WORKFLOW.md` for:
- Detailed frame extraction process
- Agent prompt templates
- Photo prompt structure
- Motion prompt rules
- Troubleshooting guide
