/**
 * ══════════════════════════════════════════════════════════════════
 * CYBER GATEWAY & 3D GEOMETRIC HIGHWAY — Optimized WebGL Spatial Engine
 * ══════════════════════════════════════════════════════════════════
 *  - Hero: Pristine Cyber Iris Aperture stands in deep space.
 *          Base is deep obsidian #07080a. ZERO square panels, zero blobs.
 *          White headings and copy are 100% crisp and readable.
 *  - Scroll (0% -> 15%): The aperture rings rotate and expand outward.
 *  - Transit (15% -> 85%): Camera accelerates forward into the 3D Highway.
 *            Featuring sparse, delicate 3D floating Crystal Diamonds
 *            (Octahedrons) & Geodesic Spheres with orbital rings.
 *            Little objects · Zero flat squares · Far periphery margins.
 *  - Mobile Optimized: Adaptive DPR, reduced geometry, zero jank, 60-120 FPS.
 */

// Tunable Configuration Object
const CONFIG = {
  accentColor: '#c8f542',     // Brand cyber-lime accent
  accentColorHex: 0xc8f542,
  cyanColorHex: 0x38bdf8,     // Technical electric cyan
  bgColorHex: 0x07080a,       // Deep obsidian space base
  
  doorRadius: 3.8,            // Radius of the cyber aperture gateway
  tunnelRadius: 9.2,          // Wide tunnel radius pushed to screen periphery
  doorZ: 0,                   // Z position of the portal door
  
  cameraStartPosZ: 16,        // Camera starts outside looking at portal door
  smoothing: 0.08,            // Scroll lerp inertia factor
  mouseParallaxMax: 0.022,    // Gentle perspective shift on mouse move
  mouseEasing: 0.06
};

if (typeof window !== 'undefined') {
  window.PORTAL_CONFIG = CONFIG;
}

