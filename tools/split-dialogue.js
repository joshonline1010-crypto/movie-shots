/**
 * Split dialogue precisely across shots based on word timing
 * ~3 words per second for conversational speech
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sceneId = 'shaun_the_plan';
const FPS = 3;
const WORDS_PER_SECOND = 3.5; // Conversational speech rate

// Load transcript
const transcript = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'scenes', sceneId, 'whisper_transcript.json'), 'utf8'
));

// Load scene
const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// Build word-level timeline from transcript chunks
const wordTimeline = [];

transcript.chunks.forEach(chunk => {
  chunk.lines.forEach(line => {
    const words = line.text.split(/\s+/);
    const wordsCount = words.length;
    const lineDuration = wordsCount / WORDS_PER_SECOND;
    const startTime = line.approx_time;

    words.forEach((word, i) => {
      const wordStart = startTime + (i * (lineDuration / wordsCount));
      const wordEnd = wordStart + (lineDuration / wordsCount);
      const startFrame = Math.floor(wordStart * FPS) + 1;
      const endFrame = Math.floor(wordEnd * FPS) + 1;

      wordTimeline.push({
        word: word,
        speaker: line.speaker,
        start_time: wordStart,
        end_time: wordEnd,
        start_frame: startFrame,
        end_frame: endFrame
      });
    });
  });
});

console.log(`Built timeline with ${wordTimeline.length} words`);

// Update each shot with ONLY the words spoken during that shot
let updatedCount = 0;

scene.shots = scene.shots.map(shot => {
  const shotStart = shot.timing?.start_frame || 0;
  const shotEnd = shot.timing?.end_frame || 0;

  // Find words that fall within this shot's frame range
  const wordsInShot = wordTimeline.filter(w => {
    // Word overlaps with shot if word starts before shot ends AND word ends after shot starts
    return w.start_frame <= shotEnd && w.end_frame >= shotStart;
  });

  if (wordsInShot.length > 0) {
    // Get unique speakers
    const speakers = [...new Set(wordsInShot.map(w => w.speaker))];
    const primarySpeaker = speakers[0];

    // Build dialogue string from words
    const dialogText = wordsInShot.map(w => w.word).join(' ');

    // Update shot
    shot.audio = shot.audio || {};
    shot.audio.dialog = dialogText;
    shot.audio.speaker = primarySpeaker;
    shot.audio.word_count = wordsInShot.length;
    shot.audio.dialog_source = 'whisper_split';

    // Recommend Seedance for speaking shots (not TV)
    if (primarySpeaker !== 'TV' && wordsInShot.length >= 2) {
      shot.model = 'seedance-1.5';
      shot.model_reason = 'Character speaking - Seedance for lip sync';
    }

    updatedCount++;
    console.log(`${shot.shot_id} (frames ${shotStart}-${shotEnd}): "${dialogText}" [${primarySpeaker}]`);
  } else {
    // No dialogue in this shot
    shot.audio = shot.audio || {};
    shot.audio.dialog = null;
    shot.audio.speaker = null;
    shot.audio.word_count = 0;
  }

  return shot;
});

// Save updated scene
fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

console.log(`\n=== SUMMARY ===`);
console.log(`Updated ${updatedCount} shots with precise dialogue`);
console.log(`Saved to: ${scenePath}`);
