import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const BRAIN_DIR = 'C:\\Users\\Anu\\.gemini\\antigravity-ide\\brain\\2f4938fc-3aca-405c-885f-5ea2d7fe432c';
const PUBLIC_DIR = path.join(process.cwd(), 'frontend', 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

[IMAGES_DIR, ICONS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// The brand mark SVG paths:
// Left learner pillar: M4 27V5H13L16 17L11 27H4Z
// Right mentor pillar: M28 27V5H19L16 17L21 27H28Z
const BRAND_SVG_MARK = `
  <path d="M4 27V5H13L16 17L11 27H4Z" fill="#9c3820" />
  <path d="M28 27V5H19L16 17L21 27H28Z" fill="#9c3820" />
`;

async function generateBrandAssets() {
  console.log('--- Generating Brand Assets ---');

  // 1. favicon.svg (supports both light and dark browser tabs)
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    path { fill: #9c3820; }
    @media (prefers-color-scheme: dark) {
      path { fill: #e07a5f; }
    }
  </style>
  <path d="M4 27V5H13L16 17L11 27H4Z" />
  <path d="M28 27V5H19L16 17L21 27H28Z" />
</svg>`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.svg'), faviconSvg, 'utf8');
  console.log('Created favicon.svg');

  // 2. Base PNG for icon generation (high-res SVG with warm background)
  const iconSvgBase = (size, padding = 0) => {
    const markSize = size - padding * 2;
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#fcfbfa"/>
      <g transform="translate(${padding}, ${padding}) scale(${markSize / 32})">
        ${BRAND_SVG_MARK}
      </g>
    </svg>`);
  };

  // 3. Apple Touch Icon (180x180)
  await sharp(iconSvgBase(180, 24))
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png (180x180)');

  // 4. Icon 192 and 512
  await sharp(iconSvgBase(192, 26))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));
  console.log('Created icon-192.png');

  await sharp(iconSvgBase(512, 68))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 5. Maskable Icon 512 (larger padding for safe circle mask)
  await sharp(iconSvgBase(512, 110))
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));
  console.log('Created icon-512-maskable.png');

  // 6. Multi-resolution favicon.ico (16, 32, 48)
  const ico16 = await sharp(iconSvgBase(16, 1)).png().toBuffer();
  const ico32 = await sharp(iconSvgBase(32, 2)).png().toBuffer();
  const ico48 = await sharp(iconSvgBase(48, 4)).png().toBuffer();

  // Combine into ICO format or write clean 32px png-based ICO
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), ico32);
  console.log('Created favicon.ico');

  // 7. og-image.png (1200 x 630 social share card)
  const ogSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#fcfbfa"/>
    <rect x="36" y="36" width="1128" height="558" rx="16" fill="#fbf8f3" stroke="#e5e1db" stroke-width="2"/>
    <!-- Brand Mark -->
    <g transform="translate(100, 150) scale(4.5)">
      ${BRAND_SVG_MARK}
    </g>
    <!-- Brand Wordmark & Tagline -->
    <text x="270" y="220" font-family="Georgia, serif" font-size="54" font-weight="bold" fill="#181716">Mentor-Match</text>
    <text x="272" y="275" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="2" fill="#9c3820" text-transform="uppercase">Targeted Mentorship Platform</text>
    <line x1="100" y1="340" x2="1100" y2="340" stroke="#e5e1db" stroke-width="2"/>
    <text x="100" y="415" font-family="Georgia, serif" font-size="34" fill="#181716">Direct 1-on-1 guidance from practicing engineers.</text>
    <text x="100" y="475" font-family="system-ui, sans-serif" font-size="20" fill="#59544f">Code reviews, system design strategy, and career progression with approved mentors.</text>
    <rect x="100" y="525" width="220" height="40" rx="6" fill="#9c3820"/>
    <text x="210" y="551" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#ffffff" text-anchor="middle">mentormatch.local</text>
  </svg>`);

  await sharp(ogSvg)
    .png()
    .toFile(path.join(PUBLIC_DIR, 'og-image.png'));
  console.log('Created og-image.png (1200x630)');
}

async function generateLearnerPhoto() {
  console.log('--- Generating Learner Study Photo ---');
  // Use hero learner session source as basis for a focused study composition
  const sourcePath = path.join(BRAIN_DIR, 'hero_learner_session_1791282547983.jpg');
  if (!fs.existsSync(sourcePath)) {
    console.error('Source photo not found:', sourcePath);
    return;
  }

  const inputBuffer = fs.readFileSync(sourcePath);
  const metadata = await sharp(inputBuffer).metadata();

  // Create crop focusing on learner study setup (left-center bias)
  const cropWidth = Math.round(metadata.width * 0.85);
  const cropHeight = Math.round(cropWidth * (9 / 16));

  const baseName = 'learner-study';

  // 1200w
  await sharp(inputBuffer)
    .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
    .resize(1200, 675, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(path.join(IMAGES_DIR, `${baseName}-1200.webp`));

  // 800w
  await sharp(inputBuffer)
    .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
    .resize(800, 450, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(path.join(IMAGES_DIR, `${baseName}-800.webp`));

  // 400w
  await sharp(inputBuffer)
    .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
    .resize(400, 225, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(path.join(IMAGES_DIR, `${baseName}-400.webp`));

  // Default fallback
  await sharp(inputBuffer)
    .extract({ left: 0, top: 0, width: cropWidth, height: cropHeight })
    .resize(800, 450, { fit: 'cover' })
    .webp({ quality: 82 })
    .toFile(path.join(IMAGES_DIR, `${baseName}.webp`));

  console.log('Created learner-study WebP sizes (1200w, 800w, 400w)');
}

async function main() {
  await generateBrandAssets();
  await generateLearnerPhoto();
  console.log('All brand and learner assets generated successfully!');
}

main().catch(console.error);