(function initCyberPortal() {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const hudPhase = document.getElementById('hud-phase');
  const exploreHint = document.getElementById('explore-hint');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768 || ('ontouchstart' in window);

  const THREE = window.THREE;
  if (!THREE) {
    console.warn('[CyberPortal] THREE is not loaded.');
    return;
  }

  /* ── 1. SECTION CHECKPOINTS DEFINITION ──────────────────────── */
  const CHECKPOINTS = [
    { id: 'about',   phase: '01 / PORTAL GATEWAY',       name: 'Origin' },
    { id: 'work',    phase: '02 / SELECTED WORK',        name: 'Selected Work' },
    { id: 'journey', phase: '03 / STORY & JOURNEY',      name: 'Story & Journey' },
    { id: 'toolkit', phase: '04 / TOOLKIT MATRIX',       name: 'Toolkit Matrix' },
    { id: 'contact', phase: '05 / DESTINATION REACHED',  name: 'Collaborate' }
  ];

  /* ── 2. THREE.JS SCENE SETUP ────────────────────────────────── */
  let renderer, scene, camera;
  let tunnelSpline;
  let apertureGroup, apertureOuterRim, apertureInnerHex, apertureBlades, apertureLockBadge;
  let tunnelRingsGroup, warpRailsGroup, holoObjectsGroup, codeDustPoints;
  const holo3DItems = [];

  const scrollRef = {
    progress: 0,
    smoothed: 0,
    hasScrolled: false
  };

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isTabActive = !document.hidden;

  const _vLookAt   = new THREE.Vector3();
  const _vSplinePt = new THREE.Vector3();

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile && window.devicePixelRatio < 2,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      });
    } catch (e) {
      console.warn('[CyberPortal] WebGL initialization failed:', e);
      return false;
    }

    // Adaptive DPR: Mobile clamped to 1.25 for battery & thermal efficiency
    const maxDpr = isMobile ? 1.25 : 1.75;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(CONFIG.bgColorHex, 0.018);

    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 260);
    camera.position.set(0, 0.2, CONFIG.cameraStartPosZ);

    buildSpline();
    buildCyberAperture();
    buildCodeHighway();
    buildHolo3DObjects();
    buildCodeDust();

    return true;
  }

  /* ── 3. 3D TUNNEL SPLINE PATH ───────────────────────────────── */
  function buildSpline() {
    // Smooth spline starting at aperture portal and traveling through depth
    const points = [
      new THREE.Vector3(0, 0.2, 16),          // Hero camera rest (u = 0)
      new THREE.Vector3(0, 0, 0),             // Aperture threshold (u ~ 0.11)
      new THREE.Vector3(-3.5, 1.5, -28),      // Selected Work
      new THREE.Vector3(-6.0, -1.0, -56),     // Work apex
      new THREE.Vector3(1.0, 2.0, -84),       // Journey
      new THREE.Vector3(5.5, -1.2, -108),     // Toolkit
      new THREE.Vector3(0, 0, -132)           // Destination / Contact
    ];

    tunnelSpline = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
  }

  /* ── 4. FUTURISTIC 3D CYBER APERTURE (Opens on Scroll) ──────── */
  function createLockBadgeTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(10, 14, 22, 0.92)';
    ctx.fillRect(0, 0, 512, 96);

    ctx.strokeStyle = 'rgba(200, 245, 66, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 506, 90);

    ctx.fillStyle = '#c8f542';
    ctx.fillRect(16, 16, 6, 64);

    ctx.font = 'bold 20px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#c8f542';
    ctx.fillText('[ ⬡ CYBER GATEWAY · SCROLL TO ENTER ]', 32, 54);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildCyberAperture() {
    apertureGroup = new THREE.Group();
    apertureGroup.position.set(0, 0, CONFIG.doorZ);

    // Outer Circular Hairline Rim (Lime)
    const rimGeoA = new THREE.TorusGeometry(CONFIG.doorRadius, 0.035, 16, 64);
    const rimMatA = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending
    });
    apertureOuterRim = new THREE.Mesh(rimGeoA, rimMatA);
    apertureGroup.add(apertureOuterRim);

    // Inner Hexagonal Perimeter Ring (Cyan)
    const hexRingGeo = new THREE.RingGeometry(CONFIG.doorRadius * 0.94, CONFIG.doorRadius * 0.965, 6);
    const hexRingMat = new THREE.MeshBasicMaterial({
      color: CONFIG.cyanColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    apertureInnerHex = new THREE.Mesh(hexRingGeo, hexRingMat);
    apertureGroup.add(apertureInnerHex);

    // 6 Radial Laser Iris Blades (Delicate wireframe aperture that opens radially)
    apertureBlades = new THREE.Group();
    const bladeCount = 6;
    for (let b = 0; b < bladeCount; b++) {
      const angle = (b / bladeCount) * Math.PI * 2;
      const arcGeo = new THREE.TorusGeometry(CONFIG.doorRadius * 0.65, 0.02, 8, 24, Math.PI / 3);
      const arcMat = new THREE.MeshBasicMaterial({
        color: b % 2 === 0 ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      });
      const arcMesh = new THREE.Mesh(arcGeo, arcMat);
      arcMesh.rotation.z = angle;
      apertureBlades.add(arcMesh);
    }
    apertureGroup.add(apertureBlades);

    // Sleek Status Lock Badge
    const badgeMat = new THREE.MeshBasicMaterial({
      map: createLockBadgeTexture(),
      transparent: true,
      opacity: 0.90,
      blending: THREE.AdditiveBlending
    });
    const badgeGeo = new THREE.PlaneGeometry(3.8, 0.72);
    apertureLockBadge = new THREE.Mesh(badgeGeo, badgeMat);
    apertureLockBadge.position.set(0, -3.1, 0.15);
    apertureGroup.add(apertureLockBadge);

    scene.add(apertureGroup);
  }

  /* ── 5. 3D HIGHWAY TUNNEL RINGS & WARP RAILS ─────────────────── */
  function buildCodeHighway() {
    tunnelRingsGroup = new THREE.Group();
    // Mobile uses 10 rings, desktop uses 18
    const ringCount = isMobile ? 10 : 18;

    for (let i = 0; i < ringCount; i++) {
      const u = 0.16 + (i / ringCount) * 0.79;
      const pt = tunnelSpline.getPoint(u);
      const tangent = tunnelSpline.getTangent(u).normalize();

      const isLime = i % 2 === 0;
      const ringGeo = new THREE.TorusGeometry(CONFIG.tunnelRadius, 0.024, 10, isMobile ? 32 : 44);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pt);
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      tunnelRingsGroup.add(ringMesh);
    }
    tunnelRingsGroup.visible = false;
    scene.add(tunnelRingsGroup);

    // Longitudinal Warp Speed Strands (Laser Rails along Tunnel)
    warpRailsGroup = new THREE.Group();
    const railCount = isMobile ? 4 : 6;
    const samples = isMobile ? 40 : 64;

    try {
      const frames = tunnelSpline.computeFrenetFrames(samples, false);
      const startSample = Math.floor(samples * 0.15);

      for (let r = 0; r < railCount; r++) {
        const angle = (r / railCount) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const railRadius = CONFIG.tunnelRadius * 0.96;

        const railPoints = [];
        for (let s = startSample; s < samples - 1; s++) {
          const u = s / (samples - 1);
          const pt = tunnelSpline.getPoint(u);
          const normal = frames.normals[s];
          const binormal = frames.binormals[s];

          const offset = new THREE.Vector3()
            .addScaledVector(normal, cosA * railRadius)
            .addScaledVector(binormal, sinA * railRadius);

          railPoints.push(pt.clone().add(offset));
        }

        const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
        const isLime = r % 2 === 0;
        const railMat = new THREE.LineBasicMaterial({
          color: isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
          transparent: true,
          opacity: 0.15,
          blending: THREE.AdditiveBlending
        });
        const railLine = new THREE.Line(railGeo, railMat);
        warpRailsGroup.add(railLine);
      }
      warpRailsGroup.visible = false;
      scene.add(warpRailsGroup);
    } catch (e) {
      console.warn('[CyberPortal] Warp rails fallback:', e);
    }
  }

  /* ── 6. DELICATE 3D FLOATING OBJECTS (Little Crystals & Orbs) ─── */
  function buildHolo3DObjects() {
    holoObjectsGroup = new THREE.Group();

    // 7 Sparse, delicate 3D objects (Zero flat squares, small size)
    const ITEMS = [
      { type: 'diamond', u: 0.22, isLime: true },
      { type: 'orb',     u: 0.34, isLime: false },
      { type: 'diamond', u: 0.46, isLime: false },
      { type: 'hex',     u: 0.58, isLime: true },
      { type: 'orb',     u: 0.69, isLime: true },
      { type: 'diamond', u: 0.80, isLime: false },
      { type: 'hex',     u: 0.91, isLime: true }
    ];

    // On mobile, only use 4 items for peak frame rates
    const activeItems = isMobile ? ITEMS.filter((_, idx) => idx % 2 === 0) : ITEMS;

    activeItems.forEach((item, i) => {
      const pt = tunnelSpline.getPoint(item.u);
      const isLeft = (i % 2 === 0);
      const angle = isLeft ? (Math.PI * 0.92 + (Math.random() - 0.5) * 0.12) : (Math.PI * 0.08 + (Math.random() - 0.5) * 0.12);
      const radius = CONFIG.tunnelRadius * 0.93;

      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * (radius * 0.48) + (Math.random() - 0.5) * 1.0;
      const oz = (Math.random() - 0.5) * 2;

      const pos = pt.clone().add(new THREE.Vector3(ox, oy, oz));
      const objGroup = new THREE.Group();
      objGroup.position.copy(pos);

      let orbitalRingMesh = null;
      const colorHex = item.isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex;
      const altColorHex = item.isLime ? CONFIG.cyanColorHex : CONFIG.accentColorHex;

      if (item.type === 'diamond') {
        // ── Little 3D Crystal Octahedron Diamond ──
        const octGeo = new THREE.OctahedronGeometry(0.55, 0);
        const octMat = new THREE.MeshBasicMaterial({
          color: 0x07090e,
          transparent: true,
          opacity: 0.82
        });
        const octMesh = new THREE.Mesh(octGeo, octMat);
        objGroup.add(octMesh);

        // Glowing wireframe diamond edges
        const edgeGeo = new THREE.EdgesGeometry(octGeo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending
        });
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        objGroup.add(edgeLines);

        // Delicate Orbital Halo Ring
        const ringGeo = new THREE.TorusGeometry(0.85, 0.016, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: altColorHex,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending
        });
        orbitalRingMesh = new THREE.Mesh(ringGeo, ringMat);
        orbitalRingMesh.rotation.x = Math.PI / 3;
        objGroup.add(orbitalRingMesh);

      } else if (item.type === 'orb') {
        // ── Little 3D Geodesic Tech Sphere ──
        const sphereGeo = new THREE.IcosahedronGeometry(0.48, 1);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          wireframe: true,
          transparent: true,
          opacity: 0.34,
          blending: THREE.AdditiveBlending
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        objGroup.add(sphereMesh);

        // Tiny Luminous Core Point
        const coreGeo = new THREE.SphereGeometry(0.14, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xf8fafc,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        objGroup.add(coreMesh);

        // Delicate Orbital Ring
        const ringGeo = new THREE.TorusGeometry(0.78, 0.016, 8, 24);
        const ringMat = new THREE.MeshBasicMaterial({
          color: altColorHex,
          transparent: true,
          opacity: 0.40,
          blending: THREE.AdditiveBlending
        });
        orbitalRingMesh = new THREE.Mesh(ringGeo, ringMat);
        orbitalRingMesh.rotation.y = Math.PI / 4;
        objGroup.add(orbitalRingMesh);

      } else {
        // ── Little 3D Cyber Hexagonal Node ──
        const hexGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.12, 6);
        const hexMat = new THREE.MeshBasicMaterial({
          color: 0x07090e,
          transparent: true,
          opacity: 0.80
        });
        const hexMesh = new THREE.Mesh(hexGeo, hexMat);
        objGroup.add(hexMesh);

        const edgeGeo = new THREE.EdgesGeometry(hexGeo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending
        });
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        objGroup.add(edgeLines);

        const coreGeo = new THREE.SphereGeometry(0.12, 8, 8);
        const coreMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        });
        objGroup.add(new THREE.Mesh(coreGeo, coreMat));
      }

      holoObjectsGroup.add(objGroup);

      holo3DItems.push({
        group: objGroup,
        orbitalRing: orbitalRingMesh,
        rx: 0.28 + (i % 3) * 0.12,
        ry: 0.36 + (i % 2) * 0.15,
        rz: 0.18 + (i % 4) * 0.08,
        ringSpeed: 0.7 + (i % 3) * 0.3
      });
    });

    holoObjectsGroup.visible = false;
    scene.add(holoObjectsGroup);
  }

  /* ── 7. HYPERSPACE STREAMING PARTICLES (Optimized for Mobile) ── */
  function buildCodeDust() {
    // 60 particles on mobile, 200 on desktop
    const count = isMobile ? 60 : 200;
    const coords = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cLime = new THREE.Color(CONFIG.accentColorHex);
    const cCyan = new THREE.Color(CONFIG.cyanColorHex);
    const cWhite = new THREE.Color(0xd1d5db);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const pt = tunnelSpline.getPoint(u);

      const angle = Math.random() * Math.PI * 2;
      const rad = 1.2 + Math.random() * (CONFIG.tunnelRadius * 1.05);

      coords[i * 3 + 0] = pt.x + Math.cos(angle) * rad;
      coords[i * 3 + 1] = pt.y + Math.sin(angle) * rad;
      coords[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 4;

      const pick = Math.random();
      const c = pick < 0.45 ? cLime : pick < 0.85 ? cCyan : cWhite;
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(coords, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const dustMat = new THREE.PointsMaterial({
      size: isMobile ? 1.2 : 1.6,
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    codeDustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(codeDustPoints);
  }

  /* ── 8. CAMERA, APERTURE & 3D GEOMETRY ANIMATION LOOP ────────── */
  function updatePortalAndCamera(now, dt) {
    // 1. Smooth scroll progress interpolation
    const target = scrollRef.progress;
    scrollRef.smoothed += (target - scrollRef.smoothed) * CONFIG.smoothing;
    const u = Math.min(0.999, Math.max(0.0001, scrollRef.smoothed));

    // 2. Aperture Opening Animation (Rings expand smoothly on initial scroll)
    const apertureOpen = Math.min(1.0, u * 6.5);
    if (apertureOuterRim) {
      apertureOuterRim.rotation.z = now * 0.0003 + apertureOpen * 1.2;
      apertureOuterRim.scale.set(1 + apertureOpen * 0.6, 1 + apertureOpen * 0.6, 1);
    }
    if (apertureInnerHex) {
      apertureInnerHex.rotation.z = -now * 0.00025 - apertureOpen * 0.9;
      apertureInnerHex.scale.set(1 + apertureOpen * 0.5, 1 + apertureOpen * 0.5, 1);
    }
    if (apertureBlades) {
      apertureBlades.rotation.z = now * 0.0002 + apertureOpen * 1.5;
      apertureBlades.scale.set(1 + apertureOpen * 0.8, 1 + apertureOpen * 0.8, 1);
    }
    if (apertureLockBadge) {
      apertureLockBadge.material.opacity = Math.max(0, 0.90 - apertureOpen * 2.5);
    }

    // 3. Reveal tunnel elements only when scrolling starts & portal opens
    const isEnteringTunnel = u > 0.025;
    if (tunnelRingsGroup) {
      tunnelRingsGroup.visible = isEnteringTunnel;
    }
    if (holoObjectsGroup) {
      holoObjectsGroup.visible = isEnteringTunnel;
    }
    if (warpRailsGroup) {
      warpRailsGroup.visible = isEnteringTunnel;
    }

    // 4. Smooth continuous 3D tumbling of Crystals & Orbs
    if (isEnteringTunnel) {
      holo3DItems.forEach((item) => {
        item.group.rotation.x += item.rx * dt;
        item.group.rotation.y += item.ry * dt;
        item.group.rotation.z += item.rz * dt;
        if (item.orbitalRing) {
          item.orbitalRing.rotation.z += item.ringSpeed * dt;
        }
      });
    }

    // 5. Camera Flight Along Tunnel Spline
    tunnelSpline.getPoint(u, _vSplinePt);

    // Mouse parallax damping (disabled on mobile)
    if (!isMobile) {
      mouse.x += (mouse.targetX - mouse.x) * CONFIG.mouseEasing;
      mouse.y += (mouse.targetY - mouse.y) * CONFIG.mouseEasing;
    }

    const parallaxX = isMobile ? 0 : mouse.x * CONFIG.mouseParallaxMax * 14;
    const parallaxY = isMobile ? 0 : -mouse.y * CONFIG.mouseParallaxMax * 10;
    const idleFloat = isMobile ? 0 : (1 - Math.min(1, u * 4)) * Math.sin(now * 0.0012) * 0.12;

    camera.position.x += (_vSplinePt.x + parallaxX - camera.position.x) * 0.085;
    camera.position.y += (_vSplinePt.y + parallaxY + idleFloat - camera.position.y) * 0.085;
    camera.position.z += (_vSplinePt.z - camera.position.z) * 0.085;

    // Look ahead along the curve
    const lookAheadU = Math.min(1.0, u + 0.045);
    tunnelSpline.getPoint(lookAheadU, _vLookAt);
    camera.lookAt(_vLookAt);

    // 6. Subtle rotation on dust particles
    if (codeDustPoints) {
      codeDustPoints.rotation.z = now * 0.0001;
    }
  }

  /* ── 9. SCROLL & SECTION INTEGRATION ────────────────────────── */
  function setupScrollAndSync() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const Lenis = window.Lenis;

    if (!gsap || !Lenis) {
      window.addEventListener('scroll', () => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollRef.progress = window.scrollY / max;
      }, { passive: true });
      return;
    }

    if (ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    // Lenis tuned for mobile responsiveness and desktop smoothness
    const lenis = new Lenis({
      duration: isMobile ? 0.95 : 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4
    });

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    if (ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
    }

    lenis.on('scroll', (e) => {
      if (typeof e.progress === 'number') {
        scrollRef.progress = e.progress;
      } else {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollRef.progress = Math.min(1, Math.max(0, e.scroll / max));
      }

      if (!scrollRef.hasScrolled && e.scroll > 40) {
        scrollRef.hasScrolled = true;
        if (exploreHint) {
          gsap.to(exploreHint, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => { exploreHint.style.display = 'none'; } });
        }
      }
    });

    // Master ScrollTrigger across full page
    if (ScrollTrigger) {
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          scrollRef.progress = self.progress;
        }
      });

      // Section Phase Checkpoints
      CHECKPOINTS.forEach((cp) => {
        const el = document.getElementById(cp.id);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onEnter: () => {
            if (hudPhase) hudPhase.textContent = cp.phase;
          },
          onEnterBack: () => {
            if (hudPhase) hudPhase.textContent = cp.phase;
          }
        });
      });

      ScrollTrigger.refresh();
    }
  }

  /* ── 10. MOUSE PARALLAX & RESIZE (Battery-Aware) ────────────── */
  function setupInteractions() {
    if (!isMobile) {
      window.addEventListener('mousemove', (e) => {
        mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }

    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      const maxDpr = isMobile ? 1.25 : 1.75;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      renderer.setPixelRatio(dpr);
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      isTabActive = !document.hidden;
    });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[CyberPortal] WebGL context lost.');
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[CyberPortal] WebGL context restored.');
      initThree();
    }, false);
  }

  /* ── 11. UNIFIED RENDER LOOP (Inside GSAP Ticker) ────────────── */
  function startRenderLoop() {
    let lastTime = performance.now();

    const tickerCallback = () => {
      if (!isTabActive) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      updatePortalAndCamera(now, dt);
      renderer.render(scene, camera);
    };

    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add(tickerCallback);
    } else {
      const loop = () => {
        tickerCallback();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ── 12. BOOTSTRAP ──────────────────────────────────────────── */
  function boot() {
    const success = initThree();
    if (!success) return;

    setupInteractions();
    setupScrollAndSync();

    if (prefersReducedMotion) {
      scrollRef.progress = 0;
      scrollRef.smoothed = 0;
      updatePortalAndCamera(0, 0);
      renderer.render(scene, camera);
    } else {
      startRenderLoop();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
