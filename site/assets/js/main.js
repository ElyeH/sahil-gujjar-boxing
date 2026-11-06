(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Header state ---------- */
  const header = $('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  const toggle = $('.nav-toggle');
  const nav = $('#site-nav');
  const outside = [$('#main'), $('.site-footer'), $('[data-mobile-cta]')].filter(Boolean);
  const desktop = window.matchMedia('(min-width: 1000px)');

  const setMenu = (open, { returnFocus = true } = {}) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.visually-hidden').textContent = open ? 'Close menu' : 'Menu';
    nav.classList.toggle('is-open', open);
    header.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    outside.forEach((el) => (el.inert = open));
    if (open) nav.querySelector('a').focus();
    else if (returnFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && !desktop.matches) setMenu(false, { returnFocus: false });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false);
  });
  desktop.addEventListener('change', () => {
    if (desktop.matches && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, { returnFocus: false });
  });

  /* ---------- Active section highlighting ---------- */
  const navLinks = $$('.site-nav ul a');
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((a) => {
            if (a.hash === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    navLinks.forEach((a) => {
      const target = document.getElementById(a.hash.slice(1));
      if (target) sectionObserver.observe(target);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Mobile sticky CTA: visible after the hero, hidden near the form ---------- */
  const mobileCta = $('[data-mobile-cta]');
  const hero = $('.hero');
  const contact = $('#contact');
  if (mobileCta && 'IntersectionObserver' in window) {
    let pastHero = false;
    let atContact = false;
    const update = () => {
      const show = pastHero && !atContact;
      mobileCta.classList.toggle('is-visible', show);
      mobileCta.inert = !show;
    };
    new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; update(); }).observe(hero);
    new IntersectionObserver(([e]) => { atContact = e.isIntersecting; update(); }, { threshold: 0.05 }).observe(contact);
    update();
  }

  /* ---------- Preselect interest from CTAs ---------- */
  const interest = $('#f-interest');
  $$('[data-interest]').forEach((link) =>
    link.addEventListener('click', () => {
      if (!interest) return;
      const want = link.dataset.interest;
      if (want === 'program') interest.selectedIndex = 1;
      else interest.value = want;
    })
  );

  /* ---------- Lightbox ---------- */
  const dialog = $('[data-lightbox]');
  const links = $$('[data-gallery] a');
  if (dialog && typeof dialog.showModal === 'function' && links.length) {
    const img = $('[data-lb-img]', dialog);
    const caption = $('[data-lb-caption]', dialog);
    const count = $('[data-lb-count]', dialog);
    let index = 0;
    let opener = null;

    const srcsetFor = (full) => {
      const base = full.replace(/-\d+\.webp$/, '');
      return `${base}-800.webp 800w, ${base}-1200.webp 1200w, ${base}-1600.webp 1600w`;
    };

    const show = (i) => {
      index = (i + links.length) % links.length;
      const link = links[index];
      const thumb = link.querySelector('img');
      img.srcset = srcsetFor(link.dataset.full);
      img.sizes = '(min-width: 1000px) 70vw, 100vw';
      img.src = link.dataset.full;
      img.alt = thumb.alt;
      caption.textContent = link.dataset.caption || '';
      count.textContent = `Photo ${index + 1} of ${links.length}`;
    };

    links.forEach((link, i) =>
      link.addEventListener('click', (e) => {
        e.preventDefault();
        opener = link;
        show(i);
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        $('[data-lb-close]', dialog).focus();
      })
    );

    $('[data-lb-prev]', dialog).addEventListener('click', () => show(index - 1));
    $('[data-lb-next]', dialog).addEventListener('click', () => show(index + 1));
    $('[data-lb-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.classList.contains('lightbox__stage')) dialog.close();
    });
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1); }
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      if (opener) opener.focus();
    });

    let startX = null;
    dialog.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Contact form ---------- */
  const form = $('form[name="contact"]');
  if (!form) return;

  const status = $('[data-form-status]');
  const success = $('[data-form-success]');
  const wrap = $('[data-form-wrap]');
  const submit = form.querySelector('[type="submit"]');
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const rules = {
    name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : ''),
    email: (v) =>
      !v.trim() ? 'Please enter your email address.' : !emailRe.test(v.trim()) ? 'Please enter a valid email, like name@example.com.' : '',
    phone: (v) => (v.trim() && v.replace(/\D/g, '').length < 10 ? 'Please enter a full phone number, or leave this blank.' : ''),
    interest: (v) => (!v ? 'Please choose what you’re interested in.' : ''),
    experience: (v) => (!v ? 'Please choose your experience level.' : ''),
    message: (v) => (v.trim().length < 10 ? 'Please write a short message (at least 10 characters).' : ''),
  };

  const errorEl = (name) => (name === 'experience' ? $('#f-exp-err') : $(`#f-${name}-err`));

  const validateField = (name) => {
    const value = name === 'experience' ? (form.querySelector('[name="experience"]:checked') || {}).value || '' : form.elements[name].value;
    const msg = rules[name](value);
    errorEl(name).textContent = msg;
    if (name === 'experience') {
      $('[data-group="experience"]').setAttribute('aria-invalid', String(!!msg));
      $$('[name="experience"]', form).forEach((r) => r.setAttribute('aria-invalid', String(!!msg)));
    } else {
      form.elements[name].setAttribute('aria-invalid', String(!!msg));
    }
    return !msg;
  };

  const firstInvalidControl = (name) =>
    name === 'experience' ? form.querySelector('[name="experience"]') : form.elements[name];

  Object.keys(rules).forEach((name) => {
    const controls = name === 'experience' ? $$('[name="experience"]', form) : [form.elements[name]];
    controls.forEach((c) => {
      c.addEventListener('blur', () => { if (name !== 'experience' && c.value || c.getAttribute('aria-invalid') === 'true') validateField(name); });
      c.addEventListener('change', () => { if (c.getAttribute('aria-invalid') === 'true' || name === 'experience') validateField(name); });
      c.addEventListener('input', () => { if (c.getAttribute('aria-invalid') === 'true') validateField(name); });
    });
  });

  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;

    const invalid = Object.keys(rules).filter((name) => !validateField(name));
    if (invalid.length) {
      firstInvalidControl(invalid[0]).focus();
      return;
    }

    const data = new FormData(form);
    const showSuccess = () => {
      wrap.hidden = true;
      success.hidden = false;
      success.focus();
    };
    // Honeypot filled in: almost certainly a bot, so pretend it worked and send nothing.
    if (data.get('bot-field')) return showSuccess();

    // data-provider on the form: "formsubmit" or "formspree" (+ data-endpoint), "whatsapp" or "netlify".
    const provider = form.dataset.provider || 'netlify';

    if (provider === 'whatsapp') {
      const lines = [
        'Hi Sahil, I’d like to book a session.',
        `Name: ${data.get('name')}`,
        `Email: ${data.get('email')}`,
      ];
      if (data.get('phone')) lines.push(`Phone: ${data.get('phone')}`);
      lines.push(`Interested in: ${data.get('interest')}`, `Experience: ${data.get('experience')}`, '', data.get('message'));
      const waUrl = `https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
      const waLink = $('[data-wa-link]', success);
      if (waLink) waLink.href = waUrl;
      $$('[data-success-mode]', success).forEach((el) => (el.hidden = el.dataset.successMode !== 'whatsapp'));
      if (!isLocal) window.open(waUrl, '_blank', 'noopener');
      return showSuccess();
    }

    submit.setAttribute('aria-busy', 'true');
    submit.disabled = true;
    try {
      if (!isLocal) {
        if (provider === 'formspree' || provider === 'formsubmit') {
          data.delete('form-name');
          data.delete('bot-field');
          data.append('_subject', `New booking request from ${data.get('name')}`);
        }
        if (provider === 'formsubmit') {
          data.append('_template', 'table');
          data.append('_captcha', 'false');
        }
        const res =
          provider === 'formspree' || provider === 'formsubmit'
            ? await fetch(form.dataset.endpoint, { method: 'POST', headers: { Accept: 'application/json' }, body: data })
            : await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(data).toString(),
              });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // FormSubmit answers 200 even on failure (e.g. before the inbox is activated).
        if (provider === 'formsubmit') {
          const body = await res.json().catch(() => ({}));
          if (String(body.success) !== 'true') throw new Error(body.message || 'FormSubmit rejected the message');
        }
      }
      wrap.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (err) {
      status.textContent = 'Sorry — your message didn’t send. Please try again, or text Sahil at 805-258-9402.';
      status.hidden = false;
    } finally {
      submit.removeAttribute('aria-busy');
      submit.disabled = false;
    }
  });
})();
