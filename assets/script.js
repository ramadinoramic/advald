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

  /* ---- Contact form (front-end demo handling) ---- */
  const form = document.getElementById('contactForm');
  const status = document.getElementById('formStatus');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.querySelector('#name');
      let valid = true;

      if (!name.value.trim()) {
        name.classList.add('invalid');
        valid = false;
      } else {
        name.classList.remove('invalid');
      }

      if (!valid) {
        if (status) { status.style.color = '#ff8585'; status.textContent = 'Please add your name so we can reply.'; }
        return;
      }

      if (status) {
        status.style.color = '';
        status.textContent = 'Thanks — your request was received. We’ll reply within one business day.';
      }
      form.reset();
    });

    form.querySelector('#name').addEventListener('input', (e) => e.target.classList.remove('invalid'));
  }

  /* ---- Animated particle mesh (hero visual) ---- */
  const canvas = document.getElementById('meshCanvas');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    // Two-tone palette: lime accent + electric blue. ALPHA is swapped per draw.
    const LIME = 'rgba(200, 255, 77, ALPHA)';
    const BLUE = 'rgba(90, 209, 255, ALPHA)';
    let w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    let raf = null;
    const pointer = { x: -999, y: -999, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Node count scales with area, capped for performance (denser mesh)
      const count = Math.max(40, Math.min(104, Math.round((w * h) / 5400)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 1,
        // ~1 in 3 nodes are blue, the rest lime
        c: Math.random() < 0.34 ? BLUE : LIME
      }));
    };

    const LINK = 132; // px distance to draw a connecting line

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Update + draw nodes
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
        // Damping so velocities stay calm
        n.vx *= 0.99; n.vy *= 0.99;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.c.replace('ALPHA', '0.9');
        ctx.fill();
      }

      // Draw links — a link tinted blue if either endpoint is blue, else lime
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK) {
            const alpha = (1 - dist / LINK) * 0.45;
            const tint = (a.c === BLUE || b.c === BLUE) ? BLUE : LIME;
            ctx.strokeStyle = tint.replace('ALPHA', alpha.toFixed(3));
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => { if (!raf && !reduceMotion) raf = requestAnimationFrame(draw); };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = null; } };

    resize();
    if (reduceMotion) {
      draw(); // render a single static frame
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

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    });
    canvas.addEventListener('pointerleave', () => { pointer.active = false; pointer.x = pointer.y = -999; });
  }
})();
