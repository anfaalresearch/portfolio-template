(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let animId = null;
  let isTabActive = !document.hidden;

  const pointer = { x: -1000, y: -1000, isHover: false };
  let scrollY = window.scrollY || 0;
  let scrollProgress = 0;

  // Chapter phases mapped to scroll percent
  const PHASES = [
    { threshold: 0.20, name: '01 / ORIGIN' },
    { threshold: 0.45, name: '02 / SELECTED WORK' },
    { threshold: 0.70, name: '03 / STORY & JOURNEY' },
    { threshold: 0.88, name: '04 / TOOLKIT & STACK' },
    { threshold: 1.00, name: '05 / COLLABORATE' }
  ];

  /* ── Harmonized Palette (Cyber-Steel & Lime) ── */
  const COLOR_LIME = 'rgba(200, 245, 66, ';
  const COLOR_CYAN = 'rgba(56, 189, 248, ';
  const COLOR_STEEL = 'rgba(243, 244, 246, ';

  let particles = [];
  let stars = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    initParticles();
    initStars();
  }

  function initParticles() {
    particles = [];
    const isMobile = width < 820;
    const count = isMobile ? 32 : 65;

    for (let i = 0; i < count; i++) {
      const isLime = Math.random() > 0.35;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        baseY: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.6 + 0.9,
        z: Math.random() * 0.8 + 0.4, // depth factor
        colorBase: isLime ? COLOR_LIME : COLOR_CYAN,
        glowColor: isLime ? 'rgba(200, 245, 66, 0.25)' : 'rgba(56, 189, 248, 0.25)'
      });
    }
  }

  function initStars() {
    stars = [];
    const count = width < 820 ? 60 : 140;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.8 + 0.3,
        alpha: Math.random() * 0.4 + 0.1,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  /* ── Pointer & Scroll Listeners ── */
  if (isFinePointer) {
    window.addEventListener('mousemove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.isHover = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      pointer.x = -1000;
      pointer.y = -1000;
      pointer.isHover = false;
    });
  }

  function updateScroll() {
    scrollY = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = Math.min(1, Math.max(0, scrollY / maxScroll));

    for (let i = 0; i < PHASES.length; i++) {
      if (scrollProgress <= PHASES[i].threshold || i === PHASES.length - 1) {
        if (hudPhase && hudPhase.textContent !== PHASES[i].name) {
          hudPhase.textContent = PHASES[i].name;
        }
        break;
      }
    }

    if (hudCoords) {
      hudCoords.textContent = `SCROLL: ${(scrollProgress * 100).toFixed(0)}% · SYNC: 100%`;
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  /* ── Render Loop with Exact Brand Color Harmony ── */
  let frameCount = 0;

  function draw() {
    if (!isTabActive) return;
    animId = requestAnimationFrame(draw);
    frameCount++;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw subtle background starlight field
    for (let s of stars) {
      s.twinklePhase += s.twinkleSpeed;
      const curAlpha = s.alpha + Math.sin(s.twinklePhase) * 0.15;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(243, 244, 246, ${Math.max(0.04, curAlpha)})`;
      ctx.fill();
    }

    const maxLineDist = width < 820 ? 95 : 130;
    const maxMouseDist = 145;

    // 2. Update and draw constellation nodes
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      p.x += p.vx * p.z;
      p.y += p.vy * p.z;

      // Soft bounce within viewport boundaries
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      else if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      else if (p.y > height) { p.y = height; p.vy *= -1; }

      // Gentle interactive mouse attraction
      if (pointer.isHover) {
        const dxm = pointer.x - p.x;
        const dym = pointer.y - p.y;
        const distM = Math.sqrt(dxm * dxm + dym * dym);
        if (distM < maxMouseDist) {
          const force = (1 - distM / maxMouseDist) * 0.015;
          p.vx += dxm * force;
          p.vy += dym * force;

          // Electric cyan laser link to cursor
          const mAlpha = (1 - distM / maxMouseDist) * 0.35;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = COLOR_CYAN + mAlpha + ')';
          ctx.lineWidth = 1.1;
          ctx.stroke();
        }
      }

      // Inter-node constellation links (Cyber-Lime)
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxLineDist) {
          const lineAlpha = (1 - dist / maxLineDist) * 0.22;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = COLOR_LIME + lineAlpha + ')';
          ctx.lineWidth = 0.85;
          ctx.stroke();
        }
      }

      // Node glowing halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.glowColor;
      ctx.fill();

      // Node solid core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.colorBase + '0.9)';
      ctx.fill();
    }
  }

  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animId) {
      draw();
    } else if (!isTabActive && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  resize();
  updateScroll();

  if (!prefersReducedMotion) {
    draw();
  }
})();
