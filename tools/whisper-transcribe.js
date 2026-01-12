/**
 * Whisper Transcription Tool
 * Transcribes audio/video and maps dialogue to frame numbers
 *
 * Usage:
 *   node whisper-transcribe.js <scene_id> <audio_or_video_path>
 *
 * Example:
 *   node whisper-transcribe.js shaun_the_plan ../scenes/shaun_the_plan/source.mp4
 *
 * Requires:
 *   - OPENAI_API_KEY environment variable
 *   - ffmpeg for audio extraction
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ROOT = path.join(__dirname, '..');
const FPS = 3; // Frame extraction rate
const FRAME_DURATION = 1 / FPS; // 0.333 seconds per frame

async function extractAudio(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${videoPath}" -vn -acodec pcm_s16le -ar 16000 -ac 1 "${outputPath}" -y`;
    console.log('Extracting audio...');
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(outputPath);
    });
  });
}

async function transcribeWithWhisper(audioPath) {
  const FormData = require('form-data');
  const fetch = require('node-fetch');

  const form = new FormData();
  form.append('file', fs.createReadStream(audioPath));
  form.append('model', 'whisper-1');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');

  console.log('Transcribing with Whisper...');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      ...form.getHeaders()
    },
    body: form
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function timestampToFrame(timestamp) {
  // Convert seconds to frame number (1-indexed)
  return Math.floor(timestamp / FRAME_DURATION) + 1;
}

function mapTranscriptToShots(transcript, shots) {
  const words = transcript.words || [];

  // Group words into segments by shot boundaries
  const shotDialogues = {};

  words.forEach(word => {
    const startFrame = timestampToFrame(word.start);
    const endFrame = timestampToFrame(word.end);

    // Find which shot this word belongs to
    const shot = shots.find(s => {
      const shotStart = s.timing?.start_frame || 0;
      const shotEnd = s.timing?.end_frame || 0;
      return startFrame >= shotStart && startFrame <= shotEnd;
    });

    if (shot) {
      if (!shotDialogues[shot.shot_id]) {
        shotDialogues[shot.shot_id] = {
          words: [],
          text: '',
          start_time: word.start,
          end_time: word.end,
          start_frame: startFrame,
          end_frame: endFrame
        };
      }
      shotDialogues[shot.shot_id].words.push({
        word: word.word,
        start: word.start,
        end: word.end,
        start_frame: startFrame,
        end_frame: endFrame
      });
      shotDialogues[shot.shot_id].text += word.word + ' ';
      shotDialogues[shot.shot_id].end_time = word.end;
      shotDialogues[shot.shot_id].end_frame = endFrame;
    }
  });

  return shotDialogues;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node whisper-transcribe.js <scene_id> <audio_or_video_path>');
    console.log('');
    console.log('Example:');
    console.log('  node whisper-transcribe.js shaun_the_plan ../scenes/shaun_the_plan/source.mp4');
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error('Error: OPENAI_API_KEY environment variable not set');
    console.log('Set it with: set OPENAI_API_KEY=your-key-here');
    process.exit(1);
  }

  const sceneId = args[0];
  const inputPath = path.resolve(args[1]);

  // Load scene JSON
  const scenePath = path.join(ROOT, 'scenes', `${sceneId}.json`);
  if (!fs.existsSync(scenePath)) {
    console.error(`Scene not found: ${scenePath}`);
    process.exit(1);
  }

  const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));
  console.log(`Loaded scene: ${scene.name} (${scene.shots?.length || 0} shots)`);

  // Check input file
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Extract audio if video file
  let audioPath = inputPath;
  const ext = path.extname(inputPath).toLowerCase();
  if (['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext)) {
    const tempAudio = path.join(ROOT, 'scenes', sceneId, 'audio_temp.wav');
    audioPath = await extractAudio(inputPath, tempAudio);
  }

  // Transcribe with Whisper
  const transcript = await transcribeWithWhisper(audioPath);

  // Save raw transcript
  const transcriptPath = path.join(ROOT, 'scenes', sceneId, 'whisper_transcript.json');
  fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));
  console.log(`Saved transcript to: ${transcriptPath}`);

  // Map dialogue to shots
  const shotDialogues = mapTranscriptToShots(transcript, scene.shots || []);

  // Update scene JSON with accurate dialogue
  let updatedCount = 0;
  scene.shots = scene.shots.map(shot => {
    if (shotDialogues[shot.shot_id]) {
      const dialogue = shotDialogues[shot.shot_id];
      shot.audio = {
        ...shot.audio,
        dialog: dialogue.text.trim(),
        dialog_start_time: dialogue.start_time,
        dialog_end_time: dialogue.end_time,
        dialog_start_frame: dialogue.start_frame,
        dialog_end_frame: dialogue.end_frame,
        words: dialogue.words,
        source: 'whisper'
      };
      updatedCount++;
    }
    return shot;
  });

  // Save updated scene
  fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
  console.log(`Updated ${updatedCount} shots with dialogue timestamps`);

  // Generate summary
  console.log('\n=== DIALOGUE SUMMARY ===');
  Object.entries(shotDialogues).forEach(([shotId, data]) => {
    console.log(`\n${shotId} (frames ${data.start_frame}-${data.end_frame}):`);
    console.log(`  "${data.text.trim()}"`);
    console.log(`  Time: ${data.start_time.toFixed(2)}s - ${data.end_time.toFixed(2)}s`);
  });

  console.log('\n✓ Transcription complete!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
