// Renders og-image.jpg and PNG icons into site/ using headless Chromium.
// Run: npm run assets
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const hero = readFileSync('site/assets/img/hero-solo-1200.webp').toString('base64');
const fonts = `<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@700&display=block" rel="stylesheet">`;

const og = `<!doctype html><html><head>${fonts}<style>
  body{margin:0;width:1200px;height:630px;background:#0a0a0b;overflow:hidden;font-family:Inter,sans-serif;position:relative}
  .photo{position:absolute;right:0;top:0;width:640px;height:630px;background:url(data:image/webp;base64,${hero}) 50% 12%/cover}
  .fade{position:absolute;inset:0;background:linear-gradient(90deg,#0a0a0b 42%,rgba(10,10,11,.75) 58%,rgba(10,10,11,.1) 85%)}
  .txt{position:absolute;left:72px;top:92px;color:#f4efe6}
  .k{color:#d4af5a;font-weight:700;letter-spacing:.24em;font-size:20px;text-transform:uppercase}
  h1{font-family:'Bebas Neue';font-weight:400;font-size:168px;line-height:.85;margin:22px 0 18px}
  h1 span{display:block;color:transparent;-webkit-text-stroke:3px #f4efe6}
  p{font-family:'Bebas Neue';font-size:46px;margin:0;letter-spacing:.03em}
  p b{color:#e0243f;font-weight:400}
  .ropes{position:absolute;left:0;right:0;bottom:40px;height:22px;background:linear-gradient(#c8102e,#c8102e) 0 0/100% 4px no-repeat,linear-gradient(#f4efe6,#f4efe6) 0 9px/100% 4px no-repeat,linear-gradient(#c8102e,#c8102e) 0 18px/100% 4px no-repeat;opacity:.9}
  .price{position:absolute;right:56px;bottom:96px;width:130px;height:130px;border-radius:50%;border:3px solid #d4af5a;background:rgba(10,10,11,.85);display:grid;place-items:center;text-align:center;color:#f4efe6}
  .price strong{font-family:'Bebas Neue';font-weight:400;font-size:50px;line-height:1;display:block}
  .price small{color:#d4af5a;font-size:12px;letter-spacing:.2em;font-weight:700}
</style></head><body><div class="photo"></div><div class="fade"></div>
<div class="txt"><div class="k">Championship Boxing Conditioning · Oxnard, CA</div><h1>Sahil<span>Gujjar</span></h1><p>Train like a fighter. <b>Live with energy.</b></p></div>
<div class="price"><div><strong>$100</strong><small>PER MONTH</small></div></div><div class="ropes"></div></body></html>`;

const icon = (size) => `<!doctype html><html><head>${fonts}<style>
  body{margin:0;width:${size}px;height:${size}px;background:#c8102e;display:grid;place-items:center;box-shadow:inset 0 0 0 ${Math.round(size * 0.06)}px #d4af5a}
  span{font-family:'Bebas Neue';color:#fff;font-size:${Math.round(size * 0.62)}px;line-height:1;padding-top:${Math.round(size * 0.06)}px;letter-spacing:.02em}
</style></head><body><span>SG</span></body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage();

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const ogPng = await page.screenshot({ type: 'png' });
await sharp(ogPng).jpeg({ quality: 84, mozjpeg: true }).toFile('site/og-image.jpg');

for (const [file, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512], ['favicon-32.png', 32]]) {
  const render = Math.max(size, 128);
  await page.setViewportSize({ width: render, height: render });
  await page.setContent(icon(render), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  await sharp(png).resize(size, size).png().toFile(`site/${file}`);
}
await browser.close();
console.log('Rendered og-image.jpg and icons');
