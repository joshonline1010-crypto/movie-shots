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
      const characterFrames = {};
      const locationFrames = {};
      const propFrames = {};

      (scene.shots || []).forEach(shot => {
        const startFrame = shot.timing?.start_frame;
        if (!startFrame) return;

        const framePath = `/scenes/${sceneId}/analysis_3fps/frame_${String(startFrame).padStart(4, '0')}.jpg`;

        // Map characters to their first appearance
        const chars = extractCharacters(shot);
        chars.forEach(char => {
          const charLower = char.toLowerCase();
          if (!characterFrames[charLower]) {
            characterFrames[charLower] = {
              frame: framePath,
              shot_id: shot.shot_id,
              framing: shot.camera?.start_framing || 'MS'
            };
          }
        });

        // Map locations to representative frame
        const location = shot.environment?.location;
        if (location && !locationFrames[location]) {
          locationFrames[location] = {
            frame: framePath,
            shot_id: shot.shot_id,
            elements: shot.environment?.visible_elements || []
          };
        }

        // Map props to first appearance
        const props = shot.props?.items || [];
        props.forEach(prop => {
          if (!propFrames[prop]) {
            propFrames[prop] = {
              frame: framePath,
              shot_id: shot.shot_id,
              interaction: shot.props?.interaction
            };
          }
        });
      });

      // Build enhanced characters with screenshots
      const characters = {};
      Object.entries(scene.character_references || {}).forEach(([id, char]) => {
        characters[id] = {
          ...char,
          screenshot: characterFrames[id]?.frame || characterFrames[char.name?.toLowerCase()]?.frame || null,
          best_shot: characterFrames[id]?.shot_id || null
        };
      });

      // Read SET_PROMPTS.md and add location screenshots
      const sets = [];
      const setPromptsPath = path.join(ROOT, 'scenes', sceneId, 'SET_PROMPTS.md');
      if (fs.existsSync(setPromptsPath)) {
        const setContent = fs.readFileSync(setPromptsPath, 'utf8');
        const promptMatches = setContent.matchAll(/### \d+\. ([^\n]+)\n```\n([^`]+)```/g);
        for (const match of promptMatches) {
          const setName = match[1].trim();
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

      return sendJSON(res, { characters, sets, props, frames });
    }

    // Build execution plan
    if (action === 'build') {
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
            location: shot.environment?.location || shot.location,
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
