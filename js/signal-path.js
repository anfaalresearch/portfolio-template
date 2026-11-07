/**
 * ══════════════════════════════════════════════════════════════════
 * CYBER GATEWAY & 3D GEOMETRIC HIGHWAY — WebGL Spatial Experience
 * ══════════════════════════════════════════════════════════════════
 * Concept:
 *  - Hero: Sleek Cyber Gateway stands in deep space. Base is obsidian #07080a.
 *          ZERO clutter, zero blobs, zero floating boxes in Hero.
 *          White headings and copy are 100% crisp and readable.
 *  - Scroll (0% -> 15%): The hydraulic blast doors slide open to left & right.
 *  - Transit (15% -> 85%): Camera accelerates forward through open door into
 *            the 3D Code Highway.
 *            Featuring floating 3D Wireframe Hexagons & Geodesic Tech Spheres
 *            with orbital rings, tumbling gently in depth exclusively along
 *            the FAR PERIPHERY margins.
 *            Zero plain flat squares · Center reading column 100% unobstructed.
 *  - Destination (85% -> 100%): Arrives at Contact hub with completed circuit.
 *  - Locked 60-120 FPS · Center-Left Waypoint HUD · Restrained Opacity.
 */

// Tunable Configuration Object
const CONFIG = {
  accentColor: '#c8f542',     // Brand cyber-lime accent
  accentColorHex: 0xc8f542,
  cyanColorHex: 0x38bdf8,     // Technical electric cyan
  bgColorHex: 0x07080a,       // Deep obsidian space base
  
  doorRadius: 3.8,            // Radius of the cyber gateway door
  tunnelRadius: 9.2,          // Wide tunnel radius pushed to screen periphery
  doorZ: 0,                   // Z position of the portal door
  
  cameraStartPosZ: 16,        // Camera starts outside looking at portal door
  smoothing: 0.08,            // Scroll lerp inertia factor
  mouseParallaxMax: 0.024,    // Gentle perspective shift on mouse move
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
  let isMobile = window.innerWidth < 768;

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
  let doorGroup, doorLeft, doorRight, doorRimOuter, doorRimInner, doorLockBadge;
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
    scene.fog = new THREE.FogExp2(CONFIG.bgColorHex, 0.018);

    camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 260);
    camera.position.set(0, 0.2, CONFIG.cameraStartPosZ);

    buildSpline();
    buildCyberDoor();
    buildCodeHighway();
    buildHolo3DObjects();
    buildCodeDust();

    return true;
  }

  /* ── 3. 3D TUNNEL SPLINE PATH ───────────────────────────────── */
  function buildSpline() {
    // Smooth spline starting at portal door and traveling through depth
    // Door is at Z = 0 (u ~ 0.11)
    const points = [
      new THREE.Vector3(0, 0.2, 16),          // Hero camera rest (u = 0)
      new THREE.Vector3(0, 0, 0),             // Door threshold (u ~ 0.11)
      new THREE.Vector3(-3.5, 1.5, -28),      // Selected Work
      new THREE.Vector3(-6.0, -1.0, -56),     // Work apex
      new THREE.Vector3(1.0, 2.0, -84),       // Journey
      new THREE.Vector3(5.5, -1.2, -108),     // Toolkit
      new THREE.Vector3(0, 0, -132)           // Destination / Contact
    ];

    tunnelSpline = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45);
  }

  /* ── 4. FUTURISTIC 3D CYBER DOOR (Opens on Scroll) ─────────── */
  function createDoorPanelTexture(isLeft) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const ctx = c.getContext('2d');

    // Deep stealth black titanium panel
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle technical grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
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
    ctx.strokeStyle = isLeft ? 'rgba(200, 245, 66, 0.75)' : 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, 500, 1012);

    // Inner bevel border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, 476, 988);

    // Diagonal hazard stripes on door edges
    ctx.fillStyle = isLeft ? 'rgba(200, 245, 66, 0.16)' : 'rgba(56, 189, 248, 0.16)';
    for (let y = 60; y < 980; y += 75) {
      ctx.fillRect(isLeft ? 460 : 12, y, 40, 26);
    }

    // Circuit conduits
    ctx.strokeStyle = isLeft ? 'rgba(200, 245, 66, 0.28)' : 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const startX = isLeft ? 120 : 392;
    ctx.moveTo(startX, 180);
    ctx.lineTo(startX, 420);
    ctx.lineTo(startX + (isLeft ? 80 : -80), 500);
    ctx.lineTo(startX + (isLeft ? 80 : -80), 850);
    ctx.stroke();

    // Technical telemetry stencils
    ctx.fillStyle = isLeft ? '#c8f542' : '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(isLeft ? 'PORTAL_01 // SEC_LOCK' : 'KERNEL_CORE // 0x7FFF', 36, 95);

    ctx.font = '15px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(isLeft ? 'STATUS: ARMED · STANDBY' : 'ACCESS: AUTHORIZED', 36, 126);
    ctx.fillText(isLeft ? 'TKMCE · CS & AI · B.TECH \'30' : 'FIRST PRINCIPLES · 2030', 36, 150);

    // Bottom telemetry
    ctx.fillText(isLeft ? 'HYDRAULIC_PRESSURE: 3200 PSI' : 'ENCRYPTION: AES-GCM-256', 36, 920);
    ctx.fillText(isLeft ? 'SCROLL_DOWN_TO_ENTER >>' : '<< INITIALIZE_WARP_TRANSIT', 36, 946);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function createLockBadgeTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 110;
    const ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(10, 14, 22, 0.94)';
    ctx.fillRect(0, 0, 512, 110);

    ctx.strokeStyle = 'rgba(200, 245, 66, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(3, 3, 506, 104);

    ctx.fillStyle = '#c8f542';
    ctx.fillRect(16, 20, 6, 70);

    ctx.font = 'bold 21px "Space Grotesk", monospace, sans-serif';
    ctx.fillStyle = '#c8f542';
    ctx.fillText('[ ⬡ CYBER GATEWAY · SCROLL TO OPEN & ENTER ]', 32, 64);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildCyberDoor() {
    doorGroup = new THREE.Group();
    doorGroup.position.set(0, 0, CONFIG.doorZ);

    // Outer Gateway Hairline Rim (Lime)
    const rimGeoA = new THREE.TorusGeometry(CONFIG.doorRadius, 0.035, 16, 64);
    const rimMatA = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    doorRimOuter = new THREE.Mesh(rimGeoA, rimMatA);
    doorGroup.add(doorRimOuter);

    // Inner Gateway Hairline Rim (Cyan)
    const rimGeoB = new THREE.TorusGeometry(CONFIG.doorRadius * 1.08, 0.02, 12, 64);
    const rimMatB = new THREE.MeshBasicMaterial({
      color: CONFIG.cyanColorHex,
      transparent: true,
      opacity: 0.28,
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
    const badgeMat = new THREE.MeshBasicMaterial({
      map: createLockBadgeTexture(),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    });
    const badgeGeo = new THREE.PlaneGeometry(4.2, 0.92);
    doorLockBadge = new THREE.Mesh(badgeGeo, badgeMat);
    doorLockBadge.position.set(0, -3.2, 0.15);
    doorGroup.add(doorLockBadge);

    scene.add(doorGroup);
  }

  /* ── 5. 3D HIGHWAY TUNNEL RINGS & WARP RAILS ─────────────────── */
  function buildCodeHighway() {
    tunnelRingsGroup = new THREE.Group();
    const ringCount = 20;

    for (let i = 0; i < ringCount; i++) {
      // ONLY place tunnel rings AFTER the door (u from 0.16 to 0.95)
      const u = 0.16 + (i / ringCount) * 0.79;
      const pt = tunnelSpline.getPoint(u);
      const tangent = tunnelSpline.getTangent(u).normalize();

      const isLime = i % 2 === 0;
      const ringGeo = new THREE.TorusGeometry(CONFIG.tunnelRadius, 0.026, 12, 48);
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

    // Longitudinal Warp Speed Strands
    warpRailsGroup = new THREE.Group();
    const railCount = 6;
    const samples = 64;

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
          opacity: 0.16,
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

  /* ── 6. 3D HEXAGONS & GEODESIC TECH SPHERES (Sparse & Premium) ─ */
  function createHexBadgeTexture(label, isLime) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    ctx.clearRect(0, 0, 256, 256);

    ctx.strokeStyle = isLime ? 'rgba(200, 245, 66, 0.85)' : 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(128, 128, 108, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 36px "Space Grotesk", "JetBrains Mono", monospace, sans-serif';
    ctx.fillStyle = isLime ? '#c8f542' : '#38bdf8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 128, 128);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  function buildHolo3DObjects() {
    holoObjectsGroup = new THREE.Group();

    // 10 Sparse, high-end 3D elements alternating between 3D Hexagons and Tech Spheres
    const HOLO_ITEMS = [
      { type: 'hex',    label: 'C++',       u: 0.18, isLime: true },
      { type: 'sphere', label: 'ORB_01',    u: 0.26, isLime: false },
      { type: 'hex',    label: '0x7FFF',    u: 0.35, isLime: false },
      { type: 'sphere', label: 'ORB_02',    u: 0.44, isLime: true },
      { type: 'hex',    label: 'GIT',       u: 0.52, isLime: true },
      { type: 'sphere', label: 'ORB_03',    u: 0.61, isLime: false },
      { type: 'hex',    label: 'ACL_SIM',   u: 0.70, isLime: false },
      { type: 'sphere', label: 'ORB_04',    u: 0.78, isLime: true },
      { type: 'hex',    label: 'O(log N)',  u: 0.85, isLime: true },
      { type: 'sphere', label: 'ORB_05',    u: 0.92, isLime: false }
    ];

    HOLO_ITEMS.forEach((item, i) => {
      const pt = tunnelSpline.getPoint(item.u);
      const isLeft = (i % 2 === 0);
      const angle = isLeft ? (Math.PI * 0.92 + (Math.random() - 0.5) * 0.15) : (Math.PI * 0.08 + (Math.random() - 0.5) * 0.15);
      const radius = CONFIG.tunnelRadius * 0.92;

      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * (radius * 0.5) + (Math.random() - 0.5) * 1.2;
      const oz = (Math.random() - 0.5) * 2;

      const pos = pt.clone().add(new THREE.Vector3(ox, oy, oz));
      const objGroup = new THREE.Group();
      objGroup.position.copy(pos);

      let orbitalRingMesh = null;

      if (item.type === 'hex') {
        // ── 3D Hexagonal Prism ──
        const hexGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.4, 6);
        const hexMat = new THREE.MeshBasicMaterial({
          color: 0x090c14,
          transparent: true,
          opacity: 0.85
        });
        const hexMesh = new THREE.Mesh(hexGeo, hexMat);
        objGroup.add(hexMesh);

        // Glowing wireframe perimeter edges
        const edgeGeo = new THREE.EdgesGeometry(hexGeo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: item.isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
          transparent: true,
          opacity: 0.68,
          blending: THREE.AdditiveBlending
        });
        const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
        objGroup.add(edgeLines);

        // Front Face Holographic Badge
        const badgeTex = createHexBadgeTexture(item.label, item.isLime);
        const badgeMat = new THREE.MeshBasicMaterial({
          map: badgeTex,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        });
        const badgePlane = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), badgeMat);
        badgePlane.position.set(0, 0.22, 0);
        badgePlane.rotation.x = -Math.PI / 2;
        objGroup.add(badgePlane);

      } else {
        // ── 3D Geodesic Tech Sphere ──
        const sphereGeo = new THREE.IcosahedronGeometry(1.25, 1);
        const sphereMat = new THREE.MeshBasicMaterial({
          color: item.isLime ? CONFIG.accentColorHex : CONFIG.cyanColorHex,
          wireframe: true,
          transparent: true,
          opacity: 0.38,
          blending: THREE.AdditiveBlending
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        objGroup.add(sphereMesh);

        // Luminous Core Particle
        const coreGeo = new THREE.SphereGeometry(0.32, 12, 12);
        const coreMat = new THREE.MeshBasicMaterial({
          color: 0xf8fafc,
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending
        });
        const coreMesh = new THREE.Mesh(coreGeo, coreMat);
        objGroup.add(coreMesh);

        // Concentric Orbital Ring
        const ringGeo = new THREE.TorusGeometry(1.85, 0.024, 8, 36);
        const ringMat = new THREE.MeshBasicMaterial({
          color: item.isLime ? CONFIG.cyanColorHex : CONFIG.accentColorHex,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending
        });
        orbitalRingMesh = new THREE.Mesh(ringGeo, ringMat);
        orbitalRingMesh.rotation.x = Math.PI / 3;
        orbitalRingMesh.rotation.y = Math.PI / 4;
        objGroup.add(orbitalRingMesh);
      }

      holoObjectsGroup.add(objGroup);

      holo3DItems.push({
        group: objGroup,
        orbitalRing: orbitalRingMesh,
        rx: 0.25 + (i % 3) * 0.15,
        ry: 0.35 + (i % 2) * 0.2,
        rz: 0.15 + (i % 4) * 0.1,
        ringSpeed: 0.8 + (i % 3) * 0.4
      });
    });

    holoObjectsGroup.visible = false;
    scene.add(holoObjectsGroup);
  }

  /* ── 7. HYPERSPACE STREAMING PARTICLES ──────────────────────── */
  function buildCodeDust() {
    const count = isMobile ? 160 : 340;
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
      size: isMobile ? 1.4 : 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    codeDustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(codeDustPoints);
  }

  /* ── 8. CAMERA, DOOR & 3D GEOMETRY ANIMATION LOOP ────────────── */
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
      doorLockBadge.material.opacity = Math.max(0, 0.92 - doorOpen * 2.5);
    }

    // 3. Reveal tunnel elements only when scrolling starts & door opens
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

    // 4. Smooth continuous 3D tumbling of Hexagons and Spheres
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

    // Mouse parallax damping
    mouse.x += (mouse.targetX - mouse.x) * CONFIG.mouseEasing;
    mouse.y += (mouse.targetY - mouse.y) * CONFIG.mouseEasing;

    const parallaxX = mouse.x * CONFIG.mouseParallaxMax * (isMobile ? 0 : 16);
    const parallaxY = -mouse.y * CONFIG.mouseParallaxMax * (isMobile ? 0 : 12);
    const idleFloat = (1 - Math.min(1, u * 4)) * Math.sin(now * 0.0012) * 0.15;

    camera.position.x += (_vSplinePt.x + parallaxX - camera.position.x) * 0.085;
    camera.position.y += (_vSplinePt.y + parallaxY + idleFloat - camera.position.y) * 0.085;
    camera.position.z += (_vSplinePt.z - camera.position.z) * 0.085;

    // Look ahead along the curve
    const lookAheadU = Math.min(1.0, u + 0.045);
    tunnelSpline.getPoint(lookAheadU, _vLookAt);
    camera.lookAt(_vLookAt);

    // 6. Subtle rotation on dust particles
    if (codeDustPoints) {
      codeDustPoints.rotation.z = now * 0.00012;
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

  /* ── 10. MOUSE PARALLAX & RESIZE ────────────────────────────── */
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

  /* ── 11. UNIFIED RENDER LOOP ────────────────────────────────── */
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
