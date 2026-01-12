# Empty Set Prompts - Shaun of the Dead

Generate these as a 3x3 storyboard grid using nano-banana-pro.
No characters - just empty environments for compositing/reference.

---

## INTERIOR SETS (6)

### 1. FLAT (Shaun & Ed's apartment)
```
Empty messy British flat interior, teal-green painted walls, brown leather couch, wooden dining table and chairs, zombie body in green jacket on floor, pizza boxes and debris scattered, bookshelf with globe and Heineken bottle, spiky black plant decoration, CRT television on wooden stand, window with daylight, desaturated color grading, practical lighting, 2.35:1 cinematic, no people
```

### 2. MUM'S HOUSE INTERIOR
```
Empty British suburban home interior, beige/cream walls, floral curtains on large window, wooden furniture, family photos on walls, cozy lived-in atmosphere, bright daylight through windows, warm practical lighting, middle-class English decor, 2.35:1 cinematic aspect ratio, no people
```

### 3. LIZ APARTMENT INTERIOR
```
Empty modern British flat interior, bright white walls, wooden venetian blinds backlit by window, floral pattern couch, coffee table with magazines, shelving with photos and decorations, ceramic elephant ornament, warm cozy lighting, contemporary furniture, 2.35:1 cinematic, no people
```

### 4. WINCHESTER PUB INTERIOR
```
Empty traditional British pub interior, dark wood paneling, brass fixtures, bar counter with beer taps, booth seating with red upholstery, framed pictures on walls, ambient warm lighting from wall sconces, wooden floor, pint glasses on tables, classic English pub atmosphere, 2.35:1 cinematic, no people
```

### 5. TV SCREEN INSERT
```
CRT television screen showing news broadcast, "NEWS FLASH" and "BREAKING NEWS" red graphics on lower third, blue-lit news studio background visible, TV frame and speakers visible on edges, dark room ambient glow, diegetic television lighting, 2.35:1 aspect ratio
```

### 6. CAR INTERIOR (Jaguar)
```
Interior of red Jaguar car, leather seats, wooden dashboard trim, rear-view mirror, windscreen showing suburban street, British right-hand drive, daylight through windows, classic car interior, 2.35:1 cinematic framing, no people
```

---

## EXTERIOR SETS (8)

### 7. FLAT EXTERIOR
```
British suburban apartment building exterior, red brick facade, white-framed windows, small front garden with hedge, residential street visible, overcast daylight, desaturated color grading, urban London suburb aesthetic, 2.35:1 cinematic, no people
```

### 8. SUBURBAN STREET
```
Empty British suburban residential street, red brick terraced houses, parked cars on both sides, hedges and small gardens, overcast sky, trees lining street, tarmac road with road markings, typical London suburb, desaturated daylight, 2.35:1 cinematic, no people
```

### 9. MUM'S HOUSE EXTERIOR (Front)
```
British detached suburban house exterior front view, white/cream rendered walls with brown timber accents, bay windows, small front garden with topiary bushes, brick driveway, white garage door, overcast daylight, middle-class English suburb, 2.35:1 cinematic, no people
```

### 10. MUM'S HOUSE DRIVEWAY
```
British suburban house driveway, brick paving, white garage door, side entrance with brown wooden door, hedge boundary, parked red Jaguar car, overcast daylight, residential setting, 2.35:1 cinematic, no people
```

### 11. MUM'S HOUSE EXTERIOR (Back/Garden)
```
British suburban back garden, lawn with flower beds, wooden fence boundary, back of house visible with patio doors, garden shed, overcast daylight, typical English garden, 2.35:1 cinematic, no people
```

### 12. LIZ APARTMENT BUILDING EXTERIOR
```
British urban apartment block exterior, red-brown brick facade, "CUNNINGHAM HOUSE" sign visible, white columns at entrance, balconies with railings, "NO PARKING" sign in foreground, urban setting with trees, overcast daylight, 2.35:1 cinematic, no people
```

### 13. WINCHESTER PUB EXTERIOR
```
Traditional British pub exterior, "THE WINCHESTER" sign above entrance, red brick building, large windows, hanging flower baskets, pavement with outdoor seating area, urban street setting, overcast daylight, classic English pub facade, 2.35:1 cinematic, no people
```

### 14. URBAN STREET
```
Empty London urban street, mix of residential and commercial buildings, parked cars, street signs, overcast sky, typical British city suburb, desaturated color grading, 2.35:1 cinematic, no people
```

---

## TRANSITION/MOTION BLUR (Skip - generate at runtime)
- Whip pan blurs generated during video, not as stills

---

## STORYBOARD GRID GENERATION

### Grid 1: Interiors (2x3 = 6 cells)
```
Row 1: Flat, Mum's Interior, Liz Interior
Row 2: Winchester Interior, TV Screen, Car Interior
```

### Grid 2: Exteriors (2x4 = 8 cells)
```
Row 1: Flat Exterior, Suburban Street, Mum's Front, Mum's Driveway
Row 2: Mum's Back, Liz Building, Winchester Pub, Urban Street
```

---

## GENERATION COMMAND

Use n8n Storyboard Grid workflow or direct nano-banana:

```json
{
  "type": "form",
  "formData": {
    "grid_layout": "3x3",
    "prompts": [
      "Empty messy British flat interior, teal-green walls...",
      "Empty British suburban home interior...",
      // ... etc
    ],
    "aspect_ratio": "21:9",
    "resolution": "2K"
  }
}
```

Or individual generation:
```json
{
  "model": "nano-banana-pro",
  "prompt": "[SET PROMPT HERE]",
  "aspect_ratio": "21:9",
  "resolution": "2K"
}
```

---

## COST ESTIMATE

| Item | Count | Cost Each | Total |
|------|-------|-----------|-------|
| Interior sets | 6 | $0.03 | $0.18 |
| Exterior sets | 8 | $0.03 | $0.24 |
| **Total** | **14** | | **$0.42** |

vs. generating backgrounds in every shot = 69 x redundant bg processing

---

## USAGE

1. Generate all 14 sets as reference images
2. Use as `start_frame` for establishing shots
3. Composite characters via inpainting/editing
4. Maintain visual consistency across shots
5. Save to: `scenes/shaun_the_plan/sets/`
