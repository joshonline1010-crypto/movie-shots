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
