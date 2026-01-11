/**
 * Film-Grab.com Screenshot Scraper
 *
 * Downloads movie screenshots and creates tag sidecar files
 *
 * Usage:
 *   node scraper.js --film "blade-runner-2049"
 *   node scraper.js --director "denis-villeneuve"
 *   node scraper.js --url "https://film-grab.com/2017/10/08/blade-runner-2049/"
 *   node scraper.js --list films.txt
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  baseUrl: 'https://film-grab.com',
  outputDir: path.join(__dirname, '..', '_source', 'film-grab'),
  delay: 1000,  // Delay between requests (be nice to the server)
  maxImages: 50  // Max images per film
};

// Directors mapping to their film-grab URLs
const DIRECTORS = {
  'stanley-kubrick': '/category/directors/stanley-kubrick/',
  'wes-anderson': '/category/directors/wes-anderson/',
  'david-fincher': '/category/directors/david-fincher/',
  'denis-villeneuve': '/category/directors/denis-villeneuve/',
  'christopher-nolan': '/category/directors/christopher-nolan/',
  'quentin-tarantino': '/category/directors/quentin-tarantino/',
  'ridley-scott': '/category/directors/ridley-scott/',
  'martin-scorsese': '/category/directors/martin-scorsese/',
  'steven-spielberg': '/category/directors/steven-spielberg/',
  'alfred-hitchcock': '/category/directors/alfred-hitchcock/',
  'akira-kurosawa': '/category/directors/akira-kurosawa/',
  'coen-brothers': '/category/directors/coen-brothers/'
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--film' && args[i + 1]) {
      options.film = args[++i];
    } else if (args[i] === '--director' && args[i + 1]) {
      options.director = args[++i];
    } else if (args[i] === '--url' && args[i + 1]) {
      options.url = args[++i];
    } else if (args[i] === '--list' && args[i + 1]) {
      options.list = args[++i];
    } else if (args[i] === '--max' && args[i + 1]) {
      options.max = parseInt(args[++i]);
    }
  }

  return options;
}

// Create slug from film title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Download image
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
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

// Scrape a single film page
async function scrapeFilm(browser, url) {
  console.log(`\nScraping: ${url}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract film info
    const filmInfo = await page.evaluate(() => {
      const title = document.querySelector('h1.entry-title')?.textContent?.trim() || 'Unknown';

      // Try to get year from meta or content
      const content = document.querySelector('.entry-content')?.textContent || '';
      const yearMatch = content.match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? parseInt(yearMatch[0]) : null;

      // Get director from content or tags
      const directorLinks = Array.from(document.querySelectorAll('a[rel="tag"]'));
      const director = directorLinks.find(a => a.href.includes('/category/directors/'))?.textContent?.trim() || null;

      // Get cinematographer
      const dpLinks = directorLinks.filter(a => a.href.includes('/dp/') || a.href.includes('/cinematographer/'));
      const cinematographer = dpLinks.length > 0 ? dpLinks[0].textContent.trim() : null;

      // Get all image URLs (gallery or inline images)
      const images = [];

      // Check for gallery images
      document.querySelectorAll('.gallery-item img, .entry-content img').forEach(img => {
        let src = img.src;
        // Get full-size if available
        if (img.dataset.src) src = img.dataset.src;
        if (img.parentElement?.href) src = img.parentElement.href;

        // Filter out thumbnails and icons
        if (src && !src.includes('icon') && !src.includes('logo') &&
            (src.includes('.jpg') || src.includes('.png') || src.includes('.jpeg'))) {
          images.push(src);
        }
      });

      // Also check for links to full images
      document.querySelectorAll('.gallery-item a, .entry-content a').forEach(a => {
        if (a.href && (a.href.includes('.jpg') || a.href.includes('.png') || a.href.includes('.jpeg'))) {
          if (!images.includes(a.href)) {
            images.push(a.href);
          }
        }
      });

      return { title, year, director, cinematographer, images };
    });

    console.log(`  Title: ${filmInfo.title}`);
    console.log(`  Year: ${filmInfo.year || 'Unknown'}`);
    console.log(`  Director: ${filmInfo.director || 'Unknown'}`);
    console.log(`  Found ${filmInfo.images.length} images`);

    // Create output directory
    const slug = slugify(filmInfo.title);
    const filmDir = path.join(CONFIG.outputDir, slug);
    if (!fs.existsSync(filmDir)) {
      fs.mkdirSync(filmDir, { recursive: true });
    }

    // Save film metadata
    const metadata = {
      title: filmInfo.title,
      slug: slug,
      year: filmInfo.year,
      director: filmInfo.director,
      cinematographer: filmInfo.cinematographer,
      sourceUrl: url,
      scrapedAt: new Date().toISOString(),
      imageCount: Math.min(filmInfo.images.length, CONFIG.maxImages)
    };

    fs.writeFileSync(
      path.join(filmDir, '_metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    // Download images
    const maxImages = Math.min(filmInfo.images.length, CONFIG.maxImages);
    let downloaded = 0;

    for (let i = 0; i < maxImages; i++) {
      const imageUrl = filmInfo.images[i];
      const ext = path.extname(imageUrl).split('?')[0] || '.jpg';
      const filename = `${slug}_shot-${String(i + 1).padStart(3, '0')}${ext}`;
      const filepath = path.join(filmDir, filename);

      // Skip if already downloaded
      if (fs.existsSync(filepath)) {
        console.log(`  Skipping (exists): ${filename}`);
        downloaded++;
        continue;
      }

      try {
        await downloadImage(imageUrl, filepath);
        console.log(`  Downloaded: ${filename}`);
        downloaded++;

        // Create placeholder tag file
        const tagFile = filepath.replace(ext, '.txt');
        const tagData = {
          filename: filename,
          source: 'film-grab.com',
          sourceUrl: url,
          film: {
            title: filmInfo.title,
            year: filmInfo.year,
            director: filmInfo.director,
            cinematographer: filmInfo.cinematographer
          },
          shot: {
            type: null,
            angle: null,
            movement: null
          },
          emotion: {
            primary: null,
            intensity: null
          },
          lighting: {
            type: null
          },
          environment: {
            type: null
          },
          tags: [],
          prompt_keywords: '',
          _needsTagging: true
        };

        fs.writeFileSync(tagFile, JSON.stringify(tagData, null, 2));

        await delay(CONFIG.delay);
      } catch (err) {
        console.log(`  Error downloading ${filename}: ${err.message}`);
      }
    }

    console.log(`  Completed: ${downloaded}/${maxImages} images`);
    return { ...metadata, downloaded };

  } finally {
    await page.close();
  }
}

// Search for films
async function searchFilms(browser, query) {
  console.log(`\nSearching for: ${query}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    const searchUrl = `${CONFIG.baseUrl}/?s=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    const results = await page.evaluate(() => {
      const films = [];
      document.querySelectorAll('article h2 a').forEach(a => {
        films.push({
          title: a.textContent.trim(),
          url: a.href
        });
      });
      return films;
    });

    console.log(`  Found ${results.length} results`);
    return results;

  } finally {
    await page.close();
  }
}

// Get films by director
async function getDirectorFilms(browser, directorSlug) {
  const directorPath = DIRECTORS[directorSlug];
  if (!directorPath) {
    console.log(`Unknown director: ${directorSlug}`);
    console.log(`Available directors: ${Object.keys(DIRECTORS).join(', ')}`);
    return [];
  }

  console.log(`\nGetting films by: ${directorSlug}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    await page.goto(`${CONFIG.baseUrl}${directorPath}`, { waitUntil: 'networkidle2', timeout: 30000 });

    const films = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('article h2 a, .post-title a').forEach(a => {
        results.push({
          title: a.textContent.trim(),
          url: a.href
        });
      });
      return results;
    });

    console.log(`  Found ${films.length} films`);
    return films;

  } finally {
    await page.close();
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (!options.film && !options.director && !options.url && !options.list) {
    console.log(`
Film-Grab Scraper - Download movie screenshots

Usage:
  node scraper.js --film "blade runner 2049"     Search and download
  node scraper.js --director "denis-villeneuve"  All films by director
  node scraper.js --url "https://film-grab.com/..." Direct URL
  node scraper.js --list films.txt               Process URL list
  node scraper.js --max 20                       Max images per film

Available directors:
  ${Object.keys(DIRECTORS).join(', ')}
    `);
    return;
  }

  if (options.max) {
    CONFIG.maxImages = options.max;
  }

  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    const results = [];

    if (options.url) {
      // Direct URL
      const result = await scrapeFilm(browser, options.url);
      results.push(result);

    } else if (options.film) {
      // Search for film
      const films = await searchFilms(browser, options.film);

      if (films.length === 0) {
        console.log('No films found');
      } else if (films.length === 1) {
        const result = await scrapeFilm(browser, films[0].url);
        results.push(result);
      } else {
        console.log('\nMultiple results found:');
        films.slice(0, 5).forEach((f, i) => {
          console.log(`  ${i + 1}. ${f.title}`);
        });
        console.log('\nScraping first result...');
        const result = await scrapeFilm(browser, films[0].url);
        results.push(result);
      }

    } else if (options.director) {
      // Get all films by director
      const films = await getDirectorFilms(browser, options.director);

      for (const film of films) {
        try {
          const result = await scrapeFilm(browser, film.url);
          results.push(result);
          await delay(2000);  // Extra delay between films
        } catch (err) {
          console.log(`  Error scraping ${film.title}: ${err.message}`);
        }
      }

    } else if (options.list) {
      // Process list of URLs
      const urls = fs.readFileSync(options.list, 'utf8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));

      for (const url of urls) {
        try {
          const result = await scrapeFilm(browser, url);
          results.push(result);
          await delay(2000);
        } catch (err) {
          console.log(`  Error scraping ${url}: ${err.message}`);
        }
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Films scraped: ${results.length}`);
    console.log(`Total images: ${results.reduce((sum, r) => sum + (r.downloaded || 0), 0)}`);
    console.log(`Output: ${CONFIG.outputDir}`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
