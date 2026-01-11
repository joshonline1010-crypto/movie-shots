/**
 * Movie Shot Organizer
 *
 * Organizes tagged screenshots into folder structure based on tags
 * Creates symlinks/copies in appropriate by-* folders
 *
 * Usage:
 *   node organizer.js --source ./_source/film-grab/
 *   node organizer.js --source ./_source/film-grab/blade-runner-2049/
 *   node organizer.js --mode symlink   (default, saves space)
 *   node organizer.js --mode copy      (duplicate files)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  baseDir: path.join(__dirname, '..'),
  sourceDir: path.join(__dirname, '..', '_source', 'film-grab'),
  mode: 'symlink'  // 'symlink' or 'copy'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source' && args[i + 1]) {
      options.source = args[++i];
    } else if (args[i] === '--mode' && args[i + 1]) {
      options.mode = args[++i];
    } else if (args[i] === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

// Create link or copy
function createLink(source, target, mode, dryRun = false) {
  if (dryRun) {
    console.log(`  [DRY] ${mode}: ${path.basename(target)}`);
    return;
  }

  // Ensure target directory exists
  const targetDir = path.dirname(target);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Skip if target already exists
  if (fs.existsSync(target)) {
    return;
  }

  try {
    if (mode === 'symlink') {
      fs.symlinkSync(source, target);
    } else {
      fs.copyFileSync(source, target);
    }
  } catch (err) {
    console.log(`  Error: ${err.message}`);
  }
}

// Get target paths for a tagged image
function getTargetPaths(imagePath, tagData) {
  const targets = [];
  const filename = path.basename(imagePath);

  // By Genre
  if (tagData.genre && Array.isArray(tagData.genre)) {
    tagData.genre.forEach(genre => {
      targets.push(path.join(CONFIG.baseDir, 'by-genre', genre, filename));
    });
  } else if (tagData.film?.genre) {
    tagData.film.genre.forEach(genre => {
      targets.push(path.join(CONFIG.baseDir, 'by-genre', genre, filename));
    });
  }

  // By Emotion
  if (tagData.emotion?.primary) {
    let emotionPath = tagData.emotion.primary;
    if (tagData.emotion.intensity) {
      emotionPath = path.join(emotionPath, tagData.emotion.intensity);
    }
    targets.push(path.join(CONFIG.baseDir, 'by-emotion', emotionPath, filename));
  }

  // By Shot Type
  if (tagData.shot?.type) {
    targets.push(path.join(CONFIG.baseDir, 'by-shot-type', tagData.shot.type, filename));
  }

  // By Camera Angle
  if (tagData.shot?.angle) {
    targets.push(path.join(CONFIG.baseDir, 'by-camera-angle', tagData.shot.angle, filename));
  }

  // By Camera Movement
  if (tagData.shot?.movement) {
    targets.push(path.join(CONFIG.baseDir, 'by-camera-movement', tagData.shot.movement, filename));
  }

  // By Lighting
  if (tagData.lighting?.type) {
    targets.push(path.join(CONFIG.baseDir, 'by-lighting', tagData.lighting.type, filename));
  }

  // By Environment
  if (tagData.environment?.type) {
    targets.push(path.join(CONFIG.baseDir, 'by-environment', tagData.environment.type, filename));
  }

  // By Director (from director_style or film.director)
  let director = tagData.director_style || tagData.film?.director;
  if (director) {
    // Slugify director name
    const directorSlug = director.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    targets.push(path.join(CONFIG.baseDir, 'by-director', directorSlug, filename));
  }

  // By Decade
  if (tagData.decade) {
    targets.push(path.join(CONFIG.baseDir, 'by-decade', tagData.decade, filename));
  } else if (tagData.film?.year) {
    const decade = Math.floor(tagData.film.year / 10) * 10 + 's';
    targets.push(path.join(CONFIG.baseDir, 'by-decade', decade, filename));
  }

  return targets;
}

// Process a single image with its tag file
function processImage(imagePath, options) {
  const ext = path.extname(imagePath);
  const tagFile = imagePath.replace(ext, '.txt');

  // Skip if no tag file
  if (!fs.existsSync(tagFile)) {
    console.log(`  Skipping (no tags): ${path.basename(imagePath)}`);
    return { processed: false, links: 0 };
  }

  let tagData;
  try {
    tagData = JSON.parse(fs.readFileSync(tagFile, 'utf8'));
  } catch (err) {
    console.log(`  Skipping (invalid tags): ${path.basename(imagePath)}`);
    return { processed: false, links: 0 };
  }

  // Skip if still needs tagging
  if (tagData._needsTagging) {
    console.log(`  Skipping (needs tagging): ${path.basename(imagePath)}`);
    return { processed: false, links: 0 };
  }

  // Get target paths
  const targets = getTargetPaths(imagePath, tagData);

  if (targets.length === 0) {
    console.log(`  No categories found: ${path.basename(imagePath)}`);
    return { processed: true, links: 0 };
  }

  console.log(`  ${path.basename(imagePath)} -> ${targets.length} locations`);

  // Create links/copies
  for (const target of targets) {
    createLink(imagePath, target, options.mode, options.dryRun);

    // Also copy the tag file
    const targetTagFile = target.replace(ext, '.txt');
    createLink(tagFile, targetTagFile, options.mode, options.dryRun);
  }

  return { processed: true, links: targets.length };
}

// Find all images in a directory
function findImages(dir) {
  const images = [];

  function scanDir(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(d, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('by-')) {
        scanDir(fullPath);
      } else if (entry.isFile() && /\.(jpg|jpeg|png)$/i.test(entry.name)) {
        images.push(fullPath);
      }
    }
  }

  scanDir(dir);
  return images;
}

// Main function
async function main() {
  const options = parseArgs();

  const mode = options.mode || CONFIG.mode;
  const sourceDir = options.source ? path.resolve(options.source) : CONFIG.sourceDir;

  console.log(`Movie Shot Organizer`);
  console.log(`Mode: ${mode}`);
  console.log(`Source: ${sourceDir}`);
  if (options.dryRun) console.log(`[DRY RUN]`);
  console.log('');

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    return;
  }

  // Find all images
  const images = findImages(sourceDir);
  console.log(`Found ${images.length} images\n`);

  let totalProcessed = 0;
  let totalLinks = 0;

  for (const imagePath of images) {
    const result = processImage(imagePath, { mode, dryRun: options.dryRun });
    if (result.processed) totalProcessed++;
    totalLinks += result.links;
  }

  console.log('\n=== Summary ===');
  console.log(`Images processed: ${totalProcessed}`);
  console.log(`Links created: ${totalLinks}`);
  console.log(`Mode: ${mode}`);
}

main().catch(console.error);
