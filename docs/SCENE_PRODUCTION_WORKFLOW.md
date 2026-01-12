# Scene Production Workflow - Automated Pipeline

This documents the complete workflow for turning any video clip into AI-generated shots.
Designed for automation on the production site.

---

## OVERVIEW

```
VIDEO → FRAMES → ANALYSIS → ASSETS → COMPOSITES → VIDEOS
```

**Total cost per scene:** ~$30-50 for 60-70 shots

---

## PHASE 1: FRAME EXTRACTION

### Input
- Source video file (MP4, MOV, etc.)
- Scene name

### Process
```bash
# Create folder structure
mkdir -p "scenes/[scene_name]/frames"
mkdir -p "scenes/[scene_name]/characters"
mkdir -p "scenes/[scene_name]/sets"
mkdir -p "scenes/[scene_name]/props"

# Extract frames at 1fps
ffmpeg -i "source_video.mp4" -vf "fps=1" "scenes/[scene_name]/frames/frame_%03d.jpg"
```

### Output
- `scenes/[scene_name]/frames/frame_001.jpg` ... `frame_XXX.jpg`

### Automation
```json
{
  "workflow": "frame-extractor",
  "inputs": {
    "video_url": "https://...",
    "scene_name": "my_scene",
    "fps": 1
  }
}
```

---

## PHASE 2: FRAME ANALYSIS

### Input
- Extracted frames
- Scene context (genre, style, director)

### Process
Use AI agents to analyze frames in parallel batches:

```
Agent 1: Frames 1-35
Agent 2: Frames 36-70
Agent 3: Frames 71-105
```

### Agent Prompt Template
```
Analyze these extracted frames and identify distinct shots.

For each shot provide:
1. shot_id: shot_001, shot_002, etc.
2. frames: Which frames (e.g., "1-3", "4", "5-8")
3. shot_type: wide/medium/closeup/extreme-closeup/insert
4. subject: Who/what is in frame
5. location: Where this takes place
6. dialog: Any spoken lines (if character talking)
7. photo_prompt: Complete description to GENERATE this image
8. motion_prompt: Animation description ending with "then settles"
9. model: seedance-1.5 (dialog), kling-o1 (transitions), kling-2.6 (action)

Look for: shot changes, whip pans, match cuts, inserts, camera moves
```

### Output
- Scene JSON with all shots defined
- Model assignments
- Photo and motion prompts

---

## PHASE 3: ASSET IDENTIFICATION

### Input
- Scene JSON

### Process
Extract unique assets automatically:

```python
# Pseudo-code for asset extraction
locations = set(shot['location'] for shot in scene['shots'])
characters = extract_characters_from_prompts(scene['shots'])
props = extract_props_from_prompts(scene['shots'])

# Identify variants needed
character_variants = identify_costume_changes(scene)
# Usually only 1-2 variants (e.g., zombie transformation)
```

### Output Files
- `SET_PROMPTS.md` - Empty background prompts
- `ASSETS_AND_VARIANTS.md` - Characters, props, vehicles

---

## PHASE 4: ASSET GENERATION

### Workflow: Generate Minimal Assets

**Characters (5-10 refs typical):**
```json
{
  "type": "image",
  "model": "nano-banana-pro",
  "prompt": "[CHARACTER] professional reference sheet, front and 3/4 profile, clean white background, studio lighting, 4K photorealistic",
  "aspect_ratio": "1:1"
}
```

**Empty Sets (10-20 typical):**
```json
{
  "type": "image",
  "model": "nano-banana-pro",
  "prompt": "[LOCATION DESCRIPTION], no people, 2.35:1 cinematic",
  "aspect_ratio": "21:9"
}
```

**Props (3-5 typical):**
```json
{
  "type": "image",
  "model": "nano-banana-pro",
  "prompt": "[PROP] isolated on white background, product photography",
  "aspect_ratio": "1:1"
}
```

### Cost
- ~$0.03 per asset
- 24 assets = $0.72

### Storyboard Grid Option
Generate 9 assets at once:
```json
{
  "workflow": "storyboard-grid",
  "inputs": {
    "prompts": ["asset1...", "asset2...", ...],
    "grid": "3x3"
  }
}
```

---

## PHASE 5: SHOT COMPOSITING

### Key Insight
**DON'T generate every shot from scratch!**

Use character refs + set refs + /edit to composite:

```json
{
  "type": "edit",
  "model": "nano-banana-pro",
  "image_urls": [
    "characters/ed_ref.png",
    "sets/flat_interior.png"
  ],
  "prompt": "THIS EXACT CHARACTER [action] in THIS EXACT LOCATION, [camera angle], 2.35:1 cinematic"
}
```

### Compositing Rules
1. Character ref goes FIRST in image_urls (highest priority)
2. Background/set goes SECOND
3. Use "THIS EXACT CHARACTER" and "THIS EXACT LOCATION" anchors
4. Add action/pose description
5. Include technical specs (aspect ratio, lighting)

### Cost
- ~$0.03 per composite
- Much faster than full generation

---

## PHASE 6: MODEL SELECTION

### Decision Tree
```
Does character SPEAK in this shot?
├── YES → SEEDANCE-1.5 (lip sync)
│         └── Has start→end state change?
│             ├── YES → Add end_image_url
│             └── NO → Single frame
│
└── NO → Is it a camera move/transition?
         ├── YES → KLING O1 (start + end frame)
         │         └── Add end_frame field
         └── NO → KLING 2.6 (action/motion)
```

