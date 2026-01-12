/**
 * Mark shots that should chain (use last frame of previous shot as reference)
 *
 * Chained shots are where:
 * - Same location as previous shot
 * - Same or overlapping characters
 * - No major transition (whip_pan, hard cut to different scene)
 * - Continuous action flow
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sceneId = 'shaun_the_plan';

const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// Transitions that break chains
const BREAK_TRANSITIONS = ['whip_pan', 'wipe', 'dissolve', 'fade'];

// Extract characters from shot
function getCharacters(shot) {
  const chars = [];
  if (shot.subject_primary?.who) {
    const who = shot.subject_primary.who;
    if (Array.isArray(who)) chars.push(...who);
    else if (typeof who === 'string') chars.push(who.toLowerCase());
  }
  if (shot.subject_secondary?.who) {
    const who = shot.subject_secondary.who;
    if (Array.isArray(who)) chars.push(...who);
    else if (typeof who === 'string') chars.push(who.toLowerCase());
  }
  return chars.filter(c => c && !c.includes('transition') && !c.includes('blur') && !c.includes('_'));
}

let chainCount = 0;

scene.shots = scene.shots.map((shot, i) => {
  // First shot can't chain
  if (i === 0) {
    shot.chain_from_previous = false;
    return shot;
  }

  const prevShot = scene.shots[i - 1];

  // Get locations
  const currLocation = shot.environment?.location?.toLowerCase() || '';
  const prevLocation = prevShot.environment?.location?.toLowerCase() || '';

  // Get characters
  const currChars = getCharacters(shot);
  const prevChars = getCharacters(prevShot);

  // Check for overlapping characters
  const hasOverlappingChars = currChars.some(c =>
    prevChars.some(p => c.includes(p) || p.includes(c))
  );

  // Check transitions
  const prevTransitionOut = prevShot.transition_out?.toLowerCase() || 'cut';
  const currTransitionIn = shot.transition_in?.toLowerCase() || 'cut';
  const hasBreakingTransition = BREAK_TRANSITIONS.some(t =>
    prevTransitionOut.includes(t) || currTransitionIn.includes(t)
  );

  // Check if same speaker continuing (dialogue continuity)
  const currSpeaker = shot.audio?.speaker?.toLowerCase() || '';
  const prevSpeaker = prevShot.audio?.speaker?.toLowerCase() || '';
  const sameSpeaker = currSpeaker && prevSpeaker && currSpeaker === prevSpeaker;

  // Check frame continuity (shots within 5 frames of each other)
  const frameGap = (shot.timing?.start_frame || 0) - (prevShot.timing?.end_frame || 0);
  const framesAreClose = frameGap <= 2;

  // Determine if should chain:
  // 1. Same location + overlapping characters + no breaking transition
  // 2. OR same speaker continuing + frames close together
  // 3. OR frames are directly adjacent (no gap)
  const sameLocation = currLocation && prevLocation && currLocation === prevLocation;
  const shouldChain = (
    (sameLocation && hasOverlappingChars && !hasBreakingTransition) ||
    (sameSpeaker && framesAreClose && !hasBreakingTransition) ||
    (frameGap <= 1 && !hasBreakingTransition)
  );

  shot.chain_from_previous = shouldChain;

  if (shouldChain) {
    chainCount++;
    // Set the start frame to use previous shot's end frame
    shot.chain_ref = {
      from_shot: prevShot.shot_id,
      use_frame: prevShot.timing?.end_frame
    };
    console.log(`${shot.shot_id} ⛓ chains from ${prevShot.shot_id} (${currLocation}, ${currChars.join('+')})`);
  }

  return shot;
});

// Save
fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));

console.log(`\n=== CHAIN SUMMARY ===`);
console.log(`${chainCount} shots chained`);
console.log(`${scene.shots.length - chainCount} shots standalone`);
