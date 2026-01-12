# Shot Timing Manifest - Shaun of the Dead "The Plan"

Generated from 3fps frame analysis (314 frames = ~105 seconds)

---

## SUMMARY

| Metric | Value |
|--------|-------|
| Total Frames | 314 |
| Total Duration | 104.67 seconds |
| Total Shots | ~75 shots |
| Average Shot Duration | 1.4 seconds |
| Shortest Shot | 0.33s (1 frame) |
| Longest Shot | 6.0s |

---

## SHOT TIMING STRATEGIES

### UNDER 1 SECOND (Need Generation Strategy)

| Shot | Frames | Duration | Type | Strategy |
|------|--------|----------|------|----------|
| Whip pans | 1-2 frames | 0.33-0.67s | Transition | Generate blur → cut to 0.5s |
| Doorbell insert | 2-3 frames | 0.67-1.0s | ECU insert | Generate 5s → cut to 0.7s |
| Car door insert | 2 frames | 0.67s | ECU insert | Generate 5s → cut to 0.7s |
| Foot on pedal | 1 frame | 0.33s | ECU insert | Generate 5s → cut to 0.3s |
| Mug inserts | 2-3 frames | 0.67-1.0s | ECU prop | Generate 5s → cut |
| Beer glass insert | 2-3 frames | 0.67-1.0s | ECU prop | Generate 5s → cut |

### 1-2 SECONDS (Generate 5s, Cut)

| Shot Type | Typical Duration | Strategy |
|-----------|------------------|----------|
| Reaction shots | 1.0-1.67s | Generate 5s → cut to exact |
| Quick dialog | 1.33-2.0s | Generate 5s → cut |
| Action beats | 1.0-1.33s | Generate 5s → cut |
| Running shots | 1.0-1.67s | Generate 5s → cut |

### 2-5 SECONDS (Generate Near Duration)

| Shot Type | Typical Duration | Strategy |
|-----------|------------------|----------|
| Dialog exchanges | 2.0-4.0s | Generate 5s → trim if needed |
| Ed explaining | 3.33-5.0s | Generate 5s |
| Shaun explaining | 2.33-4.0s | Generate 5s |
| Group shots | 2.0-2.67s | Generate 5s → trim |

### 5+ SECONDS (Generate Full)

| Shot Type | Duration | Strategy |
|-----------|----------|----------|
| TV news broadcast | 6.0s | Generate 6s or 10s |
| Extended dialog | 5.0s | Generate 5s exact |

---

## KEY SHOT DETAILS (First 10 Seconds)

### Shot 1: Ed with Cricket Bat
- **Frames:** 1-10 (3.33s actual)
- **Camera:** MCU → zoom out → MS two-shot
- **Action:** Ed sitting, SPINS cricket bat in hands, raises it, explains plan
- **Props:** Cricket bat - gripped, spun, raised overhead
- **Secondary:** Shaun enters frame right at end
- **Strategy:** Generate 5s → cut to 3.3s
- **Model:** kling-o1 (zoom + state change)

### Shot 2: Shaun Thinking
- **Frames:** 11-16 (2.0s actual)
- **Camera:** MS → push-in → MCU
- **Action:** Shaun standing, hand on chin thinking, TURNS toward camera
- **Expression:** Pensive → processing → contemplative
- **Strategy:** Generate 5s → cut to 2s
- **Model:** kling-o1 (push-in + turn)

### Shot 3: Whip Pan Transition
- **Frames:** 17-18 (0.67s actual)
- **Camera:** Motion blur (whip pan)
- **Strategy:** Generate blur frame → 0.5s video OR static blur cut
- **Model:** kling-2.6

### Shot 4: Car Door Handle Insert
- **Frames:** 19-20 (0.67s actual)
- **Camera:** ECU static
- **Subject:** Red Jaguar door handle + keyhole
- **Strategy:** Generate 5s → cut to 0.7s
- **Model:** kling-2.6

