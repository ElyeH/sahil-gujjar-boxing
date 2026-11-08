// Builds scripts/og-photo.webp, the photo used in the link-preview image (og-sahil.jpg):
// src-photos/8.jpg cropped so only Sahil is in frame. Run: npm run images
import sharp from 'sharp';

await sharp('src-photos/8.jpg')
  .rotate()
  .extract({ left: 1575, top: 0, width: 1449, height: 3300 })
  .resize({ width: 1200 })
  .webp({ quality: 74, effort: 6 })
  .toFile('scripts/og-photo.webp');
console.log('built scripts/og-photo.webp');