### Kling O1 Candidates
Look for shots with:
- Camera push-in/pull-out
- Expression changes
- Camera orbit/dolly
- Match cuts between scenes
- State changes (door opens, etc.)

**NOT for O1:**
- Pure motion blur (whip pans)
- Dialog scenes (use seedance)
- General action (use 2.6)

---

## PHASE 7: PROMPT OPTIMIZATION

### Photo Prompt Structure
```
[Subject] + [Action/Pose] + [Location] + [Lighting] + [Camera] + [Technical]
```

**Example:**
```
Heavyset man with dark messy hair sitting on brown leather couch,
wearing beige t-shirt with orange text,
in messy British flat with teal walls,
soft diffused daylight from window,
medium shot composition,
2.35:1 aspect ratio, film grain, desaturated color grading
```

### Motion Prompt Rules (VIDEO)
1. **MOTION ONLY** - Don't describe the image
2. **ONE camera move** - Multiple = geometry warp
3. **ADD ENDPOINTS** - "then settles" or "then holds"
4. **Camera FIRST** for O1 shots

**Good:**
```
Slow push-in on face, character turns head, expression shifts, camera settles on closeup, then holds
```

**Bad:**
```
Man in t-shirt looks around (describes image, not motion)
```

---

## PHASE 8: VIDEO GENERATION

### Execution Order
```
1. Generate all start frames (composites)
2. For O1 shots: Generate end frames
3. Submit to video models in parallel batches
4. Poll for completion
5. Chain shots (last frame → next start frame)
```

### n8n Workflow
```json
{
  "workflow": "story-v4-parallel",
  "inputs": {
    "scene_id": "shaun_the_plan",
    "batch_size": 9,
    "auto_chain": true
  }
}
```

### Cost per shot
| Model | Cost | Time |
|-------|------|------|
| Seedance 1.5 | $0.35 | ~45s |
| Kling 2.6 | $0.35 | ~45s |
| Kling O1 | $0.35 | ~60s |

---

## PHASE 9: POST-PROCESSING

### Shot Chaining
Extract last frame for continuity:
```bash
ffmpeg -sseof -0.1 -i shot_001.mp4 -frames:v 1 shot_001_last.jpg
```

### Concatenation
```bash
# Create file list
for f in shot_*.mp4; do echo "file '$f'" >> list.txt; done

# Concat
ffmpeg -f concat -safe 0 -i list.txt -c copy scene_final.mp4
```

### Audio (Optional)
- ElevenLabs TTS for dialog
- Background music/SFX
- Subtitle burn-in

---

## AUTOMATION API SPEC

### Scene Creation Endpoint
```json
POST /api/scene/create
{
  "video_url": "https://...",
  "scene_name": "my_scene",
  "style": {
    "director": "Edgar Wright",
    "aspect_ratio": "2.35:1",
    "color_palette": "desaturated"
  }
}

Response: {
  "scene_id": "my_scene",
  "status": "processing",
  "estimated_time": "5 minutes"
}
```

### Asset Generation Endpoint
```json
POST /api/scene/{id}/generate-assets
{
  "types": ["characters", "sets", "props"],
  "format": "storyboard_grid"
}
```

### Video Generation Endpoint
```json
POST /api/scene/{id}/generate-videos
{
  "batch_size": 9,
  "models": "auto",
  "chain_shots": true
}
```

### Status Endpoint
```json
GET /api/scene/{id}/status

Response: {
  "phase": "video_generation",
  "progress": "45/69 shots",
  "estimated_remaining": "12 minutes",
  "cost_so_far": "$18.50"
}
```

---

## FOLDER STRUCTURE

```
scenes/
└── [scene_name]/
    ├── [scene_name].json      # Scene definition
    ├── frames/                 # Extracted source frames
    │   ├── frame_001.jpg
    │   └── ...
    ├── characters/             # Character reference sheets
    │   ├── character_ref.png
    │   └── ...
    ├── sets/                   # Empty background images
    │   ├── location_interior.png
    │   └── ...
    ├── props/                  # Isolated prop images
    │   └── ...
    ├── composites/             # Generated shot images
    │   ├── shot_001.jpg
    │   └── ...
    ├── videos/                 # Generated video clips
    │   ├── shot_001.mp4
    │   └── ...
    ├── SET_PROMPTS.md          # Set generation prompts
    ├── ASSETS_AND_VARIANTS.md  # Asset documentation
    └── KLING_O1_CANDIDATES.md  # O1 upgrade notes
```

---

## COST SUMMARY

| Phase | Items | Cost |
|-------|-------|------|
| Frame extraction | - | Free |
| Analysis | AI agents | ~$0.50 |
| Asset generation | 24 images | $0.72 |
| Shot composites | 69 images | $2.07 |
| Video generation | 69 videos | $24.15 |
| **TOTAL** | | **~$27.50** |

For a 2-minute scene with 69 shots!

---

## QUICK START CHECKLIST

- [ ] Extract frames from video (1fps)
- [ ] Analyze frames → create scene JSON
- [ ] Identify unique locations → SET_PROMPTS.md
- [ ] Identify characters/props → ASSETS_AND_VARIANTS.md
- [ ] Generate character refs (5-10)
- [ ] Generate empty sets (10-20)
- [ ] Identify O1 candidates → add end_frame
- [ ] Update motion prompts with camera moves
- [ ] Generate shot composites
- [ ] Submit to video models
- [ ] Chain and concatenate
- [ ] Add audio (optional)
