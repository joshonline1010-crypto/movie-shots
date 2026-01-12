# Kling O1 Upgrade Candidates - Shaun of the Dead

## How Kling O1 Works
- Takes START image + END image
- Smoothly interpolates between them
- Perfect for: camera moves, expression changes, match cuts

## Whip-Pan Structure in Scene

Edgar Wright uses whip-pans as TRANSITIONS between scenes.
Pattern: [SHOT A] → [BLUR FRAME] → [SHOT B]

### Current Whip-Pan Shots (blur frames - keep as kling-2.6)
| Shot | Frame | Type | Notes |
|------|-------|------|-------|
| shot_004 | 6 | blur | Transition from flat |
| shot_007 | 9 | blur | Transition from car |
| shot_027 | 45-47 | blur | Car side blur |
| shot_050 | 77 | blur | Fast motion blur |
| shot_062 | 89 | blur | Back to flat |

### CONFIRMED O1 CANDIDATES (Reviewed 2026-01-12)

These shots have clear A→B transitions verified by frame review:

| Shot | Start Frame | End Frame | Motion | Why O1? | Status |
|------|-------------|-----------|--------|---------|--------|
| shot_003 | frame_004.jpg | frame_005.jpg | Shaun profile → front | Expression + camera move | ✅ UPDATED |
| shot_018 | frame_021.jpg | frame_022.jpg | Group on couch | Camera PUSH-IN | ✅ UPDATED |
| shot_069 | frame_104.jpg | frame_105.jpg | Ed & Shaun finale | HAS DIALOG - stay seedance | ⚠️ SKIPPED |

### POSSIBLE CANDIDATES (Need verification)

| Shot | Start Frame | End Frame | Motion | Why O1? |
|------|-------------|-----------|--------|---------|
| shot_008 | frame_010.jpg | frame_012.jpg | Mum opens door | Action completion |
| shot_015 | frame_018.jpg | frame_020.jpg | Door burst open | Motion blur → clear |
| shot_038 | frame_058.jpg | frame_060.jpg | Winchester exterior | Establishing → push |

### NOT Recommended for O1
- Dialog shots → Keep seedance-1.5 (lip sync)
- Blur/transition frames → Keep kling-2.6
- Pure action shots → Keep kling-2.6

## Implementation

For each candidate, add:
```json
{
  "model": "kling-o1",
  "end_frame": "scenes/shaun_the_plan/frames/frame_XXX.jpg"
}
```

## Cost Impact
- Kling O1 ~same cost as Kling 2.6
- Better results for controlled transitions
- 7 shots upgraded = smoother transitions
