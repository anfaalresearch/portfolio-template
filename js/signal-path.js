/**
 * ══════════════════════════════════════════════════════════════════
 * CYBER GATEWAY & CODE HIGHWAY — Scroll-Driven WebGL Experience
 * ══════════════════════════════════════════════════════════════════
 * Concept:
 *  - Hero: A high-tech Cyber Door / Terminal Gateway stands in deep space.
 *          Clean, dark obsidian background (#07080a). Text is 100% crisp.
 *  - Scroll: The cyber blast door slides open to the left and right, and
 *            the camera accelerates FORWARD through the portal into a 3D
 *            Code Highway of floating C++, Git, and Algorithm holograms.
 *  - Real-world Developer Aesthetic · Zero Blobs · Locked 60–120 FPS.
 */

// Tunable Configuration Object
const CONFIG = {
  accentColor: '#c8f542',     // Brand cyber-lime accent
  accentColorHex: 0xc8f542,
  cyanColorHex: 0x38bdf8,     // Technical electric cyan
  bgColorHex: 0x07080a,       // Deep obsidian space base
  
  doorRadius: 3.8,            // Radius of the cyber gateway door
  tunnelRadius: 6.8,          // Tunnel radius around periphery (leaves center readable)
  tunnelLength: 140,          // Total depth in meters
  doorZ: 0,                   // Z position of the portal door
  
  cameraStartPosZ: 16,        // Camera starts outside looking at portal door
  smoothing: 0.08,            // Scroll lerp inertia factor
  mouseParallaxMax: 0.03,     // Perspective shift on mouse move
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
  const hudCoords = document.getElementById('hud-coords');
  const exploreHint = document.getElementById('explore-hint');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isMobile = window.innerWidth < 768;

  const THREE = window.THREE;
  if (!THREE) {
    console.warn('[CyberPortal] THREE is not loaded.');
    return;
  }

  /* ── 1. AUTHENTIC DEVELOPER CODE SNIPPETS (Floating 3D Holograms) ── */
  const CODE_SNIPPETS = [
    { text: '// CORE_KERNEL :: FIRST_PRINCIPLES', accent: true },
    { text: 'template <typename T> class NetworkCore;', accent: false },
    { text: 'git commit -m "feat: zero slop architecture"', accent: true },
    { text: '0x7FFF5FBFFD04 · STACK_FRAME_ALLOC', accent: false },
    { text: 'FileForge::processBuffer(stream, 4096);', accent: false },
    { text: 'ACL_RULE::PERMIT_PACKET_INSPECT()', accent: true },
    { text: 'std::vector<uint32_t> dataPipeline;', accent: false },
    { text: 'while (socket.listen()) dispatch();', accent: false },
    { text: 'BrokenKey::heatmapEngine.compute();', accent: true },
    { text: 'O(log N) · BALANCED_BINARY_SEARCH', accent: false },
    { text: 'syscall(SYS_write, 1, buffer, len);', accent: true },
    { text: 'Class of 2030 · TKMCE CS & AI', accent: true },
    { text: 'void* mem = mmap(0, 65536, PROT_READ);', accent: false },
    { text: 'algorithm::quickSort(arr, 0, N - 1);', accent: false },
    { text: 'LofiTimer::startDeepWorkSession(25m);', accent: true },
    { text: 'asm volatile("nop" ::: "memory");', accent: false },
    { text: 'CYBER_DEFENSE::FIREWALL_ACTIVE', accent: true },
    { text: 'std::atomic<bool> isRunning{true};', accent: false },
    { text: 'DEV_STARTER::RESOURCE_INDEX_READY', accent: true },
    { text: 'uint64_t hash = MurmurHash3_x64_128();', accent: false },
    { text: 'pthread_mutex_lock(&packet_queue);', accent: false },
    { text: 'Engineering from First Principles', accent: true },
    { text: 'CIRCUIT_COMPLETE · COLLABORATE', accent: true }
  ];

  /* ── 2. SECTION CHECKPOINTS DEFINITION ──────────────────────── */
  const CHECKPOINTS = [
    { id: 'about',   phase: '01 / PORTAL GATEWAY',       name: 'Origin' },
    { id: 'work',    phase: '02 / SELECTED WORK',        name: 'Selected Work' },
    { id: 'journey', phase: '03 / STORY & JOURNEY',      name: 'Story & Journey' },
    { id: 'toolkit', phase: '04 / TOOLKIT MATRIX',       name: 'Toolkit Matrix' },
    { id: 'contact', phase: '05 / DESTINATION REACHED',  name: 'Collaborate' }
  ];

  /* ── 3. THREE.JS SCENE SETUP ────────────────────────────────── */
  let renderer, scene, camera;
  let tunnelSpline;
  let doorGroup, doorLeft, doorRight, doorRimOuter, doorRimInner, doorLockBadge;
  let tunnelRingsGroup, warpRailsGroup, codePlanesGroup, codeDustPoints;

  const scrollRef = {
    progress: 0,
    smoothed: 0,
    hasScrolled: false
  };

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let isTabActive = !document.hidden;

  const _vCamPos   = new THREE.Vector3();
  const _vLookAt   = new THREE.Vector3();
  const _vSplinePt = new THREE.Vector3();

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: window.devicePixelRatio < 2,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      });
    } catch (e) {
      console.warn('[CyberPortal] WebGL initialization failed:', e);
      return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    // Pure dark obsidian fog: dissolves elements cleanly into background
    scene.fog = new THREE.FogExp2(CONFIG.bgColorHex, 0.016);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 260);
    camera.position.set(0, 0.2, CONFIG.cameraStartPosZ);

    buildSpline();
    buildCyberDoor();
    buildCodeHighway();
    buildCodePlanes();
    buildCodeDust();

    return true;
  }

  /* ── 4. 3D TUNNEL SPLINE PATH ───────────────────────────────── */
  function buildSpline() {
    // Smooth spline starting at portal door and traveling through depth
    const points = [
      new THREE.Vector3(0, 0.2, 16),          // Hero camera rest
      new THREE.Vector3(0, 0, 0),             // Door threshold
      new THREE.Vector3(-3.0, 1.5, -28),      // Selected Work
      new THREE.Vector3(-5.5, -1.0, -56),     // Work apex
      new THREE.Vector3(0.5, 2.0, -84),       // Journey
      new THREE.Vector3(5.0, -1.2, -108),     // Toolkit
      new THREE.Vector3(0, 0, -132)           // Destination / Contact
    ];

    tunnelSpline = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
  }

  /* ── 5. FUTURISTIC 3D CYBER DOOR (Opens on Scroll) ─────────── */
  function createDoorPanelTexture(isLeft) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext('2d');

    // Deep stealth black titanium panel
    ctx.fillStyle = '#07080c';
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle technical grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.10)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Outer cyber-border
    ctx.strokeStyle = isLeft ? 'rgba(200, 245, 66, 0.85)' : 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 1012);

    // Inner bevel border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, 476, 988);

    // Diagonal hazard stripes on door edges
    ctx.fillStyle = isLeft ? 'rgba(200, 245, 66, 0.22)' : 'rgba(56, 189, 248, 0.22)';
    for (let y = 60; y < 980; y += 70) {
      ctx.fillRect(isLeft ? 455 : 15, y, 42, 28);
    }

    // Circuit conduits
    ctx.strokeStyle = isLeft ? 'rgba(200, 245, 66, 0.35)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const startX = isLeft ? 120 : 392;
    ctx.moveTo(startX, 180);
    ctx.lineTo(startX, 420);
    ctx.lineTo(startX + (isLeft ? 80 : -80), 500);
    ctx.lineTo(startX + (isLeft ? 80 : -80), 850);
    ctx.stroke();

    // Technical telemetry stencils
    ctx.fillStyle = isLeft ? '#c8f542' : '#38bdf8';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(isLeft ? 'PORTAL_01 // SEC_LOCK' : 'KERNEL_CORE // 0x7FFF', 36, 95);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#8b949e';
    ctx.fillText(isLeft ? 'STATUS: ARMED · STANDBY' : 'ACCESS: AUTHORIZED', 36, 128);
    ctx.fillText(isLeft ? 'TKMCE · CS & AI · B.TECH \'30' : 'FIRST PRINCIPLES · 2030', 36, 154);

    // Bottom telemetry
    ctx.fillText(isLeft ? 'HYDRAULIC_PRESSURE: 3200 PSI' : 'ENCRYPTION: AES-GCM-256', 36, 920);
    ctx.fillText(isLeft ? 'SCROLL_DOWN_TO_ENTER >>' : '<< INITIALIZE_WARP_TRANSIT', 36, 948);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildCyberDoor() {
    doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, CONFIG.doorZ);

    // Outer Gateway Hairline Rim (Lime)
    const rimGeoA = new THREE.TorusGeometry(CONFIG.doorRadius, 0.04, 16, 64);
    const rimMatA = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    doorRimOuter = new THREE.Mesh(rimGeoA, rimMatA);
    doorGroup.add(doorRimOuter);

    // Inner Gateway Hairline Rim (Cyan)
    const rimGeoB = new THREE.TorusGeometry(CONFIG.doorRadius * 1.08, 0.025, 12, 64);
    const rimMatB = new THREE.MeshBasicMaterial({
      color: CONFIG.cyanColorHex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    doorRimInner = new THREE.Mesh(rimGeoB, rimMatB);
    doorGroup.add(doorRimInner);

    // Left Door Sliding Panel
    const panelGeo = new THREE.PlaneGeometry(3.6, 7.4);
    const leftMat = new THREE.MeshBasicMaterial({
      map: createDoorPanelTexture(true),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94
    });
    doorLeft = new THREE.Mesh(panelGeo, leftMat);
    doorLeft.position.set(-1.8, 0, 0);
    doorGroup.add(doorLeft);

    // Right Door Sliding Panel
    const rightMat = new THREE.MeshBasicMaterial({
      map: createDoorPanelTexture(false),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94
    });
    doorRight = new THREE.Mesh(panelGeo, rightMat);
    doorRight.position.set(1.8, 0, 0);
    doorGroup.add(doorRight);

    // Central Status Lock Badge
    const badgeTex = createCodeTextTexture('[ ⬡ CYBER GATEWAY · SCROLL TO OPEN & ENTER ]', true);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: badgeTex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending
    });
    const badgeGeo = new THREE.PlaneGeometry(4.2, 0.95);
    doorLockBadge = new THREE.Mesh(badgeGeo, badgeMat);
    doorLockBadge.position.set(0, -3.2, 0.15);
    doorGroup.add(doorLockBadge);

    scene.add(doorGroup);
  }

  /* ── 6. 3D HIGHWAY TUNNEL RINGS & WARP RAILS ─────────────────── */
  function buildCodeHighway() {
    tunnelRingsGroup = new THREE.Group();
    const ringCount = 24;

    for (let i = 0; i < ringCount; i++) {
      const u = 0.05 + (i / ringCount) * 0.92;
      const pt = tunnelSpline.getPoint(u);
      const tangent = tunnelSpline.getTangent(u).normalize();

      const isLime = i % 2 === 0;
      const ringGeo = new THREE.TorusGeometry(CONFIG.tunnelRadius, 0.035, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(pt);
      ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      tunnelRingsGroup.add(ringMesh);
    }
    scene.add(tunnelRingsGroup);

    // Longitudinal Warp Speed Strands (Laser Rails along Tunnel)
    warpRailsGroup = new THREE.Group();
    const railCount = 6;
    const samples = 64;

    try {
      const frames = tunnelSpline.computeFrenetFrames(samples, false);
      for (let r = 0; r < railCount; r++) {
        const angle = (r / railCount) * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const railRadius = CONFIG.tunnelRadius * 0.94;

        const railPoints = [];
        for (let s = 1; s < samples - 1; s++) {
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
          opacity: 0.28,
          blending: THREE.AdditiveBlending
        });
        const railLine = new THREE.Line(railGeo, railMat);
        warpRailsGroup.add(railLine);
      }
      scene.add(warpRailsGroup);
    } catch (e) {
      console.warn('[CyberPortal] Warp rails generation fallback:', e);
    }
  }

  /* ── 7. HOLOGRAPHIC FLOATING CODE PLANES ─────────────────────── */
  function createCodeTextTexture(text, isAccent) {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 130;
    const ctx = c.getContext('2d');

    // Dark semi-transparent terminal box
    ctx.fillStyle = 'rgba(7, 10, 16, 0.94)';
    ctx.fillRect(0, 0, 768, 130);

    // Subtle technical scanlines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let y = 0; y < 130; y += 4) {
      ctx.fillRect(0, y, 768, 2);
    }

    // Glowing border
    ctx.strokeStyle = isAccent ? 'rgba(200, 245, 66, 0.9)' : 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 760, 122);

    // Accent indicator pill
    ctx.fillStyle = isAccent ? '#c8f542' : '#38bdf8';
    ctx.fillRect(20, 22, 8, 86);

    // Monospace code typography
    ctx.font = 'bold 30px "JetBrains Mono", "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = isAccent ? '#c8f542' : '#f3f4f6';
    ctx.fillText(text, 44, 76);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildCodePlanes() {
    codePlanesGroup = new THREE.Group();

    CODE_SNIPPETS.forEach((snippet, i) => {
      // Stagger code planes starting after the door (u ~ 0.07 to 0.96)
      const u = 0.07 + (i / CODE_SNIPPETS.length) * 0.89;
      const pt = tunnelSpline.getPoint(u);

      // Position code banners around the PERIPHERY of the tunnel
      // This leaves the screen center clean so text is 100% readable!
      const side = (i % 2 === 0) ? 1 : -1;
      const angle = (i * 1.45) + (side > 0 ? 0 : Math.PI);
      const radius = CONFIG.tunnelRadius * 0.86;

      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * (radius * 0.65);

      const planePos = pt.clone().add(new THREE.Vector3(ox, oy, (Math.random() - 0.5) * 2));

      const tex = createCodeTextTexture(snippet.text, snippet.accent);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const planeGeo = new THREE.PlaneGeometry(4.4, 0.92);
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.position.copy(planePos);

      // Orient backward towards incoming camera flight path
      // This ensures text is facing oncoming viewer as they scroll!
      mesh.lookAt(pt.x * 0.4, pt.y * 0.4, pt.z + 14);

      codePlanesGroup.add(mesh);
    });

    scene.add(codePlanesGroup);
  }

  /* ── 8. HYPERSPACE STREAMING PARTICLES ──────────────────────── */
  function buildCodeDust() {
    const count = isMobile ? 220 : 480;
    const coords = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cLime = new THREE.Color(CONFIG.accentColorHex);
    const cCyan = new THREE.Color(CONFIG.cyanColorHex);
    const cWhite = new THREE.Color(0xf3f4f6);

    for (let i = 0; i < count; i++) {
      const u = Math.random();
      const pt = tunnelSpline.getPoint(u);

      const angle = Math.random() * Math.PI * 2;
      const rad = 1.0 + Math.random() * (CONFIG.tunnelRadius * 1.05);

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
      size: isMobile ? 1.8 : 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    codeDustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(codeDustPoints);
  }

  /* ── 9. CAMERA & DOOR ANIMATION LOOP ────────────────────────── */
  function updatePortalAndCamera(now, dt) {
    // 1. Smooth scroll progress interpolation
    const target = scrollRef.progress;
    scrollRef.smoothed += (target - scrollRef.smoothed) * CONFIG.smoothing;
    const u = Math.min(0.999, Math.max(0.0001, scrollRef.smoothed));

    // 2. Door Opening Animation (Slides open smoothly on initial scroll)
    const doorOpen = Math.min(1.0, u * 6.5);
    if (doorLeft && doorRight) {
      doorLeft.position.x  = -1.8 - doorOpen * 7.5;
      doorRight.position.x = 1.8 + doorOpen * 7.5;
      doorLeft.rotation.y  = -doorOpen * 0.45;
      doorRight.rotation.y = doorOpen * 0.45;
    }
    if (doorRimOuter) {
      doorRimOuter.rotation.z = now * 0.0003 + doorOpen * 1.2;
      doorRimOuter.scale.set(1 + doorOpen * 0.5, 1 + doorOpen * 0.5, 1);
    }
    if (doorRimInner) {
      doorRimInner.rotation.z = -now * 0.0002 - doorOpen * 0.8;
      doorRimInner.scale.set(1 + doorOpen * 0.4, 1 + doorOpen * 0.4, 1);
    }
    if (doorLockBadge) {
      doorLockBadge.material.opacity = Math.max(0, 0.95 - doorOpen * 2.5);
    }

    // 3. Camera Flight Along Tunnel Spline
    tunnelSpline.getPoint(u, _vSplinePt);

    // Mouse parallax damping
    mouse.x += (mouse.targetX - mouse.x) * CONFIG.mouseEasing;
    mouse.y += (mouse.targetY - mouse.y) * CONFIG.mouseEasing;

    const parallaxX = mouse.x * CONFIG.mouseParallaxMax * (isMobile ? 0 : 18);
    const parallaxY = -mouse.y * CONFIG.mouseParallaxMax * (isMobile ? 0 : 14);
    const idleFloat = (1 - Math.min(1, u * 4)) * Math.sin(now * 0.0014) * 0.2;

    camera.position.x += (_vSplinePt.x + parallaxX - camera.position.x) * 0.085;
    camera.position.y += (_vSplinePt.y + parallaxY + idleFloat - camera.position.y) * 0.085;
    camera.position.z += (_vSplinePt.z - camera.position.z) * 0.085;

    // Look ahead along the curve
    const lookAheadU = Math.min(1.0, u + 0.045);
    tunnelSpline.getPoint(lookAheadU, _vLookAt);
    camera.lookAt(_vLookAt);

    // 4. Subtle rotation on dust particles
    if (codeDustPoints) {
      codeDustPoints.rotation.z = now * 0.00015;
    }

    // 5. Update HUD Real-Time Telemetry
    if (hudCoords && Math.floor(now / 110) % 3 === 0) {
      const travelMeters = Math.max(0, (CONFIG.cameraStartPosZ - camera.position.z) * 1.2);
      hudCoords.textContent = `TUNNEL: ${travelMeters.toFixed(0)}m · CODE_SPEED: OK`;
    }
  }

  /* ── 10. SCROLL & SECTION INTEGRATION ───────────────────────── */
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

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95
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

      const mm = gsap.matchMedia();
      mm.add('(max-width: 767px)', () => { isMobile = true; });
      mm.add('(min-width: 768px)', () => { isMobile = false; });

      ScrollTrigger.refresh();
    }
  }

  /* ── 11. MOUSE PARALLAX & RESIZE ────────────────────────────── */
  function setupInteractions() {
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
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

  /* ── 12. UNIFIED RENDER LOOP ────────────────────────────────── */
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

  /* ── 13. BOOTSTRAP ──────────────────────────────────────────── */
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
