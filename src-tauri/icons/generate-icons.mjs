import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'cronlab.svg');
const svgData = readFileSync(svgPath, 'utf8');

// Generate PNG at various sizes
const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  // Windows Store logos
  { name: 'Square30x30Logo.png', size: 30 },
  { name: 'Square44x44Logo.png', size: 44 },
  { name: 'Square71x71Logo.png', size: 71 },
  { name: 'Square89x89Logo.png', size: 89 },
  { name: 'Square107x107Logo.png', size: 107 },
  { name: 'Square142x142Logo.png', size: 142 },
  { name: 'Square150x150Logo.png', size: 150 },
  { name: 'Square284x284Logo.png', size: 284 },
  { name: 'Square310x310Logo.png', size: 310 },
  { name: 'StoreLogo.png', size: 50 },
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const outPath = join(__dirname, name);
  writeFileSync(outPath, pngBuffer);
  console.log(`Generated ${name} (${size}x${size}) - ${pngBuffer.length} bytes`);
}

// Generate ICO file
// ICO format: header + directory entries + image data
// We'll include 16, 32, 48, and 256 px sizes
const icoSizes = [16, 24, 32, 48, 64, 256];
const icoImages = [];

for (const size of icoSizes) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  icoImages.push({ size, data: pngBuffer });
}

// Build ICO file
// Header: 6 bytes
// Directory entry: 16 bytes each
// Then PNG data for each image
const headerSize = 6;
const dirEntrySize = 16;
const numImages = icoImages.length;
let dataOffset = headerSize + dirEntrySize * numImages;

const totalSize = dataOffset + icoImages.reduce((sum, img) => sum + img.data.length, 0);
const ico = Buffer.alloc(totalSize);

// ICO Header
ico.writeUInt16LE(0, 0);       // Reserved
ico.writeUInt16LE(1, 2);       // Type: 1 = ICO
ico.writeUInt16LE(numImages, 4); // Number of images

// Directory entries
let offset = dataOffset;
for (let i = 0; i < numImages; i++) {
  const img = icoImages[i];
  const entryOffset = headerSize + i * dirEntrySize;
  ico.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset);     // Width (0 = 256)
  ico.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset + 1); // Height (0 = 256)
  ico.writeUInt8(0, entryOffset + 2);           // Color palette
  ico.writeUInt8(0, entryOffset + 3);           // Reserved
  ico.writeUInt16LE(1, entryOffset + 4);        // Color planes
  ico.writeUInt16LE(32, entryOffset + 6);       // Bits per pixel
  ico.writeUInt32LE(img.data.length, entryOffset + 8);  // Image data size
  ico.writeUInt32LE(offset, entryOffset + 12);  // Offset to image data
  offset += img.data.length;
}

// Image data
offset = dataOffset;
for (const img of icoImages) {
  img.data.copy(ico, offset);
  offset += img.data.length;
}

const icoPath = join(__dirname, 'icon.ico');
writeFileSync(icoPath, ico);
console.log(`Generated icon.ico with sizes: ${icoSizes.join(', ')} - ${ico.length} bytes`);

console.log('\nAll icons generated successfully!');
