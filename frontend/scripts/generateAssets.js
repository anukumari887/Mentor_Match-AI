import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:\\Users\\Anu\\.gemini\\antigravity-ide\\brain\\2f4938fc-3aca-405c-885f-5ea2d7fe432c';
const PUBLIC_DIR = path.join(process.cwd(), 'frontend', 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

[IMAGES_DIR, ICONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function processPhotos() {
  console.log('--- Processing Photos to WebP ---');

  const photos = [
    {
      source: path.join(BRAIN_DIR, 'hero_learner_session_1791282547983.jpg'),
      baseName: 'hero-learner'
    },
    {
      source: path.join(BRAIN_DIR, 'mentor_desk_sharing_1791282571987.jpg'),
      baseName: 'mentor-practice'
    },
    {
      source: path.join(BRAIN_DIR, 'auth_study_workspace_1791282595909.jpg'),
      baseName: 'auth-workspace'
    }
  ];

  for (const { source, baseName } of photos) {
    if (!fs.existsSync(source)) {
      console.error(`Source not found: ${source}`);
      continue;
    }

    const inputBuffer = fs.readFileSync(source);

    // 1200w (large)
    const largeWebp = path.join(IMAGES_DIR, `${baseName}-1200.webp`);
    await sharp(inputBuffer)
      .resize(1200, 900, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(largeWebp);

    // 800w (medium)
    const medWebp = path.join(IMAGES_DIR, `${baseName}-800.webp`);
    await sharp(inputBuffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(medWebp);

    // 400w (small)
    const smallWebp = path.join(IMAGES_DIR, `${baseName}-400.webp`);
    await sharp(inputBuffer)
      .resize(400, 300, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(smallWebp);

    // Standard fallback WebP (800w default)
    const defaultWebp = path.join(IMAGES_DIR, `${baseName}.webp`);
    await sharp(inputBuffer)
      .resize(800, 600, { fit: 'cover' })
      .webp({ quality: 82 })
      .toFile(defaultWebp);

    const s1 = (fs.statSync(largeWebp).size / 1024).toFixed(1);
    const s2 = (fs.statSync(medWebp).size / 1024).toFixed(1);
    const s3 = (fs.statSync(smallWebp).size / 1024).toFixed(1);
    console.log(`Generated ${baseName}: 1200w (${s1} KB), 800w (${s2} KB), 400w (${s3} KB)`);
  }
}

async function generateBrandAssets() {
  console.log('\n--- Generating Brand Assets & Favicons ---');

  // 1. Favicon SVG
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="14" fill="#9c4221"/>
  <path d="M16 46V18h6.5l9.5 17.5L41.5 18H48v28h-5.5V26.5L33.8 42h-3.6L21.5 26.5V46H16z" fill="#fcfbfa"/>
  <circle cx="32" cy="51" r="2.5" fill="#fcfbfa" opacity="0.8"/>
</svg>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconSvg.trim());
  console.log('Saved favicon.svg');

  // Convert SVG to PNG icons
  const svgBuffer = Buffer.from(faviconSvg);

  // Apple touch icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Saved apple-touch-icon.png (180x180)');

  // Manifest icon 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));

  // Manifest icon 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('Saved PWA icons (192, 512)');

  // Favicon.ico (32x32 PNG container)
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log('Saved favicon.ico');

  // Web App Manifest
  const manifest = {
    name: "Mentor-Match AI",
    short_name: "MentorMatch",
    description: "One-on-one technical mentorship with practicing engineers.",
    start_url: "/",
    display: "standalone",
    background_color: "#fcfbfa",
    theme_color: "#9c4221",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  fs.writeFileSync(path.join(PUBLIC_DIR, 'site.webmanifest'), JSON.stringify(manifest, null, 2));
  console.log('Saved site.webmanifest');

  // 2. OpenGraph / Social Share Image 1200x630
  const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <!-- Background warm linen -->
  <rect width="1200" height="630" fill="#fbfaf7"/>
  
  <!-- Subtle border frame -->
  <rect x="32" y="32" width="1136" height="566" rx="8" stroke="#e6e1d8" stroke-width="2" fill="none"/>
  <rect x="40" y="40" width="1120" height="550" rx="4" stroke="#e6e1d8" stroke-width="1" stroke-dasharray="4 4" fill="none"/>

  <!-- Logo Mark -->
  <g transform="translate(96, 100)">
    <rect width="56" height="56" rx="12" fill="#9c4221"/>
    <text x="28" y="38" font-family="serif" font-size="30" font-weight="bold" fill="#ffffff" text-anchor="middle">M</text>
  </g>

  <!-- Brand Label -->
  <text x="172" y="136" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" fill="#191714" letter-spacing="0.5">Mentor-Match</text>

  <!-- Tagline pill -->
  <g transform="translate(96, 210)">
    <rect width="210" height="32" rx="16" fill="#f0eae1" stroke="#ded6c9" stroke-width="1"/>
    <text x="105" y="21" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#9c4221" text-anchor="middle" letter-spacing="1">DIRECT PEER MENTORSHIP</text>
  </g>

  <!-- Title Heading -->
  <text x="96" y="300" font-family="Georgia, Cambria, serif" font-size="52" font-weight="bold" fill="#191714">
    One-on-one mentorship from
  </text>
  <text x="96" y="365" font-family="Georgia, Cambria, serif" font-size="52" font-weight="bold" fill="#191714">
    practicing engineers.
  </text>

  <!-- Subtitle Description -->
  <text x="96" y="435" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#69655f">
    Focused 60-minute technical sessions with industry practitioners.
  </text>
  <text x="96" y="470" font-family="system-ui, -apple-system, sans-serif" font-size="22" fill="#69655f">
    Architecture reviews, career guidance, and honest code feedback.
  </text>

  <!-- Bottom Badges -->
  <g transform="translate(96, 525)">
    <circle cx="8" cy="8" r="4" fill="#9c4221"/>
    <text x="22" y="13" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#4a4640">Team-approved mentors</text>

    <circle cx="270" cy="8" r="4" fill="#9c4221"/>
    <text x="284" y="13" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#4a4640">Free cancellation ≥24h</text>

    <circle cx="530" cy="8" r="4" fill="#9c4221"/>
    <text x="544" y="13" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#4a4640">In-browser video</text>
  </g>
</svg>`;

  const ogPng = path.join(PUBLIC_DIR, 'og-image.png');
  await sharp(Buffer.from(ogSvg))
    .resize(1200, 630)
    .png()
    .toFile(ogPng);
  console.log(`Saved og-image.png (${(fs.statSync(ogPng).size / 1024).toFixed(1)} KB)`);
}

async function run() {
  await processPhotos();
  await generateBrandAssets();
  console.log('\nAll assets created successfully!');
}

run();
