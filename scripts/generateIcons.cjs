const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const PUBLIC_DIR = path.resolve(__dirname, '../public');
const MASTER_LOGO = path.join(PUBLIC_DIR, 'logo-master.png');

function createIcoFromPng(pngBuffer) {
  // 6-byte ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // 1 image

  // 16-byte Directory entry
  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0); // Width 32
  entry.writeUInt8(32, 1); // Height 32
  entry.writeUInt8(0, 2); // Colors (0 = 256+)
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of image data
  entry.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

  return Buffer.concat([header, entry, pngBuffer]);
}

async function generateAllIcons() {
  if (!fs.existsSync(MASTER_LOGO)) {
    throw new Error(`Master logo not found at: ${MASTER_LOGO}`);
  }

  console.log('Reading master logo:', MASTER_LOGO);
  const master = sharp(MASTER_LOGO);

  // 1. favicon-32x32.png
  console.log('Generating favicon-32x32.png...');
  const fav32Buffer = await sharp(MASTER_LOGO)
    .resize(32, 32, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), fav32Buffer);

  // 2. favicon.ico (32x32 standard ICO container with PNG data)
  console.log('Generating favicon.ico...');
  const icoBuffer = createIcoFromPng(fav32Buffer);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);

  // 3. apple-touch-icon.png (180x180)
  console.log('Generating apple-touch-icon.png...');
  await sharp(MASTER_LOGO)
    .resize(180, 180, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'));

  // 4. pwa-192x192.png (192x192)
  console.log('Generating pwa-192x192.png...');
  await sharp(MASTER_LOGO)
    .resize(192, 192, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-192x192.png'));

  // 5. pwa-512x512.png (512x512)
  console.log('Generating pwa-512x512.png...');
  await sharp(MASTER_LOGO)
    .resize(512, 512, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-512x512.png'));

  // 6. pwa-maskable-512x512.png (512x512 with 15% #09090b safe-zone padding)
  // Inner dimension = 512 * 0.70 = ~358px
  console.log('Generating pwa-maskable-512x512.png with 15% safe-zone padding...');
  const innerSize = Math.round(512 * 0.7); // 358px
  const innerResized = await sharp(MASTER_LOGO)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 9, g: 9, b: 11, alpha: 1 } })
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 9, g: 9, b: 11, alpha: 1 }, // #09090b
    },
  })
    .composite([
      {
        input: innerResized,
        top: Math.round((512 - innerSize) / 2),
        left: Math.round((512 - innerSize) / 2),
      },
    ])
    .png()
    .toFile(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'));

  console.log('All 6 icon variants generated successfully in public/ directory!');
}

generateAllIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
