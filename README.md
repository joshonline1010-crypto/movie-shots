# MOVIE SHOTS - Film Screenshot Reference Library

**Part of CHIP Production System**

Curated screenshot collection from film-grab.com and other sources, organized by cinematic vocabulary for AI prompt reference.

---

## Folder Structure

```
MOVIE SHOTS/
├── by-genre/
│   ├── action/
│   ├── drama/
│   ├── horror/
│   ├── comedy/
│   ├── scifi/
│   ├── fantasy/
│   ├── thriller/
│   ├── romance/
│   ├── noir/
│   └── documentary/
│
├── by-emotion/
│   ├── happiness/
│   │   ├── subtle/
│   │   ├── medium/
│   │   ├── strong/
│   │   └── extreme/
│   ├── sadness/
│   ├── anger/
│   ├── fear/
│   ├── surprise/
│   ├── confidence/
│   ├── love/
│   ├── disgust/
│   ├── neutral/
│   └── menacing/
│
├── by-shot-type/
│   ├── extreme-long/
│   ├── long/
│   ├── medium-long/
│   ├── medium/
│   ├── medium-close/
│   ├── close-up/
│   └── extreme-close/
│
├── by-camera-angle/
│   ├── eye-level/
│   ├── low-angle/
│   ├── high-angle/
│   ├── dutch/
│   ├── birds-eye/
│   └── worms-eye/
│
├── by-camera-movement/
│   ├── static/
│   ├── dolly/
│   ├── tracking/
│   ├── orbit/
│   ├── pan/
│   ├── tilt/
│   ├── crane/
│   ├── handheld/
│   └── steadicam/
│
├── by-lighting/
│   ├── dramatic/
│   ├── warm/
│   ├── cold/
│   ├── romantic/
│   ├── horror/
│   ├── fire/
│   ├── neon/
│   ├── moonlight/
│   ├── sunset/
│   └── overcast/
│
├── by-environment/
│   ├── urban/
│   ├── nature/
│   ├── interior/
│   ├── fantasy/
│   ├── scifi/
│   └── historical/
│
├── by-director/
│   ├── stanley-kubrick/
│   ├── wes-anderson/
│   ├── david-fincher/
│   ├── denis-villeneuve/
│   ├── christopher-nolan/
│   ├── quentin-tarantino/
│   ├── ridley-scott/
│   └── [other]/
│
├── by-decade/
│   ├── 1940s/
│   ├── 1950s/
│   ├── 1960s/
│   ├── 1970s/
│   ├── 1980s/
│   ├── 1990s/
│   ├── 2000s/
│   ├── 2010s/
│   └── 2020s/
│
└── _source/                    # Raw downloads before organizing
    └── film-grab/
```

---

## Tagging System

Each screenshot has a companion `.txt` file with the same name:

```
blade-runner-2049_shot-001.jpg
blade-runner-2049_shot-001.txt
```

### Tag File Format

```json
{
  "filename": "blade-runner-2049_shot-001.jpg",
  "source": "film-grab.com",
  "film": {
    "title": "Blade Runner 2049",
    "year": 2017,
    "director": "Denis Villeneuve",
    "cinematographer": "Roger Deakins",
    "genre": ["scifi", "noir", "thriller"]
  },
  "shot": {
    "type": "extreme-long",
    "angle": "eye-level",
    "movement": "static",
    "lens": "anamorphic"
  },
  "emotion": {
    "primary": "sadness",
    "intensity": "subtle",
    "secondary": ["isolation", "longing"]
  },
  "lighting": {
    "type": "cold",
    "source": "overcast sky, industrial haze",
    "color_temp": "cold blue-gray"
  },
  "environment": {
    "type": "scifi",
    "location": "wasteland ruins",
    "weather": "overcast",
    "time_of_day": "day"
  },
  "composition": {
    "framing": "centered subject",
    "depth": "deep focus",
    "leading_lines": true,
    "symmetry": false
  },
  "tags": [
    "scifi", "dystopia", "wasteland", "silhouette",
    "wide", "epic", "desolate", "cold", "blue",
    "denis-villeneuve", "roger-deakins", "extreme-long-shot"
  ],
  "prompt_keywords": "extreme wide shot, lone figure in desolate wasteland, industrial ruins, cold blue-gray sky, overcast haze, shot on anamorphic lens, cinematic composition, Denis Villeneuve style"
}
```

