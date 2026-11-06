/**
 * world.js — Spatial WebGL Journey Engine
 * Fully synchronized with scroll progression across page chapters.
 * Powered by Three.js with strict color harmony:
 *   - Obsidian Deep Space: #07080a
 *   - Cyber Lime:          #c8f542
 *   - Electric Cyan:       #38bdf8
 *   - Silver Starlight:    #f3f4f6
 */
(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const THREE = window.THREE;
  if (!THREE) {
    init2DFallback();
    return;
  }

  /* ── 1. Color Palette Tokens ── */
  const COLOR_HEX_BG    = 0x07080a;
  const COLOR_HEX_LIME  = 0xc8f542;
  const COLOR_HEX_CYAN  = 0x38bdf8;
  const COLOR_HEX_WHITE = 0xf3f4f6;

  /* ── 2. Chapter Waypoint Definitions ── */
  const CHAPTERS = [
    { threshold: 0.18, name: '01 / ORIGIN CORE' },
    { threshold: 0.42, name: '02 / SELECTED WORK' },
    { threshold: 0.68, name: '03 / JOURNEY STRAND' },
    { threshold: 0.86, name: '04 / TOOLKIT MATRIX' },
    { threshold: 1.00, name: '05 / COLLABORATION' }
  ];

  let renderer, scene, camera;
  let animId = null;
  let isTabActive = !document.hidden;

  let starPoints, starGeo;
  let heroIcosahedron, heroInnerRing, heroOuterRing;
  let workRingSystem, journeyHelix, stackMatrix, footerPortal;
  const shockwaves = [];

  const pointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  };

  let scrollProgress = 0;
  let targetCamZ = 24;
  let targetCamY = 0;
  let targetCamX = 0;
  let currentCamZ = 24;
  let currentCamY = 0;
  let currentCamX = 0;
  let lastScrollY = window.scrollY || 0;
  let scrollVelocity = 0;

  /* ── 3. WebGL Scene & Camera Initialization ── */
  function initWebGL() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('WebGL init failed, using fallback:', e);
      init2DFallback();
      return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLOR_HEX_BG, 0.015);

    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 280);
    camera.position.set(0, 0, 24);

    buildStarfield();
    buildChapterLandmarks();
    return true;
  }

  /* ── 4. Deep Volumetric Starfield (1200 Starlight Nodes) ── */
  function buildStarfield() {
    const starCount = window.innerWidth < 820 ? 600 : 1200;
    const coords = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const cWhite = new THREE.Color(COLOR_HEX_WHITE);
    const cCyan  = new THREE.Color(COLOR_HEX_CYAN);
    const cLime  = new THREE.Color(COLOR_HEX_LIME);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      coords[idx]     = (Math.random() - 0.5) * 85;
      coords[idx + 1] = (Math.random() - 0.5) * 85;
      coords[idx + 2] = 30 - Math.random() * 150; // spans Z from +30 to -120

      // Color distribution: 75% subtle white, 15% cyan, 10% lime
      const roll = Math.random();
      const col = roll > 0.25 ? cWhite : (roll > 0.10 ? cCyan : cLime);
      colors[idx]     = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);
  }

  /* ── 5. Spatial Wireframe Chapter Landmarks ── */
  function buildChapterLandmarks() {
    /* ── Chapter 01 (Hero / Origin): Geodesic Core ── */
    const heroGroup = new THREE.Group();
    heroGroup.position.set(window.innerWidth < 820 ? 0 : 8, 1, 0);

    const icoGeo = new THREE.IcosahedronGeometry(4.2, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      wireframe: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });
    heroIcosahedron = new THREE.Mesh(icoGeo, icoMat);
    heroGroup.add(heroIcosahedron);

    // Inner orbiting cyan ring
    const ringGeoA = new THREE.TorusGeometry(5.2, 0.05, 12, 64);
    const ringMatA = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_CYAN,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    heroInnerRing = new THREE.Mesh(ringGeoA, ringMatA);
    heroInnerRing.rotation.x = Math.PI / 3;
    heroGroup.add(heroInnerRing);

    // Outer subtle cyber-lime ring
    const ringGeoB = new THREE.TorusGeometry(6.4, 0.04, 12, 64);
    const ringMatB = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      transparent: true,
      opacity: 0.40,
      blending: THREE.AdditiveBlending
    });
    heroOuterRing = new THREE.Mesh(ringGeoB, ringMatB);
    heroOuterRing.rotation.y = Math.PI / 4;
    heroGroup.add(heroOuterRing);

    scene.add(heroGroup);

    /* ── Chapter 02 (Selected Work): Floating Cyber Ring System ── */
    workRingSystem = new THREE.Group();
    workRingSystem.position.set(-6, -6, -26);

    const ringCGeo = new THREE.TorusGeometry(5.8, 0.06, 16, 72);
    const ringCMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_CYAN,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const workRingMesh = new THREE.Mesh(ringCGeo, ringCMat);
    workRingMesh.rotation.x = Math.PI / 2.5;
    workRingSystem.add(workRingMesh);

    // Internal geometric diamond
    const octGeo = new THREE.OctahedronGeometry(2.4, 0);
    const octMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const octMesh = new THREE.Mesh(octGeo, octMat);
    workRingSystem.add(octMesh);

    scene.add(workRingSystem);

    /* ── Chapter 03 (Story & Journey): Spatial Double Helix ── */
    journeyHelix = new THREE.Group();
    journeyHelix.position.set(7, -12, -52);

    const helixCurvePointsA = [];
    const helixCurvePointsB = [];
    for (let t = 0; t <= 24; t += 0.5) {
      const angle = t * 0.45;
      const radius = 2.8;
      const y = (t - 12) * 0.9;
      helixCurvePointsA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      helixCurvePointsB.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));
    }

    const helixGeoA = new THREE.BufferGeometry().setFromPoints(helixCurvePointsA);
    const helixMatA = new THREE.LineBasicMaterial({
      color: COLOR_HEX_LIME,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    journeyHelix.add(new THREE.Line(helixGeoA, helixMatA));

    const helixGeoB = new THREE.BufferGeometry().setFromPoints(helixCurvePointsB);
    const helixMatB = new THREE.LineBasicMaterial({
      color: COLOR_HEX_CYAN,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    journeyHelix.add(new THREE.Line(helixGeoB, helixMatB));

    scene.add(journeyHelix);

    /* ── Chapter 04 (Toolkit & Stack): High-Tech Tesseract Grid ── */
    stackMatrix = new THREE.Group();
    stackMatrix.position.set(-5, -18, -76);

    const boxGeo = new THREE.BoxGeometry(4.5, 4.5, 4.5);
    const boxMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const outerBox = new THREE.Mesh(boxGeo, boxMat);
    stackMatrix.add(outerBox);

    const innerBoxGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const innerBoxMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_CYAN,
      wireframe: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const innerBox = new THREE.Mesh(innerBoxGeo, innerBoxMat);
    stackMatrix.add(innerBox);

    scene.add(stackMatrix);

    /* ── Chapter 05 (Collaborate & Footer): Horizon Portal ── */
    footerPortal = new THREE.Group();
    footerPortal.position.set(0, -24, -98);

    const portalGeo = new THREE.TorusGeometry(8.5, 0.08, 16, 80);
    const portalMat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending
    });
    const portalMesh = new THREE.Mesh(portalGeo, portalMat);
    footerPortal.add(portalMesh);

    scene.add(footerPortal);
  }

  /* ── 6. Interactive Shockwave Ripple in 3D ── */
  function triggerShockwave() {
    if (!scene || !camera) return;
    if (shockwaves.length > 4) {
      const old = shockwaves.shift();
      scene.remove(old.mesh);
      old.geo.dispose();
      old.mat.dispose();
    }

    const geo = new THREE.RingGeometry(0.1, 0.4, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: COLOR_HEX_LIME,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Position shockwave in front of camera
    mesh.position.copy(camera.position);
    mesh.position.z -= 8;
    mesh.position.x += pointer.x * 3.5;
    mesh.position.y -= pointer.y * 2.5;
    mesh.rotation.copy(camera.rotation);

    scene.add(mesh);
    shockwaves.push({ mesh, geo, mat, scale: 1, opacity: 0.85 });
  }

  window.addEventListener('click', triggerShockwave, { passive: true });
  window.addEventListener('touchstart', triggerShockwave, { passive: true });

  /* ── 7. Pointer Move Tracking ── */
  function onPointerMove(clientX, clientY) {
    pointer.targetX = (clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (clientY / window.innerHeight) * 2 - 1;
  }

  window.addEventListener('mousemove', (e) => {
    onPointerMove(e.clientX, e.clientY);
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
  });

  /* ── 8. Scroll Flight Calculation ── */
  function onScroll() {
    const currentScrollY = window.scrollY || window.pageYOffset;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = Math.min(1, Math.max(0, currentScrollY / maxScroll));

    // Dynamic camera flight coordinates driven by scroll progress
    targetCamZ = 24 - scrollProgress * 122; // Travel from +24 down to -98
    targetCamY = -scrollProgress * 24;
    targetCamX = Math.sin(scrollProgress * Math.PI * 1.5) * 5.5;

    scrollVelocity = Math.abs(currentScrollY - lastScrollY);
    lastScrollY = currentScrollY;

    // HUD Update
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (scrollProgress <= CHAPTERS[i].threshold || i === CHAPTERS.length - 1) {
        if (hudPhase && hudPhase.textContent !== CHAPTERS[i].name) {
          hudPhase.textContent = CHAPTERS[i].name;
        }
        break;
      }
    }

    if (hudCoords) {
      hudCoords.textContent = `Z: ${currentCamZ.toFixed(0)}m · CLASS '30`;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  function onResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  window.addEventListener('resize', onResize, { passive: true });

  /* ── 9. Render & Animation Loop ── */
  let lastTime = performance.now();

  function animate(now) {
    if (!isTabActive) return;
    animId = requestAnimationFrame(animate);

    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    const elapsed = now * 0.001;

    // Smooth pointer damping
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;

    // Smooth camera travel interpolation (The "going with scrolling" feel)
    currentCamZ += (targetCamZ - currentCamZ) * 0.065;
    currentCamY += (targetCamY - currentCamY) * 0.065;
    currentCamX += (targetCamX - currentCamX) * 0.065;

    camera.position.x = currentCamX + pointer.x * 2.2;
    camera.position.y = currentCamY - pointer.y * 1.8;
    camera.position.z = currentCamZ;

    // Parallax look-ahead
    camera.rotation.y = -pointer.x * 0.12 + Math.sin(scrollProgress * Math.PI) * 0.08;
    camera.rotation.x = pointer.y * 0.10;

    // Starfield gentle rotation
    if (starPoints) {
      starPoints.rotation.y = elapsed * 0.015;
      starPoints.rotation.z = elapsed * 0.008;
    }

    // Animate Chapter 01 (Hero Icosahedron & Rings)
    if (heroIcosahedron) {
      heroIcosahedron.rotation.x = elapsed * 0.22;
      heroIcosahedron.rotation.y = elapsed * 0.32;
    }
    if (heroInnerRing) {
      heroInnerRing.rotation.z = -elapsed * 0.45;
    }
    if (heroOuterRing) {
      heroOuterRing.rotation.y = elapsed * 0.35;
    }

    // Animate Chapter 02 (Work Ring)
    if (workRingSystem) {
      workRingSystem.rotation.y = elapsed * 0.28;
      workRingSystem.rotation.z = Math.sin(elapsed * 0.3) * 0.15;
    }

    // Animate Chapter 03 (Journey Helix)
    if (journeyHelix) {
      journeyHelix.rotation.y = elapsed * 0.4;
    }

    // Animate Chapter 04 (Stack Matrix)
    if (stackMatrix) {
      stackMatrix.rotation.x = elapsed * 0.25;
      stackMatrix.rotation.y = elapsed * 0.35;
    }

    // Animate Chapter 05 (Footer Portal)
    if (footerPortal) {
      footerPortal.rotation.z = elapsed * 0.18;
    }

    // Animate Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.scale += 0.28;
      sw.opacity *= 0.93;
      sw.mesh.scale.set(sw.scale, sw.scale, 1);
      sw.mat.opacity = sw.opacity;

      if (sw.opacity < 0.02) {
        scene.remove(sw.mesh);
        sw.geo.dispose();
        sw.mat.dispose();
        shockwaves.splice(i, 1);
      }
    }

    // Live HUD updates
    if (hudCoords && Math.floor(now / 150) % 4 === 0) {
      hudCoords.textContent = `Z: ${currentCamZ.toFixed(0)}m · CLASS '30`;
    }

    renderer.render(scene, camera);
  }

  /* ── 10. Tab Inactive / Battery Saver ── */
  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animId) {
      lastTime = performance.now();
      animate(lastTime);
    } else if (!isTabActive && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  if (initWebGL()) {
    onScroll();
    if (!prefersReducedMotion) {
      lastTime = performance.now();
      animate(lastTime);
    } else {
      camera.position.set(0, 0, 24);
      renderer.render(scene, camera);
    }
  }

  /* ── 11. Zero-Error Fallback (if WebGL is blocked or disabled) ── */
  function init2DFallback() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const count = window.innerWidth < 820 ? 30 : 60;
    const particles = [];

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.5 + 0.9,
        color: Math.random() > 0.35 ? 'rgba(200, 245, 66, ' : 'rgba(56, 189, 248, '
      });
    }

    function draw() {
      if (!isTabActive) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '0.7)';
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(200, 245, 66, ${alpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }, { passive: true });

    draw();
  }
})();
