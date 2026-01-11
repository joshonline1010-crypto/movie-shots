/**
 * Scene Builder - Converts scene definitions into executable video pipeline
 *
 * Usage:
 *   node scene-builder.js --scene scene.json --output execution-plan.json
 *   node scene-builder.js --scene scene.json --execute  (runs via n8n)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_DIR = path.join(__dirname, '..');
const INDEX_PATH = path.join(BASE_DIR, 'index.json');
const SCHEMA_PATH = path.join(BASE_DIR, 'SCENE_SCHEMA.json');

// Load index and schema
let shotIndex = null;
let sceneSchema = null;

function loadData() {
  try {
    if (fs.existsSync(INDEX_PATH)) {
      shotIndex = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
      console.log(`Loaded ${shotIndex.count} reference shots`);
    }
    if (fs.existsSync(SCHEMA_PATH)) {
      sceneSchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load data:', err.message);
  }
}

// Model selection logic
function selectModel(shot) {
  // If model is explicitly set and not 'auto', use it
  if (shot.model && shot.model !== 'auto') {
    return shot.model;
  }

  // Auto-select based on shot requirements
  const hasDialog = !!shot.dialog;
  const hasEndFrame = !!shot.end_frame;
  const hasCameraMove = shot.motion_prompt &&
    /dolly|orbit|zoom|push|pull|pan|tilt|track|crane/i.test(shot.motion_prompt);

  // Rule 1: Dialog = Seedance (lip sync)
  if (hasDialog) {
    return 'seedance-1.5';
  }

  // Rule 2: End frame + camera move = Kling O1
  if (hasEndFrame && hasCameraMove) {
    return 'kling-o1';
  }

  // Rule 3: End frame (state change) = Kling O1
  if (hasEndFrame) {
    return 'kling-o1';
  }

  // Rule 4: Default = Kling 2.6
  return 'kling-2.6';
}

// Get model parameters
function getModelParams(modelName) {
  const params = {
    'seedance-1.5': {
      endpoint: 'fal-ai/seedance-1.5',
      imageParam: 'image_url',
      endImageParam: 'end_image_url',
      supportsDialog: true,
      maxDuration: 5
    },
    'kling-o1': {
      endpoint: 'fal-ai/kling-video/o1',
      imageParam: 'start_image_url',
      endImageParam: 'tail_image_url',
      supportsDialog: false,
      maxDuration: 10
    },
    'kling-2.6': {
      endpoint: 'fal-ai/kling-video/v2.6',
      imageParam: 'image_url',
      endImageParam: null,
      supportsDialog: false,
      maxDuration: 10
    }
  };
  return params[modelName] || params['kling-2.6'];
}

// Look up reference shot from index
function getReferenceShotData(shotId) {
  if (!shotIndex || !shotId) return null;
  return shotIndex.shots.find(s => s.id === shotId);
}

// Generate prompt for a shot based on reference + scene context
function generateShotPrompt(shot, referenceData, sceneContext) {
  const parts = [];

  // If we have reference data, use its rich prompt
  if (referenceData) {
    // Subject with costume
    const subjectType = referenceData.subjectType || 'character';
    let subjectDesc = referenceData.subjectDescription || 'subject';

    if (referenceData.costume?.keyPieces?.length) {
      subjectDesc += ` wearing ${referenceData.costume.keyPieces.join(', ')}`;
    }

    if (subjectType === 'character') {
      parts.push(`[CHARACTER: ${subjectDesc}]`);
    } else {
      parts.push(`[${subjectType.toUpperCase()}: ${subjectDesc}]`);
    }

    // Pose
    if (referenceData.characterPose?.posture) {
      parts.push(referenceData.characterPose.posture);
    }

    // Placement
    if (referenceData.subjectPlacement) {
      parts.push(`positioned ${referenceData.subjectPlacement}`);
    }

    // Environment
    if (referenceData.location) {
      parts.push(`in ${referenceData.location}`);
    } else if (sceneContext.location) {
      parts.push(`in ${sceneContext.location}`);
    }

    // Time of day
    const timeOfDay = referenceData.timeOfDay || sceneContext.time_of_day;
    if (timeOfDay) {
      parts.push(`at ${timeOfDay}`);
    }

    // Mood
    const mood = referenceData.emotion || sceneContext.mood;
    if (mood) {
      parts.push(`${mood} mood`);
    }

    // 3D Camera
    if (referenceData.camera3d?.description) {
      parts.push(referenceData.camera3d.description);
    }

    // Shot type + lens
    if (referenceData.shot) {
      let cameraStr = `${referenceData.shot} shot`;
      if (referenceData.lens) cameraStr += ` ${referenceData.lens}`;
      if (referenceData.depth) cameraStr += ` ${referenceData.depth}`;
      parts.push(cameraStr);
    }

    // Lighting
    if (referenceData.lightingSource) {
      parts.push(referenceData.lightingSource);
    } else if (referenceData.lighting) {
      parts.push(`${referenceData.lighting} lighting`);
    }

    // Color
    if (referenceData.colorPalette) {
      parts.push(`${referenceData.colorPalette} color grade`);
    }
  }

  return parts.join(', ');
}

// Generate motion prompt for video model
function generateMotionPrompt(shot) {
  const parts = [];

  if (shot.motion_prompt) {
    parts.push(shot.motion_prompt);
  }

  // Ensure motion has endpoints (prevents processing hang)
  if (parts.length > 0 && !/, then/.test(parts[0])) {
    parts.push('then settles');
  }

  return parts.join(', ') || 'subtle movement, then holds';
}

// Build execution plan for a scene
function buildExecutionPlan(scene) {
  const plan = {
    scene_id: scene.scene_id,
    scene_name: scene.name,
    description: scene.description,
    total_shots: scene.shots.length,
    estimated_duration: 0,
    generated_at: new Date().toISOString(),
    shots: [],
    post_processing: {
      concat_videos: true,
      add_transitions: true,
      add_music: !!scene.music_cue,
      music_file: scene.music_cue || null
    }
  };

  let previousEndFrame = null;

  for (const shot of scene.shots) {
    // Get reference shot data if specified
    const refData = getReferenceShotData(shot.reference_shot);

    // Select model
    const selectedModel = selectModel(shot);
    const modelParams = getModelParams(selectedModel);

    // Determine start frame
    let startFrame = shot.start_frame;
    if (!startFrame && previousEndFrame) {
      // Chain from previous shot's end frame
      startFrame = previousEndFrame;
    } else if (!startFrame && refData) {
      // Use reference shot image
      startFrame = `http://localhost:3333/${refData.image}`;
    }

    // Generate prompts
    const imagePrompt = generateShotPrompt(shot, refData, scene);
    const motionPrompt = generateMotionPrompt(shot);

    // Build execution step
    const executionStep = {
      shot_id: shot.shot_id,
      order: shot.order,
      model: selectedModel,
      model_reason: getModelReason(shot, selectedModel),
      endpoint: modelParams.endpoint,
      duration: Math.min(shot.duration || 5, modelParams.maxDuration),

      // Input parameters
      inputs: {
        [modelParams.imageParam]: startFrame,
        prompt: motionPrompt,
        duration: String(shot.duration || 5)
      },

      // Reference data
      reference_shot: shot.reference_shot,
      image_prompt: imagePrompt,

      // Dialog handling
      has_dialog: !!shot.dialog,
      dialog: shot.dialog || null,
      dialog_voice: shot.dialog_voice || null,
      tts_required: !!shot.dialog,

      // Transitions
      transition_in: shot.transition_in || 'cut',
      transition_out: shot.transition_out || 'cut',

      // Narrative
      narrative_beat: shot.narrative_beat || null,

      // Frame chaining
      chain_from_previous: !shot.start_frame && !!previousEndFrame,
      extract_last_frame: true
    };

    // Add end frame if specified
    if (shot.end_frame && modelParams.endImageParam) {
      executionStep.inputs[modelParams.endImageParam] = shot.end_frame;
    }

    plan.shots.push(executionStep);
    plan.estimated_duration += executionStep.duration;

    // Track for next shot chaining
    previousEndFrame = shot.end_frame || `{output_${shot.shot_id}_last_frame}`;
  }

  return plan;
}

// Get reason for model selection
function getModelReason(shot, model) {
  if (shot.model && shot.model !== 'auto') {
    return 'Explicitly specified';
  }
  if (shot.dialog) {
    return 'Has dialog - Seedance for lip sync';
  }
  if (shot.end_frame) {
    return 'Has end frame - Kling O1 for transitions';
  }
  return 'Default motion - Kling 2.6';
}

// Generate n8n webhook payload
function generateN8nPayload(plan) {
  return {
    scene_id: plan.scene_id,
    scene_name: plan.scene_name,
    shots: plan.shots.map(shot => ({
      shot_id: shot.shot_id,
      model: shot.model,
      endpoint: shot.endpoint,
      inputs: shot.inputs,
      duration: shot.duration,
      tts: shot.has_dialog ? {
        text: shot.dialog,
        voice: shot.dialog_voice
      } : null,
      transition_out: shot.transition_out
    })),
    post_processing: plan.post_processing
  };
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scene' && args[i + 1]) {
      options.sceneFile = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      options.outputFile = args[++i];
    } else if (args[i] === '--execute') {
      options.execute = true;
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Main
async function main() {
  const options = parseArgs();

  if (!options.sceneFile) {
    console.log(`
Scene Builder - Convert scene definitions to executable video pipeline

Usage:
  node scene-builder.js --scene scene.json                    Build execution plan
  node scene-builder.js --scene scene.json --output plan.json Save plan to file
  node scene-builder.js --scene scene.json --execute          Execute via n8n
  node scene-builder.js --scene scene.json --dry-run          Preview without executing

Example scene.json:
{
  "scene_id": "test_scene",
  "name": "Test Scene",
  "shots": [
    {
      "shot_id": "shot_1",
      "order": 1,
      "reference_shot": "blade-runner-2049_shot-001",
      "motion_prompt": "slow dolly in",
      "duration": 5
    }
  ]
}
`);
    return;
  }

  // Load data
  loadData();

  // Load scene file
  let scene;
  try {
    const scenePath = path.resolve(options.sceneFile);
    scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
    console.log(`Loaded scene: ${scene.name}`);
  } catch (err) {
    console.error('Failed to load scene file:', err.message);
    return;
  }

  // Build execution plan
  console.log('Building execution plan...');
  const plan = buildExecutionPlan(scene);

  // Display plan
  console.log(`\n=== EXECUTION PLAN ===`);
  console.log(`Scene: ${plan.scene_name}`);
  console.log(`Shots: ${plan.total_shots}`);
  console.log(`Est. Duration: ${plan.estimated_duration}s`);
  console.log(`\nShot Breakdown:`);

  for (const shot of plan.shots) {
    console.log(`  ${shot.order}. ${shot.shot_id}`);
    console.log(`     Model: ${shot.model} (${shot.model_reason})`);
    console.log(`     Duration: ${shot.duration}s`);
    if (shot.has_dialog) {
      console.log(`     Dialog: "${shot.dialog}"`);
    }
    if (shot.chain_from_previous) {
      console.log(`     Chained from previous shot`);
    }
    console.log('');
  }

  // Save to file
  if (options.outputFile) {
    const outputPath = path.resolve(options.outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(plan, null, 2));
    console.log(`Saved execution plan to: ${outputPath}`);
  }

  // Execute via n8n
  if (options.execute && !options.dryRun) {
    console.log('\nExecuting via n8n...');
    const payload = generateN8nPayload(plan);
    // Would call n8n webhook here
    console.log('n8n payload:', JSON.stringify(payload, null, 2));
  }

  return plan;
}

// Export for API use
module.exports = {
  loadData,
  buildExecutionPlan,
  selectModel,
  generateShotPrompt,
  generateMotionPrompt,
  generateN8nPayload
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
