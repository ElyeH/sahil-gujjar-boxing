# Sahil Gujjar — Championship Boxing Conditioning

Static website (plain HTML, CSS and JavaScript). There is no build step: the `site/` folder is the website.

## Run locally

```bash
npm install        # only needed for the dev tools below
npm start          # → http://localhost:4321
```

The contact form shows its success message locally without sending anything. Real submissions only work once the site is deployed on Netlify.

## Deploy (GitHub Pages, current setup)

`.github/workflows/pages.yml` publishes the `site/` folder every time you push to `main`.

1. Create an empty public repo named `sahil-gujjar-boxing` on GitHub, then push:
   ```bash
   git remote add origin https://github.com/ElyeH/sahil-gujjar-boxing.git
   git push -u origin main
   ```
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. If the first workflow run failed because Pages wasn't enabled yet, re-run it from the **Actions** tab.
3. The site lives at `https://wwwsgboxing.com/` (custom domain, set by `site/CNAME`).

### Custom domain (wwwsgboxing.com, registered at Squarespace)
- Squarespace → Domains → wwwsgboxing.com → DNS: four `A` records on `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`, and a `CNAME` on `www` → `elyeh.github.io` (delete Squarespace's default records first).
- GitHub repo → Settings → Pages → Custom domain = `wwwsgboxing.com`, then tick **Enforce HTTPS** once it's offered.

If the domain changes, update `site/CNAME` and replace `https://wwwsgboxing.com/` in `site/index.html`, `site/robots.txt` and `site/sitemap.xml`.

## Deploy (Netlify, alternative)

Before deploying to Netlify, set `data-provider="netlify"` on the form in `site/index.html`.

**Option A: drag and drop (no account setup beyond signing in)**
1. Go to https://app.netlify.com/drop and drag the `site` folder (or `sahil-gujjar-site-netlify.zip`) onto the page.
2. In the new site: **Site configuration → Forms → Enable form detection**, then drag the folder in again (Deploys → drag-and-drop area) so Netlify picks up the form.
3. **Site configuration → Change site name** → e.g. `sahilgujjar` → the site lives at `https://sahilgujjar.netlify.app`.
4. Form emails: **Site configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email**, and enter Sahil's email.

**Option B: from GitHub (auto-deploys on every push)**
Push this folder to a GitHub repo. In Netlify choose **Add new site → Import an existing project → GitHub**, pick the repo, and leave the build command empty (the publish directory `site` is set in `netlify.toml`). Then do steps 2–4 above.

**Option C: command line**
```bash
NETLIFY_AUTH_TOKEN=xxxx npx netlify-cli deploy --prod --dir site
```

### If the domain isn't `sahilgujjar.netlify.app`
Replace `https://sahilgujjar.netlify.app` in `site/index.html` (canonical URL, Open Graph, structured data), `site/robots.txt` and `site/sitemap.xml`.

## Contact form
The `data-provider` attribute on `<form name="contact">` in `site/index.html` chooses where submissions go:

- **`formsubmit`** (current): submissions are emailed to sgboxingcontact@gmail.com via https://formsubmit.co (no account). The first submission triggers a one-time activation email that must be confirmed. Set `data-endpoint` to `https://formsubmit.co/ajax/<email or FormSubmit's random alias>`.
- **`whatsapp`**: after validation, WhatsApp opens with the client's details already written as a message to Sahil (805-258-9402). The client only has to press send. This needs no account and works on GitHub Pages.
- **`formspree`**: submissions are emailed to Sahil. Create a free form at https://formspree.io (50 submissions/month) using his email, then set `data-provider="formspree"` and `data-endpoint="https://formspree.io/f/XXXXXXX"`. Works on GitHub Pages.
- **`netlify`**: Netlify Forms. Only works when the site is hosted on Netlify.

Spam protection: a hidden honeypot field (`bot-field`). If a bot fills it in, the form shows success and sends nothing.

## Editing content
All copy is in `site/index.html`.

## Photos
Put originals in `src-photos/`, map each file to a name in `scripts/build-images.mjs`, then run `npm run images`. This rotates, resizes (480–2000px), converts to WebP and strips metadata, including the GPS location phones embed. `src-photos/` is git-ignored for that reason.

`npm run assets` re-renders the share image (`og-image.jpg`) and icons.

## Quality checks
With `npm start` running in another terminal:
```bash
npm run check      # screenshots, axe-core WCAG 2.1 AA audit, overflow, menu/lightbox/form tests
npm run contrast   # pixel-level contrast check of every text run, including text over photos
```
If Playwright says its browser is missing, run `npx playwright install chromium`.
