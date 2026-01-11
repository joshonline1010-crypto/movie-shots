# Voice Over & Model Selection Deep Dive

## Voice Over Options

### Option 1: Seedance 1.5 Built-in (Current Setup)
**How it works:** Seedance generates lip sync automatically from text dialog.

```json
{
  "model": "seedance-1.5",
  "dialog": "We take Pete's car...",
  "dialog_voice": "ed_voice"
}
```

**Pros:**
- Zero extra setup
- Automatic lip sync
- Single API call

**Cons:**
- Limited voice options
- Less control over delivery
- Generic voices

---

### Option 2: ElevenLabs + Seedance

**How it works:**
1. Generate audio with ElevenLabs (better voices)
2. Feed audio URL to Seedance for lip sync

**ElevenLabs API:**
```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}" \
  -H "xi-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "We take Pete'\''s car...",
    "model_id": "eleven_multilingual_v2",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    }
  }'
```

**n8n Workflow Integration:**
```json
{
  "type": "webhook",
  "webhookData": {
    "body": {
      "text": "Dialog text here",
      "voice_id": "pNInz6obpgDQGcFmaJgB",
      "output_format": "mp3_44100_128"
    }
  }
}
```

**Then pass to Seedance:**
```json
{
  "endpoint": "fal-ai/seedance-1.5",
  "inputs": {
    "image_url": "character_image.jpg",
    "audio_url": "elevenlabs_output.mp3"
  }
}
```

**ElevenLabs Voice IDs for British Characters:**
| Character | Suggested Voice | Voice ID |
|-----------|-----------------|----------|
| Shaun | "Charlie" (British male) | IKne3meq5aSn9XLyUdCD |
| Ed | "Clyde" (casual male) | 2EiwWnXFnvU5JabPnv8n |
| Barbara | "Dorothy" (older female) | ThT5KcBeYPX3keUQqHPh |
| Liz | "Charlotte" (British female) | XB0fDUnXU5powFXDhCwa |

**Pricing:**
- Free: 10k chars/month
- Starter ($5/mo): 30k chars/month
- Creator ($22/mo): 100k chars/month

---

### Option 3: Bark (Free, Local)

**How it works:** Open-source TTS that runs locally.

```python
from bark import SAMPLE_RATE, generate_audio, preload_models
from scipy.io.wavfile import write as write_wav

preload_models()
text = "[laughs] We take Pete's car..."
audio = generate_audio(text, history_prompt="v2/en_speaker_6")
write_wav("output.wav", SAMPLE_RATE, audio)
```

**Pros:**
- Free
- Supports laughter, pauses, emotions via tags
- No API limits

**Cons:**
- Requires GPU
- Slower generation
- Quality varies

---

### Option 4: n8n TTS Workflow (Existing)

You already have a TTS workflow. Check workflow ID in CLAUDE.md.

---

## Kling O1 Deep Dive: When to Use Start→End

### What Kling O1 Does Best

Kling O1 excels at **controlled transitions** between two known states:
- Start image → End image with smooth interpolation
- Camera movements with precise endpoints
- Character pose/position changes
- State changes (door closed → open, light off → on)

### Model Comparison

| Scenario | Best Model | Why |
|----------|------------|-----|
| Character talks | Seedance 1.5 | Lip sync |
| Action continues indefinitely | Kling 2.6 | Open-ended motion |
| A→B transition | Kling O1 | Controlled endpoints |
| Camera push with expression change | Kling O1 | Two-state transition |
| Whip pan between shots | Kling O1 | Defined start/end |
| Walking, fighting, environment | Kling 2.6 | Dynamic motion |

### Identifying Kling O1 Candidates in Shaun Scene

Look for shots with:
1. **Match cuts** - Same subject, different framing
2. **Reaction shots** - Expression A → Expression B
3. **Camera movements with endpoint** - Push in that lands on closeup
4. **Whip pans** - Frame A whips to Frame B
5. **State changes** - Character moves from position A to B

**Example Kling O1 shot:**
```json
{
  "shot_id": "shot_015",
  "model": "kling-o1",
  "start_frame": "scenes/shaun_the_plan/frames/frame_020.jpg",
  "end_frame": "scenes/shaun_the_plan/frames/frame_022.jpg",
  "motion_prompt": "Camera pushes in slowly, character's expression shifts from neutral to determined, then holds"
}
```

### How to Add End Frames

1. Identify transition shots in the scene
2. Find the ending frame from extracted frames
3. Add `end_frame` field to shot JSON
4. Change model to `kling-o1`

**Before (Kling 2.6):**
```json
{
  "model": "kling-2.6",
  "start_frame": "frame_020.jpg",
  "motion_prompt": "Camera pushes in on face"
}
```

**After (Kling O1):**
```json
{
  "model": "kling-o1",
  "start_frame": "frame_020.jpg",
  "end_frame": "frame_022.jpg",
  "motion_prompt": "Camera pushes in, expression intensifies, then settles"
}
```

### Kling O1 API Parameters

```json
{
  "endpoint": "fal-ai/kling-video/o1",
  "inputs": {
    "start_image_url": "https://...",
    "tail_image_url": "https://...",
    "prompt": "Motion description, then settles",
    "duration": "5"
  }
}
```

**Critical:** Always include motion endpoint ("then settles", "then holds") to prevent processing hang.

---

## Recommended Workflow

### For Dialog Shots:
1. Generate ElevenLabs audio (if high quality needed)
2. Use Seedance 1.5 with audio_url
3. Or use Seedance with text dialog (simpler)

### For Transition Shots:
1. Identify start and end frames
2. Use Kling O1 with both frames
3. Motion prompt describes the transition

### For Action Shots:
1. Use Kling 2.6 with start frame only
2. Motion prompt with clear endpoint
3. Let model generate natural motion

---

## Quick Decision Tree

```
Does character SPEAK?
├── YES → Is voice quality critical?
│   ├── YES → ElevenLabs + Seedance 1.5
│   └── NO → Seedance 1.5 with text
│
└── NO → Is there a clear A→B transition?
    ├── YES → Do you have both frames?
    │   ├── YES → Kling O1 (start + end)
    │   └── NO → Kling 2.6 (start only)
    │
    └── NO → Kling 2.6 (general motion)
```
