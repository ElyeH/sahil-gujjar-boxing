// Builds the hero background from src-photos/8.jpg with only Sahil in frame
// (the other fighter on the left is cropped out). Run: npm run images
import sharp from 'sharp';

const src = await sharp('src-photos/8.jpg').rotate().toBuffer();
const out = 'site/assets/img';
const BG = { r: 10, g: 10, b: 11 };

// Portrait (phones/tablets): Sahil from head to knees.
const tall = await sharp(src).extract({ left: 1575, top: 0, width: 1449, height: 3300 }).toBuffer();
for (const w of [480, 800, 1200]) {
  await sharp(tall).resize({ width: w }).webp({ quality: 74, effort: 6 }).toFile(`${out}/hero-solo-${w}.webp`);
}

// Wide (desktop): Sahil on the right of a dark canvas; the left side sits under the hero's text shading.
const CW = 2400, CH = 1500, PH = 1500;
const crop = { left: 1575, top: 120, width: 1449, height: 2300 };
const pw = Math.round((crop.width * PH) / crop.height);
const fadeW = Math.round(pw * 0.28);
const fade = Buffer.from(
  `<svg width="${pw}" height="${PH}"><defs><linearGradient id="g" x1="0" x2="1">` +
  `<stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="${fadeW / pw}" stop-color="#000" stop-opacity="1"/>` +
  `</linearGradient></defs><rect width="${pw}" height="${PH}" fill="url(#g)"/></svg>`
);
const person = await sharp(src).extract(crop).resize({ height: PH })
  .composite([{ input: fade, blend: 'dest-in' }]).png().toBuffer();
const wide = await sharp({ create: { width: CW, height: CH, channels: 3, background: BG } })
  .composite([{ input: person, left: CW - pw, top: 0 }]).png().toBuffer();
for (const w of [1200, 1600, 2400]) {
  await sharp(wide).resize({ width: w }).webp({ quality: 74, effort: 6 }).toFile(`${out}/hero-wide-${w}.webp`);
}
console.log('hero images built', { pw });
