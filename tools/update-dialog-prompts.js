/**
 * Update motion prompts to properly describe speaking/listening actions
 *
 * When character is speaking ON SCREEN:
 *   - Add speaking motion: "speaks expressively, mouth moving, gestures"
 * When character is listening:
 *   - Add reaction: "listens attentively, subtle nods"
 * When speaker is OFF SCREEN (voiceover):
 *   - Focus on action, no lip sync needed
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sceneId = 'shaun_the_plan';

const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// Speaking action phrases
const SPEAKING_PHRASES = [
  'speaks expressively, mouth moving naturally',
  'talks animatedly, gesturing',
  'speaks with emphasis, facial expressions',
  'delivers line with conviction, mouth moving'
];

// Listening/reaction phrases
const LISTENING_PHRASES = [
  'listens attentively, subtle reactions',
  'reacts to speaker, slight nods',
  'pays attention, expressions shifting',
  'watches speaker, responsive'
];

let updatedCount = 0;

scene.shots = scene.shots.map(shot => {
  const speaker = shot.audio?.speaker?.toLowerCase();
  const wordCount = shot.audio?.word_count || 0;
  const speakerOnScreen = shot.speaker_on_screen;

  if (!speaker || wordCount === 0) return shot;

  // Get current motion prompt
  let motionPrompt = shot.motion_prompt || '';

  // Check if prompt already has speaking/listening direction
  const hasSpeak = /speak|talk|mouth|say|deliver/i.test(motionPrompt);
  const hasListen = /listen|react|watch|nod/i.test(motionPrompt);

  if (speakerOnScreen && !hasSpeak) {
    // Speaker is on screen - add speaking action
    const speakPhrase = SPEAKING_PHRASES[Math.floor(Math.random() * SPEAKING_PHRASES.length)];

    // Insert speaking action into prompt
    if (motionPrompt) {
      // Add after subject description
      motionPrompt = motionPrompt.replace(
        /(character|man|woman|person|figure)([^,]*),/i,
        `$1$2, ${speakPhrase},`
      );
    } else {
      motionPrompt = `Character ${speakPhrase}, then settles`;
    }

    shot.motion_prompt = motionPrompt;
    shot.dialog_prompt_note = `${speaker.toUpperCase()} speaking ON SCREEN - lip sync needed`;
    updatedCount++;
    console.log(`${shot.shot_id}: Added speaking motion for ${speaker} (ON SCREEN)`);

  } else if (!speakerOnScreen && !hasListen) {
    // Speaker is off screen - this is voiceover
    shot.dialog_prompt_note = `${speaker.toUpperCase()} voiceover (OFF SCREEN) - no lip sync`;
    console.log(`${shot.shot_id}: ${speaker} voiceover (OFF SCREEN)`);
  }

  return shot;
});

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

console.log(`\n=== PROMPT UPDATE SUMMARY ===`);
console.log(`${updatedCount} shots updated with speaking motion`);
console.log(`\nTIP: For Seedance lip sync, the model handles mouth movement automatically.`);
console.log(`     The prompt should describe body language and expressions.`);
