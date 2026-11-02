// QA: screenshots at several widths, axe-core (WCAG 2.1 AA) audit, overflow and interaction checks.
// Run with the preview server up: npm start  (then)  npm run check
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const url = process.env.URL || 'http://localhost:4321/';
const out = process.env.OUT || 'qa';
mkdirSync(out, { recursive: true });
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const problems = [];

const viewports = [
  ['mobile', 390, 844],
  ['tablet', 820, 1180],
  ['desktop', 1440, 900],
];

for (const [name, width, height] of viewports) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);

  await page.screenshot({ path: `${out}/${name}-hero.png` });
  // Load lazy images before the full-page shot
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${name}: horizontal overflow of ${overflow}px`);

  // The decorative grain overlay sits above everything and makes axe give up on contrast; hide it for the audit.
  await page.addStyleTag({ content: 'body::before{display:none!important}' });
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(() =>
    window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } })
  );
  for (const v of result.violations) {
    problems.push(`${name}: axe ${v.id} (${v.impact}) — ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  }
  const review = result.incomplete.filter((v) => v.id === 'color-contrast');
  if (review.length) {
    console.log(`${name}: ${review[0].nodes.length} contrast checks need manual review (text over images/gradients):`);
    console.log('   ' + review[0].nodes.map((n) => n.target.join(' ')).join('\n   '));
  }
  if (errors.length) problems.push(`${name}: console errors: ${errors.join('; ')}`);
  await ctx.close();
}

// Interaction tests (mobile)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  // Mobile menu
  await page.click('.nav-toggle');
  if ((await page.getAttribute('.nav-toggle', 'aria-expanded')) !== 'true') problems.push('menu: did not open');
  await page.screenshot({ path: `${out}/mobile-menu.png` });
  await page.keyboard.press('Escape');
  if (await page.isVisible('#site-nav')) problems.push('menu: Escape did not close');

  // Lightbox
  await page.locator('[data-gallery] a').nth(1).scrollIntoViewIfNeeded();
  await page.locator('[data-gallery] a').nth(1).click();
  await page.waitForTimeout(300);
  if (!(await page.isVisible('[data-lightbox]'))) problems.push('lightbox: did not open');
  await page.keyboard.press('ArrowRight');
  const count = await page.textContent('[data-lb-count]');
  if (count !== 'Photo 3 of 8') problems.push(`lightbox: arrow nav wrong (${count})`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/mobile-lightbox.png` });
  await page.keyboard.press('Escape');
  const focused = await page.evaluate(() => document.activeElement.closest('[data-gallery]') !== null);
  if (!focused) problems.push('lightbox: focus not returned to gallery');

  // Form: empty submit shows errors and focuses the first field
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await page.click('form[name="contact"] [type="submit"]');
  const errs = await page.$$eval('.field__error', (els) => els.filter((e) => e.textContent.trim()).length);
  if (errs !== 5) problems.push(`form: expected 5 errors on empty submit, got ${errs}`);
  const active = await page.evaluate(() => document.activeElement.id);
  if (active !== 'f-name') problems.push(`form: focus went to ${active}`);
  await page.locator('.form-card').screenshot({ path: `${out}/form-errors.png` });

  // Bad email, then valid submission
  await page.fill('#f-name', 'Test Client');
  await page.fill('#f-email', 'not-an-email');
  await page.click('form[name="contact"] [type="submit"]');
  if ((await page.getAttribute('#f-email', 'aria-invalid')) !== 'true') problems.push('form: bad email accepted');
  await page.fill('#f-email', 'client@example.com');
  await page.selectOption('#f-interest', { index: 1 });
  await page.check('#exp-some', { force: true });
  await page.fill('#f-message', 'I want more energy and to learn real boxing.');
  await page.click('form[name="contact"] [type="submit"]');
  await page.waitForTimeout(200);
  if (!(await page.isVisible('[data-form-success]'))) problems.push('form: success message not shown');
  await page.locator('.form-card').screenshot({ path: `${out}/form-success.png` });
  await ctx.close();
}

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join('\n- ')}` : '\nAll checks passed.');
process.exitCode = problems.length ? 1 : 0;
