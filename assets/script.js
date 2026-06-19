/* =========================================================
   Advald — interactions
   - Sticky header state
   - Mobile menu
   - Scroll reveal (IntersectionObserver)
   - Animated hero counters
   - Contact form validation (front-end demo)
   ========================================================= */
(function () {
  'use strict';

  const header = document.getElementById('siteHeader');
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  /* ---- Sticky header shadow ---- */
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 8);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Mobile menu toggle ---- */
  if (navToggle && mobileMenu) {
    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    };
    navToggle.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    mobileMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) closeMenu(); });
  }

  /* ---- Scroll reveal ---- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 8, 6) * 60}ms`;
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  /* ---- Animated counters ---- */
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = parseFloat(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window && counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  }

  /* ---- Footer year ---- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---- Contact form: AJAX submit to Netlify Forms ---- */
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (form) {
    const setStatus = (msg, error) => {
      if (!status) return;
      status.style.color = error ? '#ff8585' : '';
      status.textContent = msg;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.querySelector('#name');
      const submitBtn = form.querySelector('button[type="submit"]');

      // Minimal client-side validation
      if (!name.value.trim()) {
        name.classList.add('invalid');
        name.focus();
        setStatus('Please add your name so we can reply.', true);
        return;
      }
      name.classList.remove('invalid');

      // Encode all fields (incl. hidden form-name) for Netlify Forms
      const data = new FormData(form);
      const body = new URLSearchParams(data).toString();

      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      setStatus('Sending your request…');

      try {
        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });
        if (!res.ok) throw new Error('Request failed: ' + res.status);
        form.reset();
        setStatus('Thanks — your request was received. We’ll reply within one business day.');
      } catch (err) {
        // Fallback: let the browser do a native (non-AJAX) submit to Netlify
        setStatus('Network hiccup — submitting the usual way…', true);
        form.submit();
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });

    form.querySelector('#name').addEventListener('input', (e) => e.target.classList.remove('invalid'));

    // Show confirmation when Netlify redirects back with ?submitted=1 (no-JS path)
    if (new URLSearchParams(location.search).get('submitted') === '1') {
      setStatus('Thanks — your request was received. We’ll reply within one business day.');
    }
  }

  /* ---- Animated particle mesh (hero visual) ---- */
  const canvas = document.getElementById('meshCanvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    // Two-tone palette in the Advald brand teal family. ALPHA is swapped per draw.
    const TEAL = 'rgba(31, 179, 154, ALPHA)';   // brand teal (matches --accent)
    const AQUA = 'rgba(64, 224, 200, ALPHA)';   // brighter aqua highlight
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    let pulses = [];          // expanding rings = "clicks" rippling through the network
    let lastPulse = 0;
    let raf = null;
    const pointer = { x: -999, y: -999, active: false };

    const LINK = 132;             // px distance to draw a connecting line
    const PULSE_EVERY = 720;      // ms between auto-fired clicks
    const PULSE_SPEED = 1.7;      // px per frame the ring expands
    const PULSE_MAX = LINK * 2.4; // ring lifespan in px

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Node count scales with area, capped for performance (full-bleed background)
      const count = Math.max(48, Math.min(140, Math.round((w * h) / 6500)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 1,
        glow: 0,
        // ~1 in 3 nodes are the brighter aqua, the rest brand teal
        c: Math.random() < 0.34 ? AQUA : TEAL
      }));
    };

    // Fire a "click" from a node: a ripple that travels the network toward action
    const firePulse = (node) => {
      const n = node || nodes[(Math.random() * nodes.length) | 0];
      if (n) pulses.push({ x: n.x, y: n.y, r: 0, c: n.c });
    };

    const draw = (ts) => {
      ts = ts || 0;
      ctx.clearRect(0, 0, w, h);

      // Auto-fire clicks on an interval
      if (!reduceMotion && ts - lastPulse > PULSE_EVERY && pulses.length < 6) {
        firePulse();
        lastPulse = ts;
      }

      // Move nodes + reset their glow for this frame
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;

        // Gentle pull toward the pointer for interactivity
        if (pointer.active) {
          const dx = pointer.x - n.x, dy = pointer.y - n.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14000 && d2 > 1) {
            const f = 0.0012;
            n.vx += dx * f; n.vy += dy * f;
          }
        }
        n.vx *= 0.99; n.vy *= 0.99; // damping keeps it calm
        n.glow = 0;
      }

      // Update + draw pulses; light up nodes the ring is currently crossing
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pl = pulses[p];
        pl.r += PULSE_SPEED;
        const life = 1 - pl.r / PULSE_MAX;
        if (life <= 0) { pulses.splice(p, 1); continue; }

        for (const n of nodes) {
          const ring = Math.abs(Math.hypot(n.x - pl.x, n.y - pl.y) - pl.r);
          if (ring < 10) n.glow = Math.max(n.glow, life);
        }

        ctx.beginPath();
        ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
        ctx.strokeStyle = pl.c.replace('ALPHA', (life * 0.45).toFixed(3));
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      // Draw links — tinted aqua if either endpoint is aqua, else teal
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK) {
            const alpha = (1 - dist / LINK) * 0.45;
            const tint = (a.c === AQUA || b.c === AQUA) ? AQUA : TEAL;
            ctx.strokeStyle = tint.replace('ALPHA', alpha.toFixed(3));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes last, brightening any the pulse is passing through
      for (const n of nodes) {
        const r = n.r + n.glow * 2.6;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.c.replace('ALPHA', (0.6 + n.glow * 0.4).toFixed(3));
        ctx.fill();
        if (n.glow > 0.04) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 3, 0, Math.PI * 2);
          ctx.strokeStyle = n.c.replace('ALPHA', (n.glow * 0.4).toFixed(3));
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!raf && !reduceMotion) raf = requestAnimationFrame(draw); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    resize();
    if (reduceMotion) {
      draw(0); // render a single static frame
    } else {
      start();
    }

    // Pause when offscreen to save CPU
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0.05 }).observe(canvas);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });

    // The canvas is a non-interactive background, so listen on the hero itself.
    const heroEl = canvas.closest('.hero') || canvas.parentElement;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (heroEl) {
      // Pointer attraction only on hover-capable devices (skips touch to save mobile CPU)
      if (finePointer) {
        heroEl.addEventListener('pointermove', (e) => {
          const rect = canvas.getBoundingClientRect();
          pointer.x = e.clientX - rect.left;
          pointer.y = e.clientY - rect.top;
          pointer.active = true;
        });
        heroEl.addEventListener('pointerleave', () => { pointer.active = false; pointer.x = pointer.y = -999; });
      }

      // A click anywhere in the hero fires a ripple from the nearest node
      heroEl.addEventListener('click', (e) => {
        if (reduceMotion || !nodes.length) return;
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
        let nearest = nodes[0], best = Infinity;
        for (const n of nodes) {
          const d = (n.x - cx) ** 2 + (n.y - cy) ** 2;
          if (d < best) { best = d; nearest = n; }
        }
        firePulse(nearest);
      });
    }
  }
})();
