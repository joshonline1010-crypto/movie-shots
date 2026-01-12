# Detailed Shot Analysis System

## Overview
Capture EVERY detail from video: camera moves, body movements, prop interactions, timing, transitions.
Handle short shots (under 5s minimum) with smart strategies.

---

## EXTRACTION SETTINGS

```bash
# For fast-cut editing (Edgar Wright, action):
ffmpeg -i video.mp4 -vf "fps=3" frames/frame_%04d.jpg

# For standard editing:
ffmpeg -i video.mp4 -vf "fps=2" frames/frame_%04d.jpg

# For slow/dramatic (Kubrick, Villeneuve):
ffmpeg -i video.mp4 -vf "fps=1" frames/frame_%04d.jpg
```

**Frame timing at 3fps:** Each frame = 0.333 seconds

---

## ANALYSIS TEMPLATE

For EACH shot, capture:

```json
{
  "shot_id": "shot_001",

  "timing": {
    "start_frame": 1,
    "end_frame": 6,
    "duration_frames": 6,
    "duration_sec": 2.0,
    "generation_strategy": "generate_5s_cut_to_2s"
  },

  "camera": {
    "start_framing": "MCU",
    "end_framing": "wide-two-shot",
    "movement": "zoom-out",
    "movement_speed": "medium",
    "movement_direction": "pulling back"
  },

  "subject_primary": {
    "who": "Ed",
    "body_position_start": "sitting, leaning forward",
    "body_position_end": "sitting upright",
    "body_action": "raises cricket bat while explaining",
    "hand_action": "gripping bat handle, lifting up, spinning",
    "head_action": "nodding, looking at Shaun",
    "facial_start": "contemplating",
    "facial_end": "animated, explaining"
  },

  "subject_secondary": {
    "who": "Shaun",
    "visibility": "enters frame at end (right edge)",
    "action": "standing, back visible"
  },

  "props": {
    "items": ["cricket bat"],
    "interaction": "Ed grips bat, raises it up, spins it in hands",
    "state_change": "bat enters frame → raised overhead"
  },

  "environment": {
    "location": "flat",
    "visible_elements": ["leather couch", "zombie body", "pizza boxes", "teal walls", "chairs"],
    "lighting": "soft daylight from window left"
  },

  "audio": {
    "dialog": "We take Pete's car, go round mum's...",
    "speaker": "Ed",
    "sfx": null
  },

  "transition_in": "cut",
  "transition_out": "cut",

  "prompts": {
    "photo_prompt_start": "MCU of heavyset man with dark messy hair sitting on brown leather couch in messy British flat, wearing dirty beige 'I GOT WOOD' t-shirt, looking down contemplating, zombie body in green jacket on floor behind, teal walls, soft daylight from window, 2.35:1 cinematic",

    "photo_prompt_end": "Wide two-shot in messy British flat, heavyset man on couch holding cricket bat up explaining, second man visible on right edge standing, zombie on floor, teal walls, chairs and table in background, 2.35:1 cinematic",

    "motion_prompt": "Slow zoom out pulling back, man raises cricket bat while speaking gesturing enthusiastically, spins bat in hands, second person revealed on right, camera settles on two-shot, then holds",

    "model": "kling-o1",
    "needs_end_frame": true
  }
}
```

---

## SHORT SHOT STRATEGIES

### Video Generation Limits
- **Minimum duration:** 5 seconds
- **Maximum duration:** 10 seconds
- **Models:** Kling 2.6, Kling O1, Seedance 1.5

### Strategy Matrix

| Actual Duration | Strategy | How |
|-----------------|----------|-----|
| 0.3-1.0s | Generate 5s → hard cut | Use ffmpeg to cut first X seconds |
| 1.0-2.5s | Generate 5s → cut | Cut to exact length |
| 2.5-5.0s | Generate 5s → slight trim | Minor trim if needed |
| 5.0-10.0s | Generate exact | Direct generation |
| 10.0s+ | Split into parts | Two generations, stitch |

### FFmpeg Cut Commands
```bash
# Cut first 2 seconds from 5-second video
ffmpeg -i shot_001.mp4 -t 2 -c copy shot_001_cut.mp4

# Cut with speed adjustment (2x speed)
ffmpeg -i shot_001.mp4 -filter:v "setpts=0.5*PTS" -filter:a "atempo=2.0" shot_001_fast.mp4

# Cut specific section (start at 1s, duration 1.5s)
ffmpeg -i shot_001.mp4 -ss 1 -t 1.5 -c copy shot_001_section.mp4
```

### Transition Shots (Whip Pans)
- Generate as **static blur frame** → animate with simple motion
- Or generate 5s blur → cut to 0.5s
- Model: **kling-2.6** (motion blur works well)

### Insert Shots (Quick cuts)
- Generate 5s → cut to under 1s
- Use **first frame only** if static insert
- Or add subtle motion "slight zoom in, then holds"

---

## SHOT TYPE CLASSIFICATIONS

### By Camera Movement
| Type | Description | Model | Duration Strategy |
|------|-------------|-------|-------------------|
| STATIC | No camera move | kling-2.6 | Generate exact or cut |
| PUSH-IN | Zoom into subject | kling-o1 | Need start+end frame |
| PULL-OUT | Zoom out from subject | kling-o1 | Need start+end frame |
| PAN | Horizontal sweep | kling-2.6 | Generate, may cut |
| TRACKING | Camera follows subject | kling-2.6 | Generate full |
| WHIP PAN | Fast blur transition | kling-2.6 | Generate 5s, cut to 0.5s |

