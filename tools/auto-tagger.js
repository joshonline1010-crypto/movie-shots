/**
 * Movie Shot Auto-Tagger
 *
 * Uses GPT-4 Vision to analyze movie screenshots and generate tags
 * matching the TAGGING_SCHEMA.json vocabulary
 *
 * Usage:
 *   node auto-tagger.js --file blade-runner-2049_shot-001.jpg
 *   node auto-tagger.js --dir ./_source/film-grab/blade-runner-2049/
 *   node auto-tagger.js --untag   Process all files with _needsTagging: true
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  // FAL AI endpoint for vision analysis
  falApiKey: process.env.FAL_KEY,

  // OpenAI API for GPT-4 Vision
  openaiApiKey: process.env.OPENAI_API_KEY,

  // n8n webhook for Universal API
  n8nWebhook: 'http://localhost:5678/webhook/universal-api',

  // Schema location
  schemaPath: path.join(__dirname, '..', 'TAGGING_SCHEMA.json'),

  // Base directory
  baseDir: path.join(__dirname, '..')
};

// Load tagging schema
let SCHEMA = null;
try {
  SCHEMA = JSON.parse(fs.readFileSync(CONFIG.schemaPath, 'utf8'));
} catch (err) {
  console.error('Failed to load TAGGING_SCHEMA.json:', err.message);
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      options.file = args[++i];
    } else if (args[i] === '--dir' && args[i + 1]) {
      options.dir = args[++i];
    } else if (args[i] === '--untag') {
      options.untagged = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Build the vision prompt with schema vocabulary
function buildVisionPrompt() {
  return `Analyze this movie screenshot and provide detailed cinematography tags.

You MUST use ONLY these vocabulary terms:

## Shot Types (pick ONE):
${Object.keys(SCHEMA.shotTypes).join(', ')}

## Camera Angles (pick ONE):
${Object.keys(SCHEMA.cameraAngles).join(', ')}

## Camera Movement (pick ONE - infer from composition):
${Object.keys(SCHEMA.cameraMovements).join(', ')}

## Emotion (pick primary + intensity if applicable):
Emotions: ${Object.keys(SCHEMA.emotions).join(', ')}
Intensities: subtle, medium, strong, extreme

## Lighting (pick ONE):
${Object.keys(SCHEMA.lighting).join(', ')}

## Environment (pick ONE category + specific location):
${Object.keys(SCHEMA.environments).join(', ')}

## Genre (pick 1-3):
${SCHEMA.genres.join(', ')}

## Composition elements:
${SCHEMA.composition?.framing?.join(', ') || 'rule of thirds, centered, off-center'}
Depth: ${SCHEMA.composition?.depth?.join(', ') || 'shallow focus, deep focus'}

## If you can identify:
- Director style (${Object.keys(SCHEMA.directors || {}).join(', ')})
- Decade (1940s-2020s)
- Lens type (14mm, 24mm, 35mm, 50mm, 85mm, 135mm, 200mm, anamorphic)

## 3D CAMERA PLACEMENT (ESTIMATE THESE VALUES):
- Azimuth (0-359): Horizontal rotation. 0=front, 90=right side, 180=back, 270=left side
- Elevation (-30 to 60): Vertical angle. -30=low looking up, 0=eye level, 60=high looking down
- Distance (0.6-1.8): Camera distance. 0.6=extreme close-up, 1.0=medium, 1.8=wide shot

## SUBJECT TYPE & DESCRIPTION (what is the main subject):
- Type: character, object, vehicle, animal, scene, background
- Description: Brief description of what it is (e.g., "man in dark suit", "vintage red car", "rainy city street")

## SUBJECT PLACEMENT (where is subject in frame):
- Horizontal: left-third, center, right-third
- Vertical: top-third, middle, bottom-third
- Eye direction (if character): at-camera, left, right, up, down, off-screen

## FRAMING RULES:
rule-of-thirds, centered-symmetrical, golden-ratio, leading-lines, frames-within-frames, negative-space, diagonal

## COLOR PALETTE:
teal-orange, desaturated-cold, neon-noir, golden-warm, noir-monochrome, pastel, bleach-bypass, technicolor

## ASPECT RATIO (estimate from black bars or composition):
16:9 (HD), 2.39:1 (anamorphic/cinematic), 1.85:1 (theatrical), 4:3 (classic), 21:9 (ultrawide)

## COSTUME/WARDROBE (describe what subject is wearing):
- Style: casual, formal, military, period, fantasy, scifi, streetwear, uniform
- Era: modern, 1940s, 1970s, victorian, futuristic, etc.
- Key pieces: coat, suit, dress, armor, hat, glasses, etc.
- Condition: pristine, worn, weathered, damaged, bloody, dirty
- Colors: describe main colors

## PRODUCTION DESIGN (set/environment details):
- Style: minimalist, maximalist, period-accurate, stylized, industrial, organic
- Key props: important objects visible in scene
- Materials: wood, metal, glass, concrete, fabric
- Practical lights: lamps, candles, neon-signs, screens, fire, windows

## CHARACTER POSE (body language):
- Posture: upright, slouched, leaning, crouched, sitting, standing
- Body language: open, closed, defensive, aggressive, relaxed, tense
- Gesture: what are hands doing
- Head position: straight, tilted, bowed, turned

## NARRATIVE/STORY PURPOSE (what role does this shot play):
- Shot purpose: establishing, character-intro, reaction, reveal, climax, transition, pov, insert
- Narrative beat: exposition, rising-action, crisis, climax, resolution
- Emotional function: build-tension, release-tension, create-empathy, establish-threat, show-vulnerability, foreshadow
- What story is this shot telling? (1 sentence)

Respond in this exact JSON format:
{
  "shot": {
    "type": "medium-close",
    "angle": "eye-level",
    "movement": "static"
  },
  "camera3d": {
    "azimuth": 45,
    "elevation": 15,
    "distance": 0.8,
    "description": "three-quarter view from the right, slightly elevated angle, medium-close shot"
  },
  "subject": {
    "type": "character",
    "description": "man in dark suit with loosened tie",
    "placement": "right-third",
    "eye_direction": "left",
    "pose": "standing"
  },
  "costume": {
    "style": "formal",
    "era": "modern",
    "key_pieces": ["dark suit", "loosened tie", "white shirt"],
    "condition": "worn",
    "colors": ["black", "white", "gray"]
  },
  "character_pose": {
    "posture": "standing",
    "body_language": "tense",
    "gesture": "hands at sides",
    "head_position": "slightly bowed"
  },
  "production_design": {
    "style": "period-accurate",
    "key_props": ["venetian blinds", "desk lamp", "whiskey glass"],
    "materials": ["wood", "glass", "brass"],
    "practical_lights": ["desk lamp", "window light through blinds"]
  },
  "narrative": {
    "shot_purpose": "character-intro",
    "narrative_beat": "rising-action",
    "emotional_function": "build-tension",
    "story_context": "Detective contemplates case alone in his office after discovering a crucial clue"
  },
  "emotion": {
    "primary": "sadness",
    "intensity": "medium",
    "secondary": []
  },
  "lighting": {
    "type": "rembrandt",
    "source": "single key light from left at 45 degrees creating triangle shadow on cheek",
    "color_temp": "warm tungsten"
  },
  "environment": {
    "type": "interior",
    "location": "dark office with venetian blinds",
    "weather": null,
    "time_of_day": "night"
  },
  "composition": {
    "framing": "rule-of-thirds",
    "depth": "shallow-focus",
    "notes": "subject placed on right third with negative space on left suggesting isolation"
  },
  "color_palette": "desaturated-cold",
  "aspect_ratio": "2.39:1",
  "film_stock": null,
  "genre": ["drama", "noir"],
  "director_style": null,
  "decade": "2010s",
  "lens": "85mm",
  "tags": ["list", "of", "additional", "descriptive", "tags"],
  "prompt_keywords": "Generate a COMPLETE Nano Banana prompt: [SUBJECT + PLACEMENT like 'man in suit positioned right-third'], [ENVIRONMENT], [MOOD], [3D CAMERA VIEW like 'three-quarter from right, eye level'], [FRAMING like 'rule of thirds with negative space left'], [SHOT + LENS like 'medium-close 85mm shallow DOF'], [LIGHT SOURCE like 'key light from left creating Rembrandt triangle']. Include color grade if distinctive."
}`;
}

// Analyze image using OpenAI GPT-4 Vision
async function analyzeWithOpenAI(imagePath) {
  // Read image as base64
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildVisionPrompt()
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  };

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.openaiApiKey}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error.message));
          } else {
            const content = response.choices[0].message.content;
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              resolve(JSON.parse(jsonMatch[0]));
            } else {
              reject(new Error('No JSON found in response'));
            }
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

// Analyze using n8n Universal API with vision
async function analyzeWithN8n(imagePath) {
  // For n8n, we need to upload the image first
  // This is a placeholder - you'd need to implement catbox upload
  console.log('  (n8n analysis not yet implemented - use OpenAI)');
  return null;
}

// Process a single image
async function processImage(imagePath, dryRun = false) {
  console.log(`\nProcessing: ${path.basename(imagePath)}`);

  const ext = path.extname(imagePath);
  const tagFile = imagePath.replace(ext, '.txt');

  // Load existing tag data if present
  let existingData = {};
  if (fs.existsSync(tagFile)) {
    try {
      existingData = JSON.parse(fs.readFileSync(tagFile, 'utf8'));
    } catch (err) {
      console.log('  Warning: Could not parse existing tag file');
    }
  }

  // Skip if already tagged (unless forcing)
  if (existingData._needsTagging === false) {
    console.log('  Already tagged, skipping');
    return null;
  }

  try {
    // Analyze with vision AI
    console.log('  Analyzing with GPT-4 Vision...');
    const analysis = await analyzeWithOpenAI(imagePath);

    console.log(`  Shot: ${analysis.shot?.type} / ${analysis.shot?.angle}`);
    console.log(`  Emotion: ${analysis.emotion?.primary} (${analysis.emotion?.intensity})`);
    console.log(`  Lighting: ${analysis.lighting?.type}`);
    console.log(`  Environment: ${analysis.environment?.type}`);
    if (analysis.camera3d) {
      console.log(`  Camera3D: Az=${analysis.camera3d.azimuth}° El=${analysis.camera3d.elevation}° Dist=${analysis.camera3d.distance}`);
    }
    console.log(`  Lens: ${analysis.lens || 'unknown'}`);
    if (analysis.narrative) {
      console.log(`  Narrative: ${analysis.narrative.shot_purpose} / ${analysis.narrative.narrative_beat}`);
    }
    if (analysis.costume) {
      console.log(`  Costume: ${analysis.costume.style} (${analysis.costume.era})`);
    }

    // Merge with existing data
    const tagData = {
      ...existingData,
      filename: path.basename(imagePath),
      shot: analysis.shot || existingData.shot,
      camera3d: analysis.camera3d || existingData.camera3d,
      subject: analysis.subject || existingData.subject,
      emotion: analysis.emotion || existingData.emotion,
      lighting: analysis.lighting || existingData.lighting,
      environment: analysis.environment || existingData.environment,
      composition: analysis.composition || existingData.composition,
      color_palette: analysis.color_palette || existingData.color_palette,
      aspect_ratio: analysis.aspect_ratio || existingData.aspect_ratio,
      film_stock: analysis.film_stock || existingData.film_stock,
      genre: analysis.genre || existingData.genre,
      director_style: analysis.director_style || existingData.director_style,
      decade: analysis.decade || existingData.decade,
      lens: analysis.lens || existingData.lens,
      // NEW FIELDS
      costume: analysis.costume || existingData.costume,
      character_pose: analysis.character_pose || existingData.character_pose,
      production_design: analysis.production_design || existingData.production_design,
      narrative: analysis.narrative || existingData.narrative,
      // End new fields
      tags: [...new Set([...(existingData.tags || []), ...(analysis.tags || [])])],
      prompt_keywords: analysis.prompt_keywords || existingData.prompt_keywords,
      _needsTagging: false,
      _taggedAt: new Date().toISOString(),
      _taggedBy: 'auto-tagger/gpt4-vision-v3'
    };

    if (dryRun) {
      console.log('  [DRY RUN] Would save:');
      console.log(JSON.stringify(tagData, null, 2));
    } else {
      fs.writeFileSync(tagFile, JSON.stringify(tagData, null, 2));
      console.log(`  Saved: ${path.basename(tagFile)}`);
    }

    return tagData;

  } catch (err) {
    console.log(`  Error: ${err.message}`);
    return null;
  }
}

// Find all images needing tagging
function findUntaggedImages(baseDir) {
  const untagged = [];

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(jpg|jpeg|png)$/i.test(entry.name)) {
        // Check if tag file exists and needs tagging
        const tagFile = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.txt');

        if (fs.existsSync(tagFile)) {
          try {
            const data = JSON.parse(fs.readFileSync(tagFile, 'utf8'));
            if (data._needsTagging === true) {
              untagged.push(fullPath);
            }
          } catch {
            untagged.push(fullPath);
          }
        } else {
          untagged.push(fullPath);
        }
      }
    }
  }

  scanDir(baseDir);
  return untagged;
}

// Find all images in directory
function findAllImages(dir) {
  const images = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && /\.(jpg|jpeg|png)$/i.test(entry.name)) {
      images.push(path.join(dir, entry.name));
    }
  }

  return images;
}

// Main function
async function main() {
  const options = parseArgs();

  if (!options.file && !options.dir && !options.untagged) {
    console.log(`
Movie Shot Auto-Tagger

Usage:
  node auto-tagger.js --file image.jpg     Tag single image
  node auto-tagger.js --dir ./folder/      Tag all images in folder
  node auto-tagger.js --untag              Find and tag all untagged images
  node auto-tagger.js --dry-run            Show what would be done

Environment variables:
  OPENAI_API_KEY    Your OpenAI API key (required for GPT-4 Vision)
    `);
    return;
  }

  if (!CONFIG.openaiApiKey || CONFIG.openaiApiKey === 'YOUR_OPENAI_KEY') {
    console.error('Error: OPENAI_API_KEY environment variable required');
    console.log('Set it with: set OPENAI_API_KEY=your-key-here');
    return;
  }

  let imagesToProcess = [];

  if (options.file) {
    imagesToProcess = [path.resolve(options.file)];
  } else if (options.dir) {
    imagesToProcess = findAllImages(path.resolve(options.dir));
  } else if (options.untagged) {
    imagesToProcess = findUntaggedImages(CONFIG.baseDir);
  }

  console.log(`Found ${imagesToProcess.length} images to process`);

  let processed = 0;
  let failed = 0;

  for (const imagePath of imagesToProcess) {
    try {
      const result = await processImage(imagePath, options.dryRun);
      if (result) processed++;

      // Rate limit - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.log(`Error processing ${imagePath}: ${err.message}`);
      failed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${processed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${imagesToProcess.length - processed - failed}`);
}

main().catch(console.error);
