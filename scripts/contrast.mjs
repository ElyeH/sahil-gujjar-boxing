// Pixel-level WCAG contrast check, including text over photos and gradients.
// Renders the page, records every text run's box and colour, re-renders with text hidden,
// then compares each colour against the actual background pixels behind it (5th percentile = near worst case).
// Run with the preview server up: npm run contrast
import { chromium } from 'playwright';
import sharp from 'sharp';

const url = process.env.URL || 'http://localhost:4321/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const lum = ([r, g, b]) => {
  const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };
let failures = 0;

for (const [name, width, height] of [['small-phone', 320, 640], ['mobile', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 900], ['wide', 1920, 1080]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 50)); }
    window.scrollTo(0, 0);
  });
  await page.addStyleTag({ content: 'body::before{display:none!important} .mobile-cta{display:none!important} .site-header{position:absolute!important}' });
  await page.waitForTimeout(500);

  const runs = await page.evaluate(() => {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      if (el.closest('[aria-hidden="true"], .visually-hidden, script, style, dialog, [hidden], option')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = Array.from(range.getClientRects()).filter((r) => r.width > 2 && r.height > 2);
      if (!rects.length) continue;
      const stroke = cs.webkitTextStrokeWidth && parseFloat(cs.webkitTextStrokeWidth) > 0 && cs.color === 'rgba(0, 0, 0, 0)';
      const color = (stroke ? cs.webkitTextStrokeColor : cs.color).match(/[\d.]+/g).map(Number);
      const size = parseFloat(cs.fontSize);
      const weight = parseInt(cs.fontWeight, 10);
      out.push({
        text: node.textContent.trim().slice(0, 40),
        color,
        large: size >= 24 || (size >= 18.66 && weight >= 700),
        rects: rects.map((r) => ({ x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height })),
      });
    }
    return out;
  });

  await page.addStyleTag({ content: '*{color:transparent!important;-webkit-text-stroke-color:transparent!important;text-shadow:none!important;text-decoration-color:transparent!important}' });
  const shot = await page.screenshot({ fullPage: true, type: 'png' });
  const { data, info } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  for (const run of runs) {
    const [r, g, b, a = 1] = run.color;
    const ratios = [];
    for (const rc of run.rects) {
      const step = Math.max(1, Math.floor(Math.min(rc.w, rc.h) / 6));
      for (let y = Math.floor(rc.y); y < rc.y + rc.h; y += step) {
        for (let x = Math.floor(rc.x); x < rc.x + rc.w; x += step) {
          if (x < 0 || y < 0 || x >= info.width || y >= info.height) continue;
          const i = (y * info.width + x) * 3;
          const bg = [data[i], data[i + 1], data[i + 2]];
          const fg = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
          ratios.push(ratio(fg, bg));
        }
      }
    }
    if (!ratios.length) continue;
    ratios.sort((x, y) => x - y);
    const worst = ratios[Math.floor(ratios.length * 0.05)];
    const need = run.large ? 3 : 4.5;
    if (worst < need) {
      failures++;
      console.log(`${name}: FAIL ${worst.toFixed(2)}:1 (needs ${need}) "${run.text}"`);
    }
  }
  console.log(`${name}: checked ${runs.length} text runs`);
  await page.close();
}
await browser.close();
console.log(failures ? `${failures} contrast failure(s)` : 'All text meets WCAG AA contrast.');
process.exitCode = failures ? 1 : 0;