---

## Tag Categories (Matching promptBuilder.ts)

### Emotions (with intensity levels)
| Emotion | Levels |
|---------|--------|
| happiness | subtle, medium, strong, extreme |
| sadness | subtle, medium, strong, extreme |
| anger | subtle, medium, strong, extreme |
| fear | subtle, medium, strong, extreme |
| surprise | subtle, medium, strong, extreme |
| confidence | -- |
| love | -- |
| disgust | -- |
| neutral | -- |
| menacing | Kubrick stare |

### Shot Types
- extreme-long (vast space, tiny figure)
- long (full body, head to toe)
- medium-long (knees up)
- medium (waist up)
- medium-close (chest up)
- close-up (face)
- extreme-close (eyes only)

### Camera Angles
- eye-level
- low-angle (looking up)
- high-angle (looking down)
- dutch (tilted)
- birds-eye (directly down)
- worms-eye (directly up)

### Camera Movements
- static
- dolly (in, out, left, right)
- tracking (ground, side, behind)
- orbit (left, right, 360)
- pan (left, right)
- tilt (up, down)
- crane (up, down)
- handheld
- steadicam

### Lighting Types
- dramatic (single harsh spotlight)
- warm (golden hour)
- cold (blue fluorescent)
- romantic (candlelight)
- horror (flashlight from below)
- fire (orange glow)
- neon (pink/blue reflections)
- moonlight (silver highlights)
- sunset (rim lighting)
- overcast (soft diffused)

### Environments
- urban: street, alley, rooftop, subway, nightclub
- nature: forest, beach, mountain, desert, waterfall
- interior: living_room, bedroom, kitchen, office
- fantasy: castle, tavern, dungeon, enchanted
- scifi: spaceship, space_station, alien_planet, cyberpunk
- historical: victorian, twenties, fifties, eighties

---

## Scraping film-grab.com

### URL Patterns
```
https://film-grab.com/[YEAR]/[MONTH]/[DAY]/[film-slug]/
https://film-grab.com/tag/[tag]/
https://film-grab.com/category/[category]/
```

### Scraping Script Location
```
MOVIE SHOTS/tools/scraper.js
```

### Usage
```bash
# Scrape a single film
node tools/scraper.js --film "blade-runner-2049"

# Scrape by director
node tools/scraper.js --director "denis-villeneuve"

# Scrape by genre
node tools/scraper.js --genre "sci-fi"
```

---

## Integration with Production System

### TAG_DATABASE.json Reference
This library is registered in TAG_DATABASE.json under `databases`:

```json
{
  "id": "movie_shots_library",
  "name": "Movie Shots Library",
  "tags": ["screenshots", "reference", "film", "cinematography"],
  "path": "C:/Users/yodes/Documents/Production-System/MOVIE SHOTS/",
  "usage": "Film screenshot references organized by cinematic vocabulary"
}
```

### Prompt Builder Integration
Use screenshots as reference images in nano-banana-pro/edit:

```javascript
{
  "image_urls": ["path/to/movie-shot.jpg"],
  "prompt": "THIS EXACT LIGHTING STYLE, [your subject], maintain color grading"
}
```

---

## File Naming Convention

```
[film-slug]_shot-[NNN].jpg
[film-slug]_shot-[NNN].txt
```

Examples:
```
blade-runner-2049_shot-001.jpg
blade-runner-2049_shot-001.txt
the-shining_shot-042.jpg
the-shining_shot-042.txt
```

---

## Quick Lookup

### Find shots by style
1. Know what you want visually
2. Navigate to matching folder (emotion, lighting, shot-type)
3. Browse and pick reference
4. Use companion .txt for prompt keywords

### Find shots for a director's style
1. Go to `by-director/[name]/`
2. All that director's shots in one place
3. Study patterns, use for style transfer

---

*Part of CHIP Production System | Updated 2026-01-11*
