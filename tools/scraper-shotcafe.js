/**
 * Shot.cafe Screenshot Scraper
 *
 * Downloads movie screenshots from shot.cafe
 * 24,000+ shots available
 *
 * Usage:
 *   node scraper-shotcafe.js --pages 1-10
 *   node scraper-shotcafe.js --page 5
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  baseUrl: 'https://shot.cafe',
  outputDir: path.join(__dirname, '..', '_source', 'shot-cafe'),
  delay: 800,
  maxPerPage: 50
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { pages: [] };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--page' && args[i + 1]) {
      options.pages = [parseInt(args[++i])];
    } else if (args[i] === '--pages' && args[i + 1]) {
      const range = args[++i].split('-');
      const start = parseInt(range[0]);
      const end = parseInt(range[1] || range[0]);
      for (let p = start; p <= end; p++) {
        options.pages.push(p);
      }
    } else if (args[i] === '--max' && args[i + 1]) {
      options.max = parseInt(args[++i]);
    }
  }

  return options;
}

// Download image
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    const file = fs.createWriteStream(filepath);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Delay helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Slugify
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

// Scrape a single page
async function scrapePage(browser, pageNum) {
  console.log(`\nScraping page ${pageNum}...`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto(`${CONFIG.baseUrl}/?page=${pageNum}`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    // Wait for images to load
    await delay(3000);

    // Scroll to load lazy images
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 500;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await delay(2000);

    // Extract shot data
    const shots = await page.evaluate(() => {
      const results = [];

      // Find all shot containers
      const shotElements = document.querySelectorAll('a[href*="#"]');

      shotElements.forEach(el => {
        const img = el.querySelector('img');
        if (!img) return;

        const src = img.src || img.dataset.src;
        if (!src || src.includes('placeholder') || src.includes('logo')) return;

        // Try to get movie info from parent or nearby elements
        const href = el.href || '';
        const alt = img.alt || '';

        // Extract movie title from href or alt
        let movieTitle = alt || 'unknown';
        let movieYear = null;

        // Try to extract year
        const yearMatch = (href + ' ' + alt).match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          movieYear = parseInt(yearMatch[0]);
        }

        results.push({
          imageUrl: src,
          movieTitle: movieTitle.split('-').slice(0, -1).join(' ').trim() || movieTitle,
          movieYear,
          sourceUrl: href
        });
      });

      return results;
    });

    console.log(`  Found ${shots.length} shots on page ${pageNum}`);

    // Download shots
    let downloaded = 0;
    const maxShots = Math.min(shots.length, CONFIG.maxPerPage);

    for (let i = 0; i < maxShots; i++) {
      const shot = shots[i];
      if (!shot.imageUrl || shot.imageUrl.includes('data:')) continue;

      const movieSlug = slugify(shot.movieTitle || 'unknown');
      const movieDir = path.join(CONFIG.outputDir, movieSlug);

      if (!fs.existsSync(movieDir)) {
        fs.mkdirSync(movieDir, { recursive: true });
      }

      // Count existing shots for this movie
      const existingShots = fs.readdirSync(movieDir).filter(f => f.endsWith('.jpg')).length;
      const shotNum = existingShots + 1;

      const filename = `${movieSlug}_shot-${String(shotNum).padStart(3, '0')}.jpg`;
      const filepath = path.join(movieDir, filename);

      // Skip if exists
      if (fs.existsSync(filepath)) {
        console.log(`  Skipping (exists): ${filename}`);
        continue;
      }

      try {
        await downloadImage(shot.imageUrl, filepath);
        console.log(`  Downloaded: ${filename}`);
        downloaded++;

        // Create tag file
        const tagFile = filepath.replace('.jpg', '.txt');
        const tagData = {
          filename,
          source: 'shot.cafe',
          sourceUrl: shot.sourceUrl,
          film: {
            title: shot.movieTitle,
            year: shot.movieYear,
            director: null,
            cinematographer: null
          },
          shot: { type: null, angle: null, movement: null },
          emotion: { primary: null, intensity: null },
          lighting: { type: null },
          environment: { type: null },
          tags: [],
          prompt_keywords: '',
          _needsTagging: true
        };

        fs.writeFileSync(tagFile, JSON.stringify(tagData, null, 2));

        await delay(CONFIG.delay);
      } catch (err) {
        console.log(`  Error: ${err.message}`);
      }
    }

    console.log(`  Downloaded ${downloaded} shots from page ${pageNum}`);
    return downloaded;

  } finally {
    await page.close();
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (options.pages.length === 0) {
    console.log(`
Shot.cafe Scraper

Usage:
  node scraper-shotcafe.js --page 5        Single page
  node scraper-shotcafe.js --pages 1-10    Range of pages
  node scraper-shotcafe.js --max 20        Max shots per page
    `);
    return;
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    let totalDownloaded = 0;

    for (const pageNum of options.pages) {
      try {
        const count = await scrapePage(browser, pageNum);
        totalDownloaded += count;
        await delay(2000);
      } catch (err) {
        console.log(`Error on page ${pageNum}: ${err.message}`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Pages scraped: ${options.pages.length}`);
    console.log(`Total downloaded: ${totalDownloaded}`);
    console.log(`Output: ${CONFIG.outputDir}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
