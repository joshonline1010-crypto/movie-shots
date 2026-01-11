/**
 * Build searchable index from all tagged shots
 * Generates index.json for the browser UI
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const SOURCE_DIRS = [
  path.join(BASE_DIR, '_source', 'film-grab'),
  path.join(BASE_DIR, '_source', 'shot-cafe')
];

function scanDirectory(dir, shots = []) {
  if (!fs.existsSync(dir)) return shots;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanDirectory(fullPath, shots);
    } else if (entry.isFile() && entry.name.endsWith('.txt')) {
      try {
        const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

        // Only include tagged shots
        if (data._needsTagging === false) {
          const imagePath = fullPath.replace('.txt', '.jpg');
          const relativePath = path.relative(BASE_DIR, imagePath).replace(/\\/g, '/');

          shots.push({
            id: path.basename(fullPath, '.txt'),
            image: relativePath,
            film: data.film?.title || 'Unknown',
            year: data.film?.year || null,
            director: data.director_style || null,
            shot: data.shot?.type || null,
            angle: data.shot?.angle || null,
            movement: data.shot?.movement || null,
            emotion: data.emotion?.primary || null,
            emotionIntensity: data.emotion?.intensity || null,
            lighting: data.lighting?.type || null,
            lightingSource: data.lighting?.source || null,
            lightingColor: data.lighting?.color_temp || null,
            environment: data.environment?.type || null,
            location: data.environment?.location || null,
            weather: data.environment?.weather || null,
            timeOfDay: data.environment?.time_of_day || null,
            genre: data.genre || [],
            decade: data.decade || null,
            lens: data.lens || null,
            tags: data.tags || [],
            prompt: data.prompt_keywords || '',
            // Composition data
            framing: data.composition?.framing || null,
            depth: data.composition?.depth || null,
            compositionNotes: data.composition?.notes || null,
            // Subject info
            subjectType: data.subject?.type || null,
            subjectDescription: data.subject?.description || null,
            subjectPlacement: data.subject?.placement || null,
            eyeDirection: data.subject?.eye_direction || null,
            pose: data.subject?.pose || null,
            // Style data
            colorPalette: data.color_palette || null,
            filmStock: data.film_stock || null,
            aspectRatio: data.aspect_ratio || null,
            // 3D Camera placement data
            camera3d: data.camera3d ? {
              azimuth: data.camera3d.azimuth,
              elevation: data.camera3d.elevation,
              distance: data.camera3d.distance,
              description: data.camera3d.description || null
            } : null,
            // Costume/Wardrobe
            costume: data.costume ? {
              style: data.costume.style || null,
              era: data.costume.era || null,
              keyPieces: data.costume.key_pieces || [],
              condition: data.costume.condition || null,
              colors: data.costume.colors || []
            } : null,
            // Character Pose
            characterPose: data.character_pose ? {
              posture: data.character_pose.posture || null,
              bodyLanguage: data.character_pose.body_language || null,
              gesture: data.character_pose.gesture || null,
              headPosition: data.character_pose.head_position || null
            } : null,
            // Production Design
            productionDesign: data.production_design ? {
              style: data.production_design.style || null,
              keyProps: data.production_design.key_props || [],
              materials: data.production_design.materials || [],
              practicalLights: data.production_design.practical_lights || []
            } : null,
            // Narrative/Story Purpose
            narrative: data.narrative ? {
              shotPurpose: data.narrative.shot_purpose || null,
              narrativeBeat: data.narrative.narrative_beat || null,
              emotionalFunction: data.narrative.emotional_function || null,
              storyContext: data.narrative.story_context || null
            } : null
          });
        }
      } catch (err) {
        // Skip invalid files
      }
    }
  }

  return shots;
}

console.log('Building index...');

let allShots = [];
for (const dir of SOURCE_DIRS) {
  console.log(`Scanning: ${dir}`);
  allShots = scanDirectory(dir, allShots);
}

// Extract unique values for filters
const filters = {
  directors: [...new Set(allShots.map(s => s.director).filter(Boolean))].sort(),
  emotions: [...new Set(allShots.map(s => s.emotion).filter(Boolean))].sort(),
  lighting: [...new Set(allShots.map(s => s.lighting).filter(Boolean))].sort(),
  shotTypes: [...new Set(allShots.map(s => s.shot).filter(Boolean))].sort(),
  environments: [...new Set(allShots.map(s => s.environment).filter(Boolean))].sort(),
  decades: [...new Set(allShots.map(s => s.decade).filter(Boolean))].sort(),
  films: [...new Set(allShots.map(s => s.film).filter(Boolean))].sort(),
  lenses: [...new Set(allShots.map(s => s.lens).filter(Boolean))].sort(),
  angles: [...new Set(allShots.map(s => s.angle).filter(Boolean))].sort()
};

// Count shots with 3D camera data
const camera3dCount = allShots.filter(s => s.camera3d).length;

const index = {
  generated: new Date().toISOString(),
  count: allShots.length,
  filters,
  shots: allShots
};

const outputPath = path.join(BASE_DIR, 'index.json');
fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));

console.log(`\nIndex built: ${allShots.length} shots`);
console.log(`Saved to: ${outputPath}`);
console.log(`\nFilters available:`);
console.log(`  Directors: ${filters.directors.length}`);
console.log(`  Emotions: ${filters.emotions.length}`);
console.log(`  Lighting: ${filters.lighting.length}`);
console.log(`  Shot Types: ${filters.shotTypes.length}`);
console.log(`  Lenses: ${filters.lenses.length}`);
console.log(`  Angles: ${filters.angles.length}`);
console.log(`  Films: ${filters.films.length}`);
console.log(`\n3D Camera Data: ${camera3dCount} shots have exact camera placement`);
