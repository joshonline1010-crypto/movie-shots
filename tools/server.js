const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const ROOT = path.join(__dirname, '..');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

function sendJSON(res, data) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, code, msg) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: msg }));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API Routes
  if (url.pathname === '/api/scenes') {
    const scenesDir = path.join(ROOT, 'scenes');
    const scenes = [];
    fs.readdirSync(scenesDir).forEach(file => {
      if (file.endsWith('.json') && !file.includes('_master')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(scenesDir, file)));
          scenes.push({
            scene_id: data.scene_id,
            name: data.name,
            description: data.description,
            shots: data.shots?.length || 0,
            duration: data.duration_estimate || data.extraction?.total_duration_sec,
            file: file
          });
        } catch (e) {}
      }
    });
    return sendJSON(res, { count: scenes.length, scenes });
  }

  if (url.pathname.startsWith('/api/scene/')) {
    const parts = url.pathname.split('/');
    const sceneId = parts[3];
    const action = parts[4];

    const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
    if (!fs.existsSync(scenePath)) {
      return sendError(res, 404, 'Scene not found');
    }

    const scene = JSON.parse(fs.readFileSync(scenePath));

    // Get assets for scene
    if (action === 'assets') {
      // Build character->frame mapping from shots
      // PRIORITIZE: Close-ups > Medium shots > Wide shots
      // PRIORITIZE: Primary subject > Secondary subject
      // PRIORITIZE: Solo shots > Group shots
      const characterFrames = {};
      const locationFrames = {};
      const propFrames = {};

      // Framing priority scores (higher = better for character reference)
      const FRAMING_SCORES = {
        'BCU': 100, 'ECU': 100,  // Big/Extreme close-up - best
        'CU': 90,                 // Close-up - great
        'MCU': 80,                // Medium close-up - good
        'MS': 60,                 // Medium shot - ok
        'MWS': 40,                // Medium wide - not great
        'WS': 20,                 // Wide shot - poor
        'EWS': 10,                // Extreme wide - worst
        'OTS': 50,                // Over the shoulder - ok if primary
        'POV': 5                  // POV - usually no character visible
      };

      (scene.shots || []).forEach(shot => {
        const startFrame = shot.timing?.start_frame;
        if (!startFrame) return;

        const framePath = `/scenes/${sceneId}/analysis_3fps/frame_${String(startFrame).padStart(4, '0')}.jpg`;
        const fullFraming = shot.camera?.start_framing?.toUpperCase() || 'MS';
        // Extract base framing (MS_GROUP -> MS, MS_ACTION -> MS)
        const baseFraming = fullFraming.split('_')[0];
        let framingScore = FRAMING_SCORES[baseFraming] || 50;

        // Penalize group shots - they're worse for character references
        if (fullFraming.includes('GROUP') || fullFraming.includes('TWO_SHOT')) {
          framingScore -= 15;
        }

        // Get primary and secondary characters
        const primaryChars = [];
        const secondaryChars = [];

        if (shot.subject_primary?.who) {
          const who = shot.subject_primary.who;
          if (Array.isArray(who)) primaryChars.push(...who);
          else if (typeof who === 'string') primaryChars.push(who);
        }
        if (shot.subject_secondary?.who) {
          const who = shot.subject_secondary.who;
          if (Array.isArray(who)) secondaryChars.push(...who);
          else if (typeof who === 'string') secondaryChars.push(who);
        }

        // Filter out non-characters
        const validPrimary = primaryChars.filter(c => c && !c.includes('_') && !c.includes('blur') && !c.includes('transition'));
        const validSecondary = secondaryChars.filter(c => c && !c.includes('blur') && !c.includes('transition'));

        // Score primary characters (bonus for being primary + solo)
        validPrimary.forEach(char => {
          const charLower = char.toLowerCase();
          let score = framingScore + 30; // +30 for being primary subject
          if (validPrimary.length === 1 && validSecondary.length === 0) {
            score += 20; // +20 for solo shot
          }

          if (!characterFrames[charLower] || score > characterFrames[charLower].score) {
            characterFrames[charLower] = {
              frame: framePath,
              shot_id: shot.shot_id,
              framing: fullFraming,
              score: score,
              is_primary: true,
              is_solo: validPrimary.length === 1 && validSecondary.length === 0
            };
          }
        });

        // Score secondary characters (no primary bonus)
        validSecondary.forEach(char => {
          const charLower = char.toLowerCase();
          let score = framingScore; // No bonus for secondary

          if (!characterFrames[charLower] || score > characterFrames[charLower].score) {
            characterFrames[charLower] = {
              frame: framePath,
              shot_id: shot.shot_id,
              framing: fullFraming,
              score: score,
              is_primary: false,
              is_solo: false
            };
          }
        });

        // Map locations to representative frame - prefer wide shots for sets
        const location = shot.environment?.location;
        if (location) {
          // Score for sets: prefer wide shots (WS, EWS, MWS)
          const SET_FRAMING_SCORES = {
            'EWS': 100, 'WS': 90, 'MWS': 80, 'MW': 70, 'MS': 50, 'MCU': 30, 'CU': 20, 'BCU': 10
          };
          const setScore = SET_FRAMING_SCORES[baseFraming] || 50;

          if (!locationFrames[location] || setScore > locationFrames[location].score) {
            locationFrames[location] = {
              frame: framePath,
              shot_id: shot.shot_id,
              elements: shot.environment?.visible_elements || [],
              framing: fullFraming,
              score: setScore
            };
          }
        }

        // Map props with scoring - prefer close-ups showing the prop
        const props = shot.props?.items || [];
        // Score for props: prefer close-ups where prop is visible
        const PROP_FRAMING_SCORES = {
          'ECU': 100, 'BCU': 95, 'CU': 90, 'MCU': 80, 'MS': 60, 'MWS': 40, 'WS': 20
        };
        const propScore = PROP_FRAMING_SCORES[baseFraming] || 50;
        // Bonus if there's prop interaction described
        const interactionBonus = shot.props?.interaction ? 20 : 0;

        props.forEach(prop => {
          const totalPropScore = propScore + interactionBonus;
          if (!propFrames[prop] || totalPropScore > propFrames[prop].score) {
            propFrames[prop] = {
              frame: framePath,
              shot_id: shot.shot_id,
              interaction: shot.props?.interaction,
              framing: fullFraming,
              score: totalPropScore
            };
          }
        });
      });

      // Build enhanced characters with screenshots
      const characters = {};
      Object.entries(scene.character_references || {}).forEach(([id, char]) => {
        const frameData = characterFrames[id] || characterFrames[char.name?.toLowerCase()];
        characters[id] = {
          ...char,
          screenshot: frameData?.frame || null,
          best_shot: frameData?.shot_id || null,
          shot_framing: frameData?.framing || null,
          is_solo_shot: frameData?.is_solo || false,
          selection_score: frameData?.score || 0
        };
      });

      // Read SET_PROMPTS.md and add location screenshots
      // Exclude vehicle interiors (these are props, not sets)
      const EXCLUDE_SETS = ['car interior', 'car_interior', 'jaguar', 'vehicle'];

      const sets = [];
      const setPromptsPath = path.join(ROOT, 'scenes', sceneId, 'SET_PROMPTS.md');
      if (fs.existsSync(setPromptsPath)) {
        const setContent = fs.readFileSync(setPromptsPath, 'utf8');
        const promptMatches = setContent.matchAll(/### \d+\. ([^\n]+)\n```\n([^`]+)```/g);
        for (const match of promptMatches) {
          const setName = match[1].trim();

          // Skip vehicle interiors (treat as props, not sets)
          if (EXCLUDE_SETS.some(ex => setName.toLowerCase().includes(ex))) continue;

          // Try to match location name to find screenshot
          const locationKey = Object.keys(locationFrames).find(k =>
            setName.toLowerCase().includes(k) || k.includes(setName.toLowerCase().split(' ')[0])
          );
          sets.push({
            name: setName,
            prompt: match[2].trim(),
            screenshot: locationFrames[locationKey]?.frame || null,
            elements: locationFrames[locationKey]?.elements || []
          });
        }
      }

      // Build props list with screenshots - filter and consolidate
      const PROP_GROUPS = {
        // Consolidate car-related items into "car"
        'car': ['car_door_handle', 'key', 'gas_pedal', 'red_car', 'red_megane', 'steering_wheel', 'car_key'],
        // Consolidate mugs
        'mug': ['tea_mug', 'mug', 'COOL_mug', 'cool_mug'],
        // Consolidate pints
        'pint_glass': ['pint_glass', 'lager', 'beer']
      };

      const EXCLUDE_PROPS = [
        'finger', 'thumb', 'hand', 'hands', 'foot', 'shoe', 'shoes', 'feet',  // Body parts
        'door', 'window', 'wall', 'floor', 'ceiling',  // Set elements
        'table', 'chair', 'couch', 'sofa',  // Furniture (set elements)
        'zombie', 'body'  // Characters
      ];

      // Consolidate props
      const consolidatedProps = {};
      Object.entries(propFrames).forEach(([name, data]) => {
        const nameLower = name.toLowerCase();

        // Skip excluded props
        if (EXCLUDE_PROPS.some(ex => nameLower.includes(ex))) return;

        // Check if this belongs to a group
        let groupName = null;
        for (const [group, members] of Object.entries(PROP_GROUPS)) {
          if (members.some(m => nameLower.includes(m.toLowerCase()) || m.toLowerCase().includes(nameLower))) {
            groupName = group;
            break;
          }
        }

        const finalName = groupName || name;
        if (!consolidatedProps[finalName]) {
          consolidatedProps[finalName] = {
            name: finalName,
            screenshot: data.frame,
            shot_id: data.shot_id,
            interaction: data.interaction,
            variants: [name]
          };
        } else {
          consolidatedProps[finalName].variants.push(name);
        }
      });

      const props = Object.values(consolidatedProps);

      // List frames in analysis_3fps folder
      const framesDir = path.join(ROOT, 'scenes', sceneId, 'analysis_3fps');
      let frames = [];
      if (fs.existsSync(framesDir)) {
        frames = fs.readdirSync(framesDir)
          .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
          .sort()
          .slice(0, 100) // First 100 frames
          .map(f => `/scenes/${sceneId}/analysis_3fps/${f}`);
      }

      // Include visual style for prompt building
      const visual_style = scene.visual_style || null;
      const camera_angles = scene.camera_angles || null;
      const video_motion_style = scene.video_motion_style || null;
      const prompt_settings = scene.prompt_settings || null;

      return sendJSON(res, {
        characters,
        sets,
        props,
        frames,
        visual_style,
        camera_angles,
        video_motion_style,
        prompt_settings,
        style_suffix: visual_style?.style_suffix || `${scene.aspect_ratio || '2.35:1'} cinematic`
      });
    }

    // Build execution plan
    if (action === 'build') {
      // INT/EXT detection based on location keywords
      const EXT_KEYWORDS = ['street', 'exterior', 'driveway', 'garden', 'outside', 'ext', 'outdoor', 'yard', 'parking', 'sidewalk', 'road', 'alley'];
      const INT_KEYWORDS = ['interior', 'int', 'inside', 'room', 'flat', 'apartment', 'house', 'pub', 'bar', 'kitchen', 'bedroom', 'bathroom', 'office', 'hall', 'corridor'];

      function detectIntExt(location) {
        if (!location) return 'INT'; // Default to interior
        const locLower = location.toLowerCase();
        if (EXT_KEYWORDS.some(kw => locLower.includes(kw))) return 'EXT';
        if (INT_KEYWORDS.some(kw => locLower.includes(kw))) return 'INT';
        return 'INT'; // Default
      }

      // Track last known location to carry forward
      let lastLocation = null;

      const plan = {
        scene_id: sceneId,
        total_shots: scene.shots?.length || 0,
        estimated_duration: scene.extraction?.total_duration_sec || scene.duration_estimate || 0,
        shots: (scene.shots || []).map((shot, i) => {
          // Determine model based on content
          let model = shot.model || 'kling-2.6';

          // Build inputs based on model
          const inputs = {};

          // Get frame paths
          const startFramePath = shot.start_frame ||
            (shot.timing ? `/scenes/${sceneId}/analysis_3fps/frame_${String(shot.timing.start_frame).padStart(4, '0')}.jpg` : null);
          const endFramePath = shot.end_frame ||
            (shot.timing?.end_frame ? `/scenes/${sceneId}/analysis_3fps/frame_${String(shot.timing.end_frame).padStart(4, '0')}.jpg` : null);

          if (model === 'seedance-1.5') {
            inputs.image_url = startFramePath;
            if (shot.needs_end_frame || shot.end_frame) {
              inputs.end_image_url = endFramePath;
            }
          } else if (model === 'kling-o1') {
            inputs.start_image_url = startFramePath;
            inputs.end_image_url = endFramePath;
          } else {
            inputs.image_url = startFramePath;
          }

          inputs.prompt = shot.motion_prompt;
          inputs.duration = shot.timing?.generation_duration_sec || shot.duration || 5;

          // Get location - inherit from previous shot if not specified
          let location = shot.environment?.location || shot.location;
          if (location) {
            lastLocation = location; // Update last known location
          } else {
            location = lastLocation; // Inherit from previous
          }

          return {
            shot_id: shot.shot_id,
            order: shot.order || i + 1,
            model: model,
            has_dialog: !!shot.audio?.dialog,
            dialog: shot.audio?.dialog || shot.dialog,
            duration: shot.timing?.actual_duration_sec || shot.duration || 2,
            transition_in: shot.transition_in || 'cut',
            transition_out: shot.transition_out || 'cut',
            chain_from_previous: shot.chain_from_previous || false,
            inputs: inputs,
            // Asset requirements
            characters_needed: extractCharacters(shot),
            location: location,
            int_ext: detectIntExt(location),
            props: shot.props?.items || []
          };
        })
      };
      return sendJSON(res, plan);
    }

    // Get dialogue/transcript info
    if (action === 'dialogue') {
      const dialogueInfo = {
        scene_id: sceneId,
        shots_with_dialogue: [],
        shots_unknown_dialogue: [],
        transcript_exists: false
      };

      // Check for whisper transcript
      const transcriptPath = path.join(ROOT, 'scenes', sceneId, 'whisper_transcript.json');
      dialogueInfo.transcript_exists = fs.existsSync(transcriptPath);

      // Analyze shots for dialogue status
      (scene.shots || []).forEach(shot => {
        const dialog = shot.audio?.dialog;
        const hasTimestamp = shot.audio?.dialog_start_time !== undefined;

        if (dialog && dialog.length > 0) {
          dialogueInfo.shots_with_dialogue.push({
            shot_id: shot.shot_id,
            speaker: shot.audio?.speaker || shot.subject_primary?.who,
            dialog: dialog,
            has_timestamp: hasTimestamp,
            start_time: shot.audio?.dialog_start_time,
            end_time: shot.audio?.dialog_end_time,
            start_frame: shot.timing?.start_frame,
            end_frame: shot.timing?.end_frame
          });
        } else if (shot.audio?.dialog === 'Unknown' || !shot.audio?.dialog) {
          const chars = extractCharacters(shot);
          if (chars.length > 0) {
            dialogueInfo.shots_unknown_dialogue.push({
              shot_id: shot.shot_id,
              characters: chars,
              start_frame: shot.timing?.start_frame,
              end_frame: shot.timing?.end_frame
            });
          }
        }
      });

      return sendJSON(res, dialogueInfo);
    }

    return sendJSON(res, scene);
  }

  // Static files - allow serving from scenes subfolders
  let filePath = url.pathname === '/' ? '/browser.html' : url.pathname;
  filePath = path.join(ROOT, filePath);

  // Handle URL-encoded paths
  filePath = decodeURIComponent(filePath);

  if (!fs.existsSync(filePath)) {
    return sendError(res, 404, 'File not found: ' + url.pathname);
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return sendError(res, 404, 'Cannot serve directory');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) return sendError(res, 500, 'Server error');
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

// Helper to extract character names from shot
function extractCharacters(shot) {
  const chars = [];
  if (shot.subject_primary?.who) {
    const who = shot.subject_primary.who;
    if (Array.isArray(who)) {
      chars.push(...who);
    } else if (typeof who === 'string' && !who.includes('_') && !who.includes('blur')) {
      chars.push(who);
    }
  }
  if (shot.subject_secondary?.who) {
    const who = shot.subject_secondary.who;
    if (Array.isArray(who)) {
      chars.push(...who);
    } else if (typeof who === 'string') {
      chars.push(who);
    }
  }
  return chars.filter(c => c && !c.includes('transition') && !c.includes('blur'));
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/browser.html`);
});
