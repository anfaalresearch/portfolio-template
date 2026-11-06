(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');

  let width = 0;
  let height = 0;
  let animId = null;
  let isTabActive = !document.hidden;

  // Pointer state with smooth spring easing
  const pointer = {
    x: -2000,
    y: -2000,
    targetX: -2000,
    targetY: -2000,
    active: false,
    radius: 170
  };

  // Shockwave ripples on click / tap
  const ripples = [];

  let scrollY = window.scrollY || 0;
  let scrollProgress = 0;

  const PHASES = [
    { threshold: 0.20, name: '01 / ORIGIN' },
    { threshold: 0.45, name: '02 / SELECTED WORK' },
    { threshold: 0.70, name: '03 / STORY & JOURNEY' },
    { threshold: 0.88, name: '04 / TOOLKIT & STACK' },
    { threshold: 1.00, name: '05 / COLLABORATE' }
  ];

  /* ── Strict Harmonized Palette (Cyber-Steel & Lime) ── */
  const COLOR_LIME = 'rgba(200, 245, 66, ';
  const COLOR_CYAN = 'rgba(56, 189, 248, ';
  const COLOR_WHITE = 'rgba(243, 244, 246, ';

  let particles = [];
  let stars = [];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    initParticles();
    initStars();
  }

  function initParticles() {
    particles = [];
    const isMobile = width < 820;
    const count = isMobile ? 32 : 68;

    for (let i = 0; i < count; i++) {
      const isLime = Math.random() > 0.32;
      const depth = Math.random() * 0.9 + 0.5; // 3D depth layer 0.5 - 1.4

      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.55 * depth,
        vy: (Math.random() - 0.5) * 0.55 * depth,
        ox: 0,
        oy: 0,
        radius: (Math.random() * 1.5 + 1.0) * depth,
        depth,
        isLime,
        pulseOffset: Math.random() * Math.PI * 2,
        flare: 0 // energy flare on shockwave
      });
    }
  }

  function initStars() {
    stars = [];
    const count = width < 820 ? 70 : 160;
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 0.8 + 0.3,
        alpha: Math.random() * 0.35 + 0.08,
        speed: Math.random() * 0.025 + 0.008,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /* ── Interactive Pointer & Touch Tracking ── */
  function onPointerMove(clientX, clientY) {
    pointer.targetX = clientX;
    pointer.targetY = clientY;
    pointer.active = true;
  }

  window.addEventListener('mousemove', (e) => {
    onPointerMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    pointer.targetX = -2000;
    pointer.targetY = -2000;
    pointer.active = false;
  });

  // Mobile Touch Support
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) {
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY);
      triggerShockwave(t.clientX, t.clientY);
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY);
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    pointer.targetX = -2000;
    pointer.targetY = -2000;
    pointer.active = false;
  });

  // Click / Tap Interactive Shockwave
  function triggerShockwave(x, y) {
    if (ripples.length > 5) ripples.shift();
    ripples.push({
      x,
      y,
      radius: 5,
      maxRadius: Math.min(width, height) * 0.35,
      alpha: 0.85,
      speed: 7
    });
  }

  window.addEventListener('click', (e) => {
    triggerShockwave(e.clientX, e.clientY);
  }, { passive: true });

  /* ── Scroll & Phase Synchronization ── */
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
      hudCoords.textContent = `PROGRESS: ${(scrollProgress * 100).toFixed(0)}% · CLASS '30`;
    }
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });

  /* ── High-Performance Render Loop ── */
  let lastTime = performance.now();

  function draw(currentTime) {
    if (!isTabActive) return;
    animId = requestAnimationFrame(draw);

    const dt = Math.min((currentTime - lastTime) / 1000, 0.033);
    lastTime = currentTime;

    ctx.clearRect(0, 0, width, height);

    // Smooth pointer spring interpolation
    if (pointer.active) {
      pointer.x += (pointer.targetX - pointer.x) * 0.15;
      pointer.y += (pointer.targetY - pointer.y) * 0.15;
    } else {
      pointer.x = -2000;
      pointer.y = -2000;
    }

    // 1. Draw Deep Starlight Field (Layer 1)
    for (let s of stars) {
      s.phase += s.speed;
      const alpha = Math.max(0.04, s.alpha + Math.sin(s.phase) * 0.12);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${COLOR_WHITE}${alpha})`;
      ctx.fill();
    }

    // 2. Process & Draw Shockwave Ripples
    for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
      const rip = ripples[rIdx];
      rip.radius += rip.speed;
      rip.alpha *= 0.94;

      if (rip.alpha < 0.02 || rip.radius > rip.maxRadius) {
        ripples.splice(rIdx, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `${COLOR_LIME}${rip.alpha * 0.7})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Shockwave push on nearby particles
      const rSq = rip.radius * rip.radius;
      for (let p of particles) {
        const dx = p.x - rip.x;
        const dy = p.y - rip.y;
        const dSq = dx * dx + dy * dy;
        const diff = Math.abs(Math.sqrt(dSq) - rip.radius);
        if (diff < 35) {
          const push = (1 - diff / 35) * 1.8;
          const angle = Math.atan2(dy, dx);
          p.x += Math.cos(angle) * push;
          p.y += Math.sin(angle) * push;
          p.flare = Math.min(1, p.flare + 0.6);
        }
      }
    }

    const maxLineDist = width < 820 ? 95 : 135;
    const maxLineDistSq = maxLineDist * maxLineDist;
    const maxMouseDist = pointer.radius;
    const maxMouseDistSq = maxMouseDist * maxMouseDist;

    // 3. Update & Render Interactive Constellation Mesh (Layer 2 & 3)
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Organic drift with depth scaling
      p.x += p.vx;
      p.y += p.vy;

      // Soft decay of energy flare
      if (p.flare > 0.01) p.flare *= 0.92;
      else p.flare = 0;

      // Smooth bounce on canvas boundaries
      if (p.x < 0) { p.x = 0; p.vx *= -1; }
      else if (p.x > width) { p.x = width; p.vx *= -1; }
      if (p.y < 0) { p.y = 0; p.vy *= -1; }
      else if (p.y > height) { p.y = height; p.vy *= -1; }

      // Gravitational pull & electric laser link to pointer
      if (pointer.active) {
        const dxm = pointer.x - p.x;
        const dym = pointer.y - p.y;
        const distSq = dxm * dxm + dym * dym;

        if (distSq < maxMouseDistSq) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / maxMouseDist) * 0.022 * p.depth;
          p.vx += dxm * force;
          p.vy += dym * force;

          // Electric Cyan connection beam
          const mAlpha = (1 - dist / maxMouseDist) * 0.42;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.strokeStyle = `${COLOR_CYAN}${mAlpha})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      // Inter-node hairline constellation links
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < maxLineDistSq) {
          const dist = Math.sqrt(distSq);
          const lineAlpha = (1 - dist / maxLineDist) * (0.24 + Math.max(p.flare, p2.flare) * 0.4);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `${COLOR_LIME}${lineAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }

      // Draw Glowing Node
      p.pulseOffset += 0.035;
      const pulse = 1 + Math.sin(p.pulseOffset) * 0.15 + p.flare * 0.8;
      const colorBase = p.isLime ? COLOR_LIME : COLOR_CYAN;

      // Soft ambient glow halo
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2.8 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `${colorBase}${0.18 + p.flare * 0.35})`;
      ctx.fill();

      // Solid crisp core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `${colorBase}${0.95})`;
      ctx.fill();
    }
  }

  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animId) {
      lastTime = performance.now();
      draw(lastTime);
    } else if (!isTabActive && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  resize();
  updateScroll();

  if (!prefersReducedMotion) {
    lastTime = performance.now();
    draw(lastTime);
  }
})();