### By Content Type
| Type | Description | Model | Notes |
|------|-------------|-------|-------|
| DIALOG | Character speaking | seedance-1.5 | Lip sync |
| ACTION | Movement/fighting | kling-2.6 | Dynamic motion |
| INSERT | Quick detail shot | kling-2.6 | Cut very short |
| REACTION | Character response | kling-o1 | Expression change |
| TRANSITION | Scene change | kling-2.6 | Blur/whip |
| ESTABLISHING | Location reveal | kling-2.6 | Wide shot |

---

## EDGAR WRIGHT SPECIFIC PATTERNS

### Rapid-Fire Sequence
Pattern: [SHOT] → [WHIP] → [INSERT] → [WHIP] → [INSERT] → [WIDE]

```
Example from Shaun:
CU Shaun thinking (2s)
→ WHIP PAN blur (0.5s)
→ Car door ECU (0.7s)
→ Foot on pedal ECU (0.3s)
→ Wide car + zombies (1s)
→ Tracking shot (2s)
```

**Generation Strategy:**
1. Generate each shot at 5s minimum
2. Cut to exact timing in post
3. Concat with ffmpeg

### Zoom + Turn Combo
Pattern: Camera pushes in WHILE subject turns toward camera

```json
{
  "camera": {
    "movement": "push-in",
    "speed": "medium"
  },
  "subject": {
    "body_action": "turns from profile to 3/4 front",
    "expression_arc": "thinking → realization"
  },
  "model": "kling-o1",
  "needs_end_frame": true
}
```

### Prop Spin/Manipulation
Track specific hand/prop movements:

```json
{
  "props": {
    "items": ["cricket bat"],
    "interaction": "grips handle with both hands, rotates clockwise, raises overhead"
  },
  "motion_prompt": "Character spins cricket bat in hands while speaking, rotates it clockwise, raises up to show, then settles"
}
```

---

## FULL SCENE WORKFLOW

### Phase 1: Frame Extraction
```bash
mkdir -p scenes/[scene]/analysis_3fps
ffmpeg -i source.mp4 -vf "fps=3" scenes/[scene]/analysis_3fps/frame_%04d.jpg
```

### Phase 2: Shot Boundary Detection
Analyze frames for:
- Cut points (scene changes)
- Camera move starts/ends
- Action beats

### Phase 3: Detailed Analysis
For each shot:
1. Identify start/end frames
2. Calculate duration
3. Describe camera movement
4. Describe subject actions (body, hands, face)
5. Note props and interactions
6. Write photo prompts (start + end if O1)
7. Write motion prompt
8. Assign model
9. Determine generation strategy

### Phase 4: Asset Generation
1. Generate character refs
2. Generate empty sets
3. Composite key frames

### Phase 5: Video Generation
1. Generate all shots at 5-10s
2. Apply duration cuts
3. Speed adjust if needed
4. Concat final sequence

---

## POST-PROCESSING PIPELINE

```bash
# 1. Cut each shot to exact duration
for shot in shot_*.mp4; do
  # Read target duration from manifest
  ffmpeg -i "$shot" -t $DURATION -c copy "${shot%.mp4}_cut.mp4"
done

# 2. Create concat list
ls shot_*_cut.mp4 | sed "s/^/file '/" | sed "s/$/'/" > concat_list.txt

# 3. Concatenate all shots
ffmpeg -f concat -safe 0 -i concat_list.txt -c copy scene_final.mp4

# 4. Add audio track
ffmpeg -i scene_final.mp4 -i audio.wav -c:v copy -c:a aac output_with_audio.mp4
```

---

## MANIFEST FORMAT

```json
{
  "scene_id": "shaun_the_plan",
  "total_duration_sec": 104.7,
  "total_shots": 69,
  "extraction_fps": 3,

  "shots": [
    {
      "shot_id": "shot_001",
      "start_frame": 1,
      "end_frame": 6,
      "target_duration_sec": 2.0,
      "generation_duration_sec": 5,
      "cut_strategy": "trim_to_2s",
      "model": "kling-o1",
      "has_dialog": false,
      "camera_move": "zoom-out",
      "photo_prompt_start": "...",
      "photo_prompt_end": "...",
      "motion_prompt": "...",
      "status": "pending"
    }
  ]
}
```

---

## COST ESTIMATE

| Item | Count | Unit Cost | Total |
|------|-------|-----------|-------|
| Frame extraction | 1 | Free | $0 |
| Shot analysis | 69 | Free (Claude) | $0 |
| Character refs | 5 | $0.03 | $0.15 |
| Empty sets | 14 | $0.03 | $0.42 |
| Video generation | 69 | $0.35 | $24.15 |
| **TOTAL** | | | **~$25** |

---

## QUICK REFERENCE

### Frame to Time (3fps)
- 1 frame = 0.333s
- 3 frames = 1s
- 6 frames = 2s
- 15 frames = 5s
- 30 frames = 10s

### Model Selection Quick Guide
- **Dialog?** → seedance-1.5
- **Camera move with state change?** → kling-o1
- **Everything else** → kling-2.6

### Motion Prompt Endings
- Static: "then holds"
- Movement: "then settles"
- Action: "then stops"
