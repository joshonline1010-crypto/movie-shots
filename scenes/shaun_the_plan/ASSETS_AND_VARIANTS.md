# Assets & Character Variants - Shaun of the Dead

Generate these separately for compositing and consistency.

---

## VEHICLE ASSETS

### Red Jaguar - Exterior
```
Red Jaguar XJ Series classic car exterior, British sedan, chrome trim, wire wheels, parked on suburban street, overcast daylight, 3/4 front view, clean detailed shot, no people, 2.35:1 cinematic
```

### Red Jaguar - Interior
```
Interior of classic red Jaguar car, cream leather seats, wood veneer dashboard, British right-hand drive, steering wheel, gear shift, windscreen view of road, daylight through windows, no people, 2.35:1 cinematic
```

### Red Jaguar - Driving (Motion)
```
Red Jaguar XJ driving on British suburban street, motion blur on wheels and background, tracking shot from side, trees and houses blurred, daylight, no visible driver, 2.35:1 cinematic
```

---

## PROP ASSETS

### Cricket Bat - Clean
```
English willow cricket bat, clean wood grain, red rubber grip handle, isolated on white background, product photography style, high detail, no blood
```

### Cricket Bat - Bloody
```
English willow cricket bat covered in dark red blood and gore, dripping wet, gruesome horror prop, isolated on dark background, dramatic lighting, high detail
```

### Tea Mug - Green Text
```
White ceramic tea mug with green text pattern, British style cup, cream-colored tea inside, isolated product shot, soft lighting
```

### COOL Mug
```
White ceramic coffee mug with blue text reading "COOL COOL COOL" in various fonts, British pub style, isolated product shot
```

### Pint Glass - Lager
```
British pint glass filled with golden lager beer, white foam head, condensation on glass, pub table background blurred, warm lighting
```

### Doorbell Button
```
Extreme close-up of finger pressing doorbell button, brass or chrome doorbell fixture on wooden door frame, shallow depth of field, insert shot style
```

---

## COMPOSITING WORKFLOW (Key Insight)

**DON'T generate every character variant separately!**

Instead:
1. Generate CHARACTER REF (standard pose, white background)
2. Generate EMPTY SET (background only, no people)
3. Use nano-banana /edit with BOTH as reference images
4. Prompt: "THIS EXACT CHARACTER [action] in THIS EXACT LOCATION"

This gives you infinite pose/location combos from minimal assets!

**Only character that needs separate variant: PHILIP (Zombie)**
- He transforms mid-scene from human to zombie
- Need zombie makeup reference sheet

---

## ESSENTIAL CHARACTER REFS (5 only)

### 1. ED
```
Professional character reference sheet, front and 3/4 profile. British man late 20s, dark brown messy hair, round face, stubble, slightly overweight. Wearing dirty beige t-shirt with 'I GOT WOOD' orange text. Clean white background, studio lighting, 4K photorealistic
```

### 2. SHAUN
```
Professional character reference sheet, front and 3/4 profile. British man early 30s, short receding blonde hair, stubble, blood scratch marks on right cheek. Wearing white dress shirt with blood stains, red tie, dark grey-blue harrington jacket. Tired but determined expression. Clean white background, studio lighting, 4K photorealistic
```

### 3. BARBARA (MUM)
```
Professional character reference sheet, front and 3/4 profile. British woman early 60s, short grey-brown bob haircut, kind maternal face. Wearing purple top with grey cardigan. Worried expression. Clean white background, studio lighting, 4K photorealistic
```

### 4. LIZ
```
Professional character reference sheet, front and 3/4 profile. British woman late 20s, blonde hair. Wearing light blue track jacket over light top. Clean white background, studio lighting, 4K photorealistic
```

### 5. PHILIP - ZOMBIE (Only variant needed!)
```
Professional character reference sheet, front and 3/4 profile. British man late 50s, grey-brown disheveled hair, gaunt angular face, ZOMBIE MAKEUP with pale grey complexion, dark sunken eyes, blood around mouth. Wearing teal blue polo shirt with blood stains. Menacing expression. Clean white background, studio lighting, horror style
```

---

## COMPOSITING EXAMPLE

**To create "Ed swinging bat in flat":**

```
nano-banana-pro /edit
  image_urls: [
    "characters/ed_ref.png",      # Character reference
    "sets/flat_interior.png"      # Empty background
  ]
  prompt: "THIS EXACT CHARACTER swinging bloody cricket bat overhead, excited expression, in THIS EXACT LOCATION, dynamic action pose, 2.35:1 cinematic"
```

**To create "Shaun carrying Liz":**
```
nano-banana-pro /edit
  image_urls: [
    "characters/shaun_ref.png",
    "characters/liz_ref.png",
    "sets/mums_driveway.png"
  ]
  prompt: "THIS EXACT MAN carrying THIS EXACT WOMAN bridal-style, both laughing, in THIS EXACT LOCATION, 2.35:1 cinematic"
```

---

## SIMPLIFIED ASSET LIST

### Characters (5 refs)
| Character | Shots | Notes |
|-----------|-------|-------|
| Ed | 25+ | Main character |
| Shaun | 30+ | Main character |
| Barbara | 8 | Mum |
| Liz | 5 | Girlfriend |
| Philip Zombie | 4 | Only variant needed |

### Props (3 essential)
| Prop | Notes |
|------|-------|
| Cricket bat (bloody) | Key recurring prop |
| Tea mug | Insert shots |
| Pint glass | Pub scenes |

### Sets (14)
See SET_PROMPTS.md

### Vehicles (2)
| Vehicle | Notes |
|---------|-------|
| Red Jaguar exterior | Establishing shots |
| Red Jaguar interior | Optional |

---

## TOTAL COST (Revised)

| Category | Count | Cost |
|----------|-------|------|
| Characters | 5 | $0.15 |
| Props | 3 | $0.09 |
| Sets | 14 | $0.42 |
| Vehicles | 2 | $0.06 |
| **TOTAL** | **24** | **$0.72** |

Then composite infinite variations for free with /edit!

### Grid 3: Vehicles (2x2)
```
Row 1: Jaguar exterior, Jaguar interior
Row 2: Jaguar driving, [spare]
```

---

## COST ESTIMATE

| Category | Count | Cost Each | Total |
|----------|-------|-----------|-------|
| Character variants | 11 | $0.03 | $0.33 |
| Props | 6 | $0.03 | $0.18 |
| Vehicles | 3 | $0.03 | $0.09 |
| **TOTAL** | **20** | | **$0.60** |

Combined with 14 sets = **$1.02** for ALL reference assets

---

## FOLDER STRUCTURE

```
scenes/shaun_the_plan/
├── frames/           # Source video frames
├── characters/       # Character reference sheets
│   ├── ed_standard.png
│   ├── ed_with_bat.png
│   ├── shaun_standard.png
│   └── ...
├── props/            # Isolated prop images
│   ├── cricket_bat_clean.png
│   ├── cricket_bat_bloody.png
│   └── ...
├── vehicles/         # Vehicle assets
│   ├── jaguar_exterior.png
│   └── jaguar_interior.png
└── sets/             # Empty background sets
    ├── flat_interior.png
    ├── winchester_interior.png
    └── ...
```
