// Regenerates optimized WebP images in assets/img from the originals in src-photos.
// Run: npm run images
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const photos = {
  '8.jpg': 'sahil-guard',
  '12.jpg': 'sahil-medal',
  '9.jpg': 'boxing-lab-flags',
  '4.jpg': 'boxing-lab-ring',
  '1.jpg': 'gym-partner',
  '5.jpg': 'gloves-up',
  '6.jpg': 'hand-wraps',
  '7.jpg': 'sparring-gear',
  '10.jpg': 'in-the-ring',
  '11.jpg': 'gold-boots',
  '13.jpg': 'tyler-sparring',
};
const widths = [480, 800, 1200, 1600, 2000];
const out = 'site/assets/img';
mkdirSync(out, { recursive: true });
const manifest = {};

for (const [src, name] of Object.entries(photos)) {
  const base = sharp(`src-photos/${src}`).rotate();
  const { width, height } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  manifest[name] = { width, height, sizes: [] };
  for (const w of widths) {
    if (w > width && w !== widths[0]) continue;
    if (w === 2000 && name !== 'sahil-guard') continue;
    const info = await base
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 74, effort: 6 })
      .toFile(`${out}/${name}-${w}.webp`);
    manifest[name].sizes.push({ w: info.width, h: info.height, kb: Math.round(info.size / 1024) });
  }
}
writeFileSync('scripts/images.json', JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 1));