### Shot 5: Foot on Pedal Insert
- **Frames:** 21 (0.33s actual)
- **Camera:** ECU static
- **Subject:** Shoe/boot pressing gas pedal
- **Strategy:** Generate 5s → cut to 0.3s
- **Model:** kling-2.6

### Shot 6: Car + Zombies Wide
- **Frames:** 22-24 (1.0s actual)
- **Camera:** WS → slight zoom
- **Subject:** Red car, TWO ZOMBIES behind in plaid shirts
- **Strategy:** Generate 5s → cut to 1s
- **Model:** kling-2.6

### Shot 7: Tracking Shot Blur
- **Frames:** 25-27 (1.0s actual)
- **Camera:** Whip pan → tracking
- **Action:** Car accelerating, motion blur on wheels
- **Strategy:** Generate 5s → cut to 1s
- **Model:** kling-2.6

### Shot 8: Car Driving Away (Rear)
- **Frames:** 28-30 (1.0s actual)
- **Camera:** MS rear → WS rear tracking
- **Props:** Red Megane, license plate T108 JVM
- **Strategy:** Generate 5s → cut to 1s
- **Model:** kling-2.6

---

## PROP INTERACTIONS FOUND

| Character | Prop | Interaction Type | Shots |
|-----------|------|------------------|-------|
| Ed | Cricket bat | Grip, spin, raise, swing | 15+ |
| Ed | Garden spade | Swing, hold up, examine | 8+ |
| Shaun | Cricket bat | Grip, hold, demonstrate | 10+ |
| Shaun | Pint glass | Hold, raise, drink | 5+ |
| Shaun | "COOL" mug | Hold, drink | 3+ |
| Shaun | Steering wheel | Grip while driving | 4+ |
| Everyone | Tea mugs | Hold, toast, drink | 8+ |
| Finger | Doorbell | Press | 3+ |

---

## WHIP PAN TRANSITIONS

| Location | Frames | From → To |
|----------|--------|-----------|
| Frame 17-18 | 0.67s | Shaun thinking → Car door |
| Frame 25-27 | 1.0s | Car → Car tracking |
| Frame 45-46 | 0.67s | Mum's house → Running |
| Frame 69 | 0.33s | Tea scene → Ed reaction |
| Frame 133-137 | 1.67s | Interior → Car exterior |
| Frame 154 | 0.33s | Zombie → Running |
| Frame 165 | 0.33s | Running → Mug insert |
| Frame 175 | 0.33s | Group → Ed reaction |
| Frame 230-233 | 1.33s | Shaun → Car |
| Frame 246 | 0.33s | Running → Pub sign |
| Frame 265-266 | 0.67s | Pub → Living room |

---

## POST-PROCESSING COMMANDS

```bash
# Cut shot to exact duration (example: 3.3 seconds)
ffmpeg -i shot_001_raw.mp4 -t 3.3 -c copy shot_001.mp4

# Speed up 2x for 0.5s shot (generate 1s, speed to 0.5s)
ffmpeg -i shot_003_raw.mp4 -filter:v "setpts=0.5*PTS" shot_003.mp4

# Create whip pan blur (generate single blur frame, duplicate)
ffmpeg -loop 1 -i blur_frame.jpg -t 0.5 -c:v libx264 whip_pan.mp4

# Concat all shots
ffmpeg -f concat -safe 0 -i shots_list.txt -c copy final_scene.mp4
```

---

## GENERATION QUEUE

### Priority 1: Dialog Shots (Seedance)
28 shots with character speaking

### Priority 2: Action/Motion (Kling 2.6)
35 shots with action/movement

### Priority 3: Transitions (Kling O1)
12 shots with camera moves + state changes

---

## COST ESTIMATE (Revised)

| Category | Count | Duration Strategy | Cost |
|----------|-------|-------------------|------|
| Dialog shots | 28 | 5s each | $9.80 |
| Action shots | 35 | 5s each | $12.25 |
| O1 transitions | 12 | 5s each | $4.20 |
| **TOTAL** | **75** | | **$26.25** |

All shots generated at 5-10s, then cut to exact timing in post.
