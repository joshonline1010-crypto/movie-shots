/**
 * Movie Shots Browser Server with API
 * Run: node server.js
 * Open: http://localhost:3333
 *
 * API Endpoints:
 *   GET /api/shots              - All shots (with optional query filters)
 *   GET /api/shot/:id           - Single shot by ID
 *   GET /api/prompt/:id         - Generate complete prompt for a shot
 *   GET /api/filters            - Get all available filter options
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3333;
const BASE_DIR = __dirname;

// Cache the index data
let indexData = null;

function loadIndex() {
  try {
    const indexPath = path.join(BASE_DIR, 'index.json');
    if (fs.existsSync(indexPath)) {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      console.log(`Loaded ${indexData.count} shots from index`);
    }
  } catch (err) {
    console.error('Failed to load index:', err.message);
  }
}

// Generate complete prompt for a shot (same logic as browser.html)
function generatePrompt(shot) {
  const promptParts = [];

  // 1. Subject + Placement - Smart type detection
  const subjectType = shot.subjectType || 'character';
  const subjectDesc = shot.subjectDescription || 'subject';

  let subjectStr = '';
  if (subjectType === 'character') {
    subjectStr = `[CHARACTER: ${subjectDesc}]`;
  } else if (subjectType === 'object' || subjectType === 'vehicle') {
    subjectStr = `[OBJECT: ${subjectDesc}]`;
  } else if (subjectType === 'animal') {
    subjectStr = `[ANIMAL: ${subjectDesc}]`;
  } else if (subjectType === 'scene' || subjectType === 'background') {
    subjectStr = `[SCENE: ${subjectDesc}]`;
  } else {
    subjectStr = `[${subjectType.toUpperCase()}: ${subjectDesc}]`;
  }

  if (shot.subjectPlacement) {
    subjectStr += ` positioned ${shot.subjectPlacement}`;
  }
  if (shot.eyeDirection && shot.eyeDirection !== 'at-camera') {
    subjectStr += ` looking ${shot.eyeDirection}`;
  }
  promptParts.push(subjectStr);

  // 2. Environment/Location + Time + Weather
  let envStr = '';
  if (shot.location) {
    envStr = `in ${shot.location}`;
  } else if (shot.environment) {
    envStr = `in ${shot.environment} setting`;
  }
  if (shot.timeOfDay) {
    envStr += ` at ${shot.timeOfDay}`;
  }
  if (shot.weather && shot.weather !== 'clear') {
    envStr += ` with ${shot.weather}`;
  }
  if (envStr) promptParts.push(envStr);

  // 3. Mood/Emotion
  if (shot.emotion) {
    promptParts.push(`${shot.emotion} mood${shot.emotionIntensity ? ` (${shot.emotionIntensity})` : ''}`);
  }

  // 4. 3D Camera View
  if (shot.camera3d && shot.camera3d.description) {
    promptParts.push(shot.camera3d.description);
  }

  // 5. Framing Rule
  if (shot.framing) {
    promptParts.push(`${shot.framing} composition`);
  }

  // 6. Shot Type + Lens + Depth of Field
  let cameraStr = '';
  if (shot.shot) cameraStr += `${shot.shot} shot`;
  if (shot.lens) cameraStr += ` ${shot.lens}`;
  if (shot.depth) cameraStr += ` ${shot.depth}`;
  if (cameraStr) promptParts.push(cameraStr.trim());

  // 7. Camera Movement
  if (shot.movement && shot.movement !== 'static') {
    promptParts.push(`${shot.movement} camera`);
  }

  // 8. Lighting SOURCE
  const lightingSourceMap = {
    'natural': 'natural daylight streaming from window on left',
    'three-point': 'key light from front-left with soft fill from right',
    'rembrandt': 'single key light from 45° left creating triangle shadow on cheek',
    'silhouette': 'strong backlight from behind, subject in silhouette',
    'neon': 'neon signs casting pink and blue glow from sides',
    'harsh-sun': 'harsh midday sun from directly above casting sharp shadows',
    'candlelight': 'warm flickering candlelight from below-left',
    'moonlight': 'cool blue moonlight from above-right',
    'volumetric': 'god rays streaming through dusty atmosphere from behind',
    'spotlight': 'single hard spotlight from directly above',
    'film-noir': 'venetian blind shadows with single hard key from side',
    'rim-light': 'strong rim light from behind outlining subject',
    'golden-hour': 'warm golden sunset light from low left angle',
    'fireplace': 'warm orange fireplace glow from lower left',
    'fluorescent': 'cold overhead fluorescent tubes casting flat even light'
  };

  if (shot.lightingSource) {
    promptParts.push(shot.lightingSource);
  } else if (shot.lighting) {
    promptParts.push(lightingSourceMap[shot.lighting] || `${shot.lighting} lighting`);
  }

  // 9. Color Grade/Palette
  if (shot.colorPalette) {
    promptParts.push(`${shot.colorPalette} color grade`);
  } else if (shot.lightingColor) {
    promptParts.push(`${shot.lightingColor} tones`);
  }

  // 10. Aspect Ratio
  if (shot.aspectRatio && shot.aspectRatio !== '16:9') {
    promptParts.push(`${shot.aspectRatio} aspect ratio`);
  }

  return promptParts.join(', ');
}

// Handle API requests
function handleAPI(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query || {};

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (!indexData) {
    res.writeHead(503);
    res.end(JSON.stringify({ error: 'Index not loaded. Run: node tools/build-index.js' }));
    return;
  }

  // GET /api/shots - Return all or filtered shots
  if (pathname === '/api/shots') {
    let shots = indexData.shots;

    // Apply filters from query params
    if (query.director) {
      shots = shots.filter(s => s.director === query.director);
    }
    if (query.emotion) {
      shots = shots.filter(s => s.emotion === query.emotion);
    }
    if (query.lighting) {
      shots = shots.filter(s => s.lighting === query.lighting);
    }
    if (query.shot) {
      shots = shots.filter(s => s.shot === query.shot);
    }
    if (query.lens) {
      shots = shots.filter(s => s.lens === query.lens);
    }
    if (query.film) {
      shots = shots.filter(s => s.film && s.film.toLowerCase().includes(query.film.toLowerCase()));
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      shots = shots.filter(s => {
        const searchable = [s.film, s.director, s.emotion, s.lighting, s.shot, s.location, ...(s.tags || [])].join(' ').toLowerCase();
        return searchable.includes(search);
      });
    }

    // Limit results
    const limit = parseInt(query.limit) || 100;
    shots = shots.slice(0, limit);

    res.writeHead(200);
    res.end(JSON.stringify({
      count: shots.length,
      shots: shots
    }));
    return;
  }

  // GET /api/shot/:id - Return single shot by ID
  const shotMatch = pathname.match(/^\/api\/shot\/(.+)$/);
  if (shotMatch) {
    const id = decodeURIComponent(shotMatch[1]);
    const shot = indexData.shots.find(s => s.id === id);

    if (!shot) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Shot not found' }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(shot));
    return;
  }

  // GET /api/prompt/:id - Generate complete prompt for a shot
  const promptMatch = pathname.match(/^\/api\/prompt\/(.+)$/);
  if (promptMatch) {
    const id = decodeURIComponent(promptMatch[1]);
    const shot = indexData.shots.find(s => s.id === id);

    if (!shot) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Shot not found' }));
      return;
    }

    const prompt = generatePrompt(shot);
    const imageUrl = `http://localhost:${PORT}/${shot.image}`;

    res.writeHead(200);
    res.end(JSON.stringify({
      id: shot.id,
      film: shot.film,
      prompt: prompt,
      referenceImage: imageUrl,
      shot: shot
    }));
    return;
  }

  // GET /api/filters - Get all available filter options
  if (pathname === '/api/filters') {
    res.writeHead(200);
    res.end(JSON.stringify(indexData.filters));
    return;
  }

  // Unknown API endpoint
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Unknown API endpoint' }));
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle API routes
  if (parsedUrl.pathname.startsWith('/api/')) {
    handleAPI(req, res, parsedUrl);
    return;
  }

  let filePath = req.url === '/' ? '/browser.html' : decodeURIComponent(parsedUrl.pathname);
  filePath = path.join(BASE_DIR, filePath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(BASE_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Load index on startup
loadIndex();

server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║         MOVIE SHOTS BROWSER           ║
  ╠═══════════════════════════════════════╣
  ║                                       ║
  ║   Server running at:                  ║
  ║   http://localhost:${PORT}                ║
  ║                                       ║
  ║   API Endpoints:                      ║
  ║   /api/shots       - Get all shots    ║
  ║   /api/shot/:id    - Get single shot  ║
  ║   /api/prompt/:id  - Get prompt       ║
  ║   /api/filters     - Get filter opts  ║
  ║                                       ║
  ║   Press Ctrl+C to stop                ║
  ║                                       ║
  ╚═══════════════════════════════════════╝
  `);
});
