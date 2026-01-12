/**
 * Fix model selection based on:
 * - Is speaker ON SCREEN? (visible in shot)
 * - Is camera moving?
 *
 * Seedance 1.5 = Speaker on screen + static camera (lip sync)
 * Kling 2.6 = Speaker off screen OR camera moving (voiceover)
 * Kling O1 = Camera movement with state change
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sceneId = 'shaun_the_plan';

const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// Camera movements that make lip sync difficult
const MOVING_CAMERA = ['zoom_out', 'zoom_in', 'push_in', 'pull_out', 'pan', 'tracking', 'whip_pan', 'dolly'];

let seedanceCount = 0;
let klingCount = 0;
let klingO1Count = 0;

scene.shots = scene.shots.map(shot => {
  const speaker = shot.audio?.speaker;
  const dialog = shot.audio?.dialog;
  const wordCount = shot.audio?.word_count || 0;

  // Get who's visible in shot
  const visibleCharacters = [];
  if (shot.subject_primary?.who) {
    const who = shot.subject_primary.who;
    if (Array.isArray(who)) visibleCharacters.push(...who);
    else if (typeof who === 'string') visibleCharacters.push(who.toLowerCase());
  }
  if (shot.subject_secondary?.who) {
    const who = shot.subject_secondary.who;
    if (Array.isArray(who)) visibleCharacters.push(...who);
    else if (typeof who === 'string') visibleCharacters.push(who.toLowerCase());
  }

  // Check if camera is moving
  const cameraMove = shot.camera?.movement?.toLowerCase() || 'static';
  const isMovingCamera = MOVING_CAMERA.some(m => cameraMove.includes(m));
  const needsEndFrame = shot.needs_end_frame || isMovingCamera;

  // Check if speaker is on screen
  const speakerLower = speaker?.toLowerCase() || '';
  const speakerOnScreen = visibleCharacters.some(c =>
    c.includes(speakerLower) || speakerLower.includes(c)
  );

  // Determine model
  let model = shot.model || 'kling-2.6';
  let reason = '';

  if (dialog && wordCount > 0 && speaker && speaker !== 'TV') {
    if (speakerOnScreen && !isMovingCamera) {
      // Speaker visible + static camera = Seedance for lip sync
      model = 'seedance-1.5';
      reason = `${speaker} ON SCREEN, static camera - lip sync`;
      seedanceCount++;
    } else if (speakerOnScreen && isMovingCamera) {
      // Speaker visible but camera moving = Kling O1 (can handle some movement)
      model = 'kling-o1';
      reason = `${speaker} ON SCREEN but camera moving (${cameraMove})`;
      klingO1Count++;
    } else {
      // Speaker off screen = Kling (voiceover, no lip sync)
      model = needsEndFrame ? 'kling-o1' : 'kling-2.6';
      reason = `${speaker} OFF SCREEN - voiceover`;
      klingCount++;
    }
  } else if (needsEndFrame) {
    model = 'kling-o1';
    reason = 'Camera movement needs start+end frame';
    klingO1Count++;
  } else {
    model = 'kling-2.6';
    reason = 'No dialogue or static shot';
    klingCount++;
  }

  shot.model = model;
  shot.model_reason = reason;
  shot.speaker_on_screen = speakerOnScreen;

  if (dialog && wordCount > 0) {
    console.log(`${shot.shot_id}: ${model} - ${reason}`);
    console.log(`  Dialog: "${dialog.substring(0, 40)}..." | Visible: ${visibleCharacters.join(', ')}`);
  }

  return shot;
});

// Save
fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

console.log('\n=== MODEL SUMMARY ===');
console.log(`Seedance 1.5 (lip sync): ${seedanceCount} shots`);
console.log(`Kling O1 (movement): ${klingO1Count} shots`);
console.log(`Kling 2.6 (voiceover/static): ${klingCount} shots`);
