/**
 * Update scene shots with dialogue from Whisper transcript
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sceneId = 'shaun_the_plan';

// Load transcript
const transcript = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'scenes', sceneId, 'whisper_transcript.json'), 'utf8'
));

// Load scene
const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// Build timeline of dialogue lines with frame ranges
const dialogueTimeline = [];
transcript.chunks.forEach(chunk => {
  chunk.lines.forEach(line => {
    const startFrame = Math.floor(line.approx_time * 3) + 1;
    const estimatedDuration = line.text.split(' ').length * 0.4; // rough estimate
    const endFrame = Math.floor((line.approx_time + estimatedDuration) * 3) + 1;

    dialogueTimeline.push({
      speaker: line.speaker,
      text: line.text,
      start_frame: startFrame,
      end_frame: endFrame,
      start_time: line.approx_time
    });
  });
});

console.log('Dialogue timeline:', dialogueTimeline.length, 'lines');

// Update each shot
let updatedCount = 0;
let modelChangedCount = 0;

scene.shots = scene.shots.map(shot => {
  const shotStart = shot.timing?.start_frame || 0;
  const shotEnd = shot.timing?.end_frame || 0;

  // Find dialogue that overlaps with this shot
  const overlappingDialogue = dialogueTimeline.filter(d => {
    return d.start_frame <= shotEnd && d.end_frame >= shotStart;
  });

  if (overlappingDialogue.length > 0) {
    // Get the primary speaker (most dialogue)
    const speakerCounts = {};
    overlappingDialogue.forEach(d => {
      speakerCounts[d.speaker] = (speakerCounts[d.speaker] || 0) + d.text.length;
    });
    const primarySpeaker = Object.entries(speakerCounts)
      .sort((a, b) => b[1] - a[1])[0][0];

    // Combine dialogue for this shot
    const combinedText = overlappingDialogue.map(d => d.text).join(' ');

    // Update shot
    shot.audio = shot.audio || {};
    shot.audio.dialog = combinedText;
    shot.audio.speaker = primarySpeaker;
    shot.audio.dialog_source = 'whisper';
    shot.audio.dialog_lines = overlappingDialogue.length;

    // If character is speaking and current model isn't seedance, recommend seedance
    if (primarySpeaker !== 'TV' && shot.model !== 'seedance-1.5') {
      shot.recommended_model = 'seedance-1.5';
      shot.model_reason = 'Character speaking - use Seedance for lip sync';
      modelChangedCount++;
    }

    updatedCount++;
    console.log(`${shot.shot_id}: ${primarySpeaker} says "${combinedText.substring(0, 50)}..."`);
  } else {
    // No dialogue - clear unknown
    if (shot.audio?.dialog === 'Unknown') {
      shot.audio.dialog = null;
      shot.audio.speaker = null;
    }
  }

  return shot;
});

// Save updated scene
fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

console.log('\n=== SUMMARY ===');
console.log(`Updated ${updatedCount} shots with dialogue`);
console.log(`${modelChangedCount} shots recommended for Seedance 1.5`);
console.log(`Saved to: ${scenePath}`);
