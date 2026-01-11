# Next Session TODO - Shaun of the Dead Scene

## Priority Tasks

### 1. Generate Character Reference Images
Use the `generate_prompt` fields to create consistent character refs:
```
Characters to generate:
- shaun: Blonde, red tie, dark jacket, blood on cheek
- ed: Heavyset, "I GOT WOOD" t-shirt, cricket bat
- barbara: 60s, grey-brown bob, purple top
- liz: Late 20s, blonde, blue track jacket
- philip: 50s, zombie makeup, teal polo
```

### 2. Test Browser UI
```bash
cd "C:\Users\yodes\Documents\Production-System\MOVIE SHOTS"
node tools/server.js
# Open http://localhost:3333/browser.html
# Click Scenes > shaun_the_plan
# Verify frame thumbnails display in boxes
```

### 3. Add End Frames for Kling O1 Shots
Identify shots that would benefit from explicit start→end transitions:
- Whip pans (frame A → frame B)
- Match cuts
- Camera push-ins with state change
- Reaction shots with expression change

### 4. Voice Over Setup
Options:
- **Seedance 1.5**: Built-in lip sync (current setup)
- **ElevenLabs**: Higher quality voices, more control
- **n8n TTS workflow**: Existing pipeline

### 5. Execute Scene via n8n
Use Story→Video v4 PARALLEL workflow to generate all 69 shots.

---

## Voice Over Options Comparison

| Option | Quality | Lip Sync | Cost | Setup |
|--------|---------|----------|------|-------|
| Seedance built-in | Good | Auto | Included | None |
| ElevenLabs + Seedance | Excellent | Manual sync | $5-22/mo | API key |
| Bark (free) | Decent | Manual | Free | Local install |

## Kling O1 Candidates (Start→End shots)

Shots that should use Kling O1 with explicit end frames:
- Match cuts between locations
- Character movement A→B positions
- Camera push-ins with expression change
- Whip pan transitions

Current model breakdown:
- 28 seedance-1.5 (dialog)
- 41 kling-2.6 (action)
- 0 kling-o1 (could upgrade some kling-2.6 shots)

---

## Reference Shots Needed

### Character Reference Images (Generate First)

| Character | Prompt Location | Shots Appearing |
|-----------|-----------------|-----------------|
| **Ed** | `character_references.ed.generate_prompt` | 25+ shots |
| **Shaun** | `character_references.shaun.generate_prompt` | 30+ shots |
| **Barbara** | `character_references.barbara.generate_prompt` | 8 shots |
| **Liz** | `character_references.liz.generate_prompt` | 5 shots |
| **Philip** | `character_references.philip.generate_prompt` | 4 shots |

**Generation command:**
```
Use nano-banana-pro with generate_prompt from scene JSON
Save to: scenes/shaun_the_plan/characters/[name]_ref.png
```

### Key Frames for Shot Chaining

Scene uses auto-chaining (each shot starts where previous ended). But these frames are critical anchor points:

| Frame | Why Important | Used In |
|-------|---------------|---------|
| `frame_001.jpg` | Scene opener - Ed on couch | shot_001 |
| `frame_020.jpg` | Mum's house exterior | shot_012 |
| `frame_035.jpg` | Liz's flat exterior | shot_022 |
| `frame_050.jpg` | Winchester pub exterior | shot_032 |
| `frame_070.jpg` | Back to flat - plan revision | shot_045 |
| `frame_105.jpg` | Final frame - scene end | shot_069 |

### End Frames for Kling O1 Upgrades

These shots would benefit from explicit end_frame (upgrade from kling-2.6 to kling-o1):

| Shot | Start Frame | End Frame | Motion |
|------|-------------|-----------|--------|
| shot_003 | frame_004 | frame_006 | Shaun thinking → realization |
| shot_011 | frame_018 | frame_020 | Whip pan to Mum's house |
| shot_021 | frame_033 | frame_035 | Whip pan to Liz's flat |
| shot_031 | frame_048 | frame_050 | Whip pan to Winchester |
| shot_044 | frame_068 | frame_070 | Return to flat transition |

### Last Frame Extraction (For Chaining)

If generating shots sequentially, extract last frame from each video:
```bash
# After each video generates, extract last frame for next shot
ffmpeg -sseof -0.1 -i shot_001.mp4 -frames:v 1 shot_001_last.jpg

# Upload for next shot's start_frame
curl -F "fileToUpload=@shot_001_last.jpg" https://catbox.moe/user/api.php
```

### Assets Checklist

Before execution, ensure you have:

- [ ] 5 character reference images generated
- [ ] All 105 source frames accessible (local server running)
- [ ] ElevenLabs API key (if using for voices)
- [ ] n8n running with Story→Video workflow active
- [ ] ~$30 FAL credits for full scene (~69 shots × $0.40)
