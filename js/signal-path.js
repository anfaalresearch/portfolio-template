/**
 * ══════════════════════════════════════════════════════════════════
 * SIGNAL PATH — Ultra-Optimized Scroll-Driven WebGL Spatial Network
 * ══════════════════════════════════════════════════════════════════
 * Concept: Sparse 3D network graph winding through depth.
 * A single bright packet travels along the 3D spline directly driven
 * by scroll progress. Camera follows with physical easing.
 * Checkpoints pulse at each section; contact pulls back for completed circuit.
 * Zero per-frame memory allocation · 60-120 FPS locked · Full WCAG AA contrast.
 */

// Tunable Configuration Object
const CONFIG = {
  // Network Graph Settings
  nodeCount: 64,              // Total nodes along and branching from spline
  accentColor: '#c8f542',     // Brand cyber-lime accent
  accentColorHex: 0xc8f542,
  cyanColorHex: 0x38bdf8,     // Secondary technical cyan
  baseNodeColor: 0x4a6582,    // Desaturated grey-blue
  baseLineColor: 0x38bdf8,    // Hairline fiber lines (rendered with additive blending)
  lineOpacity: 0.15,
  
  // Spline & Path Topology
  pathCurvature: 1.0,         // Spline curvature multiplier
  splineDepth: 120,           // Total Z distance traversed
  
  // Camera & Tracking Physics
  cameraFollowDistance: 12.0, // Distance camera glides behind packet
  cameraElevation: 3.2,       // Height of camera above spline path
  cameraLookAhead: 5.0,       // Distance ahead along path camera looks
  cameraPullbackAtEnd: 24.0,  // Pullback distance at Contact for "completed circuit"
  smoothing: 0.075,           // Physical smoothing / inertia on scroll progress
  
  // Micro-Interactions & Parallax
  mouseParallaxMax: 0.038,    // Max camera shift angle in radians (~2.2 deg)
  mouseEasing: 0.06,          // Mouse spring damping
  idleDriftAmp: 0.35,         // Subtle floating idle motion in Hero
  
  // Pulses & Checkpoints
  pulseIntensity: 1.0,
  pulseDuration: 1.2,         // Duration of checkpoint surge in seconds
  pulseMaxRadius: 6.5,        // Size of checkpoint radiant pulse ring
  trailLength: 28             // Number of vertices in fading packet tail
};

if (typeof window !== 'undefined') {
  window.SIGNAL_PATH_CONFIG = CONFIG;
}

(function initSignalPath() {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');
  const exploreHint = document.getElementById('explore-hint');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileQuery = window.matchMedia('(max-width: 767px)');
  let isMobile = isMobileQuery.matches;

  // Resolve THREE from global window or fallback
  const THREE = window.THREE;
  if (!THREE) {
    console.warn('[SignalPath] THREE is not loaded. Skipping WebGL initialization.');
    return;
  }

  /* ── 1. SECTION CHECKPOINTS DEFINITION ──────────────────────── */
  const CHECKPOINTS = [
    { id: 'about',   phase: '01 / ORIGIN',           name: 'Origin' },
    { id: 'work',    phase: '02 / SELECTED WORK',    name: 'Selected Work' },
    { id: 'journey', phase: '03 / STORY & JOURNEY',  name: 'Story & Journey' },
    { id: 'toolkit', phase: '04 / TOOLKIT MATRIX',   name: 'Toolkit Matrix' },
    { id: 'contact', phase: '05 / CIRCUIT COMPLETE', name: 'Collaborate' }
  ];

  /* ── 2. PRE-ALLOCATED REUSABLE MATH OBJECTS (Zero GC) ───────── */
  const _vPacketPos   = new THREE.Vector3();
  const _vTangent     = new THREE.Vector3();
  const _vRawCamPos   = new THREE.Vector3();
  const _vDesiredCam  = new THREE.Vector3();
  const _vLookTarget  = new THREE.Vector3();
  const _vUp          = new THREE.Vector3(0, 1, 0);
  const _vCircuitCam  = new THREE.Vector3(0, 11.5, -55);
  const _vCircuitLook = new THREE.Vector3(0, -1.0, -68);

  /* ── 3. THREE.JS SCENE SETUP ────────────────────────────────── */
  let renderer, scene, camera;
  let splineCurve;
  let nodePointsMesh, lineSegmentsMesh;
  let packetMesh, packetGlowMesh, trailMesh;
  const checkpointMeshes = [];
  const pulsePool = [];
  let isTabActive = !document.hidden;

  const scrollRef = {
    progress: 0,
    smoothed: 0,
    activeCheckpoint: 0,
    hasScrolled: false
  };

  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

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
      console.warn('[SignalPath] WebGL initialization failed:', e);
      return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080a, 0.016);

    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 260);

    buildSpline();
    buildNetworkGraph();
    buildPacketAndTrail();
    buildCheckpointMarkers();
    buildPulsePool();

    return true;
  }

  /* ── 4. 3D SPLINE CURVE (Signal Highway) ─────────────────────── */
  function buildSpline() {
    const points = [
      new THREE.Vector3(0, 0.8, 10),         // 0.00: Origin / Hero
      new THREE.Vector3(-4.0, 2.2, -12),     // 0.15: Transition to Work
      new THREE.Vector3(-7.0, -0.6, -32),    // 0.28: Work (Left sweep)
      new THREE.Vector3(-1.2, 3.4, -50),     // 0.42: Transition to Journey
      new THREE.Vector3(6.8, -1.5, -68),     // 0.56: Journey (Right sweep)
      new THREE.Vector3(2.0, 2.4, -82),      // 0.70: Transition to Toolkit
      new THREE.Vector3(-3.5, 1.0, -96),     // 0.82: Toolkit (Tight cluster)
      new THREE.Vector3(-1.0, -0.8, -108),   // 0.92: Transition to Contact
      new THREE.Vector3(0, 0, -118)          // 1.00: Contact (Circuit apex)
    ];

    splineCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.45 * CONFIG.pathCurvature);
  }

  /* ── 5. SPARSE 3D NETWORK GRAPH ─────────────────────────────── */
  function buildNetworkGraph() {
    const totalNodes = isMobile ? Math.floor(CONFIG.nodeCount * 0.5) : CONFIG.nodeCount;
    const nodePositions = [];
    const nodeColors = [];
    const lineIndices = [];

    const cDim = new THREE.Color(CONFIG.baseNodeColor);
    const cCyan = new THREE.Color(CONFIG.cyanColorHex);
    const cLime = new THREE.Color(CONFIG.accentColorHex);

    for (let i = 0; i < totalNodes; i++) {
      const u = i / (totalNodes - 1);
      const pt = splineCurve.getPoint(u);

      // Toolkit region (u ~ 0.75 - 0.88) forms a tighter cluster
      const isToolkit = u > 0.74 && u < 0.89;
      const dispersion = isToolkit ? 2.6 : (4.2 + Math.sin(u * Math.PI) * 2.0);

      const angle = i * 2.39996 + Math.sin(i * 1.8) * 0.9;
      const radius = Math.random() * dispersion + 0.5;
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius * 0.72;
      const oz = (Math.random() - 0.5) * 3.2;

      const px = pt.x + ox;
      const py = pt.y + oy;
      const pz = pt.z + oz;

      nodePositions.push(px, py, pz);

      // Color distribution: mostly dim grey-blue with subtle cyan/lime highlights
      const roll = Math.random();
      const col = roll < 0.12 ? cLime : (roll < 0.32 ? cCyan : cDim);
      nodeColors.push(col.r, col.g, col.b);
    }

    // Connect nodes into an organic, sparse fiber mesh
    const threshold = isMobile ? 8.0 : 9.5;
    const thresholdSq = threshold * threshold;

    for (let i = 0; i < totalNodes; i++) {
      const idxA = i * 3;
      const ax = nodePositions[idxA];
      const ay = nodePositions[idxA + 1];
      const az = nodePositions[idxA + 2];

      if (i < totalNodes - 1) {
        lineIndices.push(i, i + 1);
      }

      let count = 0;
      for (let j = i + 2; j < totalNodes; j++) {
        if (count >= 2) break;
        const idxB = j * 3;
        const dx = ax - nodePositions[idxB];
        const dy = ay - nodePositions[idxB + 1];
        const dz = az - nodePositions[idxB + 2];
        const dSq = dx * dx + dy * dy + dz * dz;

        if (dSq < thresholdSq) {
          lineIndices.push(i, j);
          count++;
        }
      }
    }

    // Node Points Mesh
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodeGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));

    const nodeMat = new THREE.PointsMaterial({
      size: isMobile ? 3.2 : 4.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    nodePointsMesh = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodePointsMesh);

    // Lines Mesh
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    lineGeo.setIndex(lineIndices);

    const lineMat = new THREE.LineBasicMaterial({
      color: CONFIG.baseLineColor,
      transparent: true,
      opacity: CONFIG.lineOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    lineSegmentsMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineSegmentsMesh);
  }

  /* ── 6. TRAVELING SIGNAL PACKET & TRAIL ──────────────────────── */
  let trailPositions;
  let trailIndex = 0;

  function buildPacketAndTrail() {
    // 1. Crisp glowing packet core
    const coreGeo = new THREE.SphereGeometry(0.42, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.98
    });
    packetMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(packetMesh);

    // 2. Radiant atmospheric corona halo
    const glowGeo = new THREE.SphereGeometry(1.35, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });
    packetGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    packetMesh.add(packetGlowMesh);

    // 3. Fading Light Trail (Pre-allocated typed array)
    trailPositions = new Float32Array(CONFIG.trailLength * 3);
    const trailColors = new Float32Array(CONFIG.trailLength * 3);
    const cAccent = new THREE.Color(CONFIG.accentColorHex);

    const initialPt = splineCurve.getPoint(0);
    for (let i = 0; i < CONFIG.trailLength; i++) {
      const idx = i * 3;
      trailPositions[idx]     = initialPt.x;
      trailPositions[idx + 1] = initialPt.y;
      trailPositions[idx + 2] = initialPt.z;

      const alpha = Math.pow(1 - i / CONFIG.trailLength, 2.0);
      trailColors[idx]     = cAccent.r * alpha;
      trailColors[idx + 1] = cAccent.g * alpha;
      trailColors[idx + 2] = cAccent.b * alpha;
    }

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    trailMesh = new THREE.Line(trailGeo, trailMat);
    scene.add(trailMesh);
  }

  /* ── 7. SECTION CHECKPOINT MARKERS ──────────────────────────── */
  function buildCheckpointMarkers() {
    // Dynamic checkpoint positions will be assigned in setupScrollAndSync
    CHECKPOINTS.forEach((cp, idx) => {
      const markerGroup = new THREE.Group();

      const ringGeo = new THREE.RingGeometry(0.85, 1.15, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: CONFIG.accentColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: idx === 0 ? 0.8 : 0.3,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      markerGroup.add(ringMesh);

      const dotGeo = new THREE.SphereGeometry(0.28, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: CONFIG.accentColorHex,
        transparent: true,
        opacity: idx === 0 ? 0.95 : 0.5
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      markerGroup.add(dotMesh);

      scene.add(markerGroup);
      checkpointMeshes.push({ group: markerGroup, ring: ringMesh, dot: dotMesh, u: 0, checkpoint: cp });
    });
  }

  /* ── 8. PULSE OBJECT POOLING (Zero Allocations) ──────────────── */
  function buildPulsePool() {
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.RingGeometry(0.2, 0.45, 36);
      const mat = new THREE.MeshBasicMaterial({
        color: CONFIG.accentColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      pulsePool.push({ mesh, mat, active: false, scale: 1, opacity: 0 });
    }
  }

  function triggerCheckpointPulse(index) {
    if (index < 0 || index >= checkpointMeshes.length) return;
    const cpData = checkpointMeshes[index];

    // Animate marker ring
    if (window.gsap) {
      window.gsap.to(cpData.ring.scale, {
        x: 1.7, y: 1.7, z: 1.7,
        duration: 0.35,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
      window.gsap.to(cpData.ring.material, {
        opacity: 0.95,
        duration: 0.3,
        onComplete: () => {
          const targetOp = index === 4 ? 0.8 : 0.35;
          window.gsap.to(cpData.ring.material, { opacity: targetOp, duration: 0.8 });
        }
      });
    }

    // Grab pooled pulse ring
    const pulse = pulsePool.find(p => !p.active);
    if (pulse) {
      pulse.active = true;
      pulse.scale = 1;
      pulse.opacity = 0.9;
      pulse.mesh.scale.set(1, 1, 1);
      pulse.mesh.position.copy(cpData.group.position);
      pulse.mesh.lookAt(camera.position);
      pulse.mesh.visible = true;
      pulse.mat.opacity = 0.9;
    }

    if (hudPhase && cpData.checkpoint.phase) {
      hudPhase.textContent = cpData.checkpoint.phase;
    }
  }

  /* ── 9. CAMERA AND TRAIL UPDATE (High-Performance Loop) ──────── */
  function updateSignalAndCamera(now, dt) {
    // 1. Smooth physical progress
    const target = scrollRef.progress;
    scrollRef.smoothed += (target - scrollRef.smoothed) * CONFIG.smoothing;
    const u = Math.min(0.999, Math.max(0.001, scrollRef.smoothed));

    // 2. Position packet on spline
    splineCurve.getPoint(u, _vPacketPos);
    splineCurve.getTangent(u, _vTangent).normalize();
    packetMesh.position.copy(_vPacketPos);

    const pulseScale = 1 + Math.sin(now * 0.006) * 0.07;
    packetMesh.scale.set(pulseScale, pulseScale, pulseScale);

    // 3. Shift trail buffer (in-place typed array copy, zero allocations)
    for (let i = CONFIG.trailLength - 1; i > 0; i--) {
      const dst = i * 3;
      const src = (i - 1) * 3;
      trailPositions[dst]     = trailPositions[src];
      trailPositions[dst + 1] = trailPositions[src + 1];
      trailPositions[dst + 2] = trailPositions[src + 2];
    }
    trailPositions[0] = _vPacketPos.x;
    trailPositions[1] = _vPacketPos.y;
    trailPositions[2] = _vPacketPos.z;
    trailMesh.geometry.attributes.position.needsUpdate = true;

    // 4. Camera Follow Physics
    const followOffset = Math.max(0.0, u - (CONFIG.cameraFollowDistance / CONFIG.splineDepth));
    splineCurve.getPoint(followOffset, _vRawCamPos);

    _vDesiredCam.copy(_vRawCamPos)
      .addScaledVector(_vTangent, -CONFIG.cameraFollowDistance * 0.42)
      .addScaledVector(_vUp, CONFIG.cameraElevation);

    // Completed circuit camera pullback at Contact
    if (u > 0.84) {
      const endFactor = Math.min(1, (u - 0.84) / 0.16);
      _vDesiredCam.lerp(_vCircuitCam, endFactor);

      // Light up all checkpoint markers in completed circuit mode
      checkpointMeshes.forEach(cp => {
        cp.ring.material.opacity = 0.35 + endFactor * 0.45;
      });
    }

    // Mouse parallax damping
    mouse.x += (mouse.targetX - mouse.x) * CONFIG.mouseEasing;
    mouse.y += (mouse.targetY - mouse.y) * CONFIG.mouseEasing;

    const parallaxX = mouse.x * CONFIG.mouseParallaxMax * (isMobile ? 0 : 24);
    const parallaxY = -mouse.y * CONFIG.mouseParallaxMax * (isMobile ? 0 : 18);
    const idleY = (1 - Math.min(1, u * 3.2)) * Math.sin(now * 0.0012) * CONFIG.idleDriftAmp;

    camera.position.x += (_vDesiredCam.x + parallaxX - camera.position.x) * 0.09;
    camera.position.y += (_vDesiredCam.y + parallaxY + idleY - camera.position.y) * 0.09;
    camera.position.z += (_vDesiredCam.z - camera.position.z) * 0.09;

    // Look target
    _vLookTarget.copy(_vPacketPos).addScaledVector(_vTangent, CONFIG.cameraLookAhead);
    if (u > 0.84) {
      const endFactor = Math.min(1, (u - 0.84) / 0.16);
      _vLookTarget.lerp(_vCircuitLook, endFactor);
    }
    camera.lookAt(_vLookTarget);

    // 5. Update Pooled Pulse Rings
    for (let i = 0; i < pulsePool.length; i++) {
      const p = pulsePool[i];
      if (!p.active) continue;

      p.scale += 0.22;
      p.opacity *= 0.93;
      p.mesh.scale.set(p.scale, p.scale, 1);
      p.mat.opacity = p.opacity;

      if (p.opacity < 0.02 || p.scale > CONFIG.pulseMaxRadius) {
        p.active = false;
        p.mesh.visible = false;
      }
    }

    // 6. Live HUD Coordinate Update tied to real packet depth
    if (hudCoords && Math.floor(now / 120) % 3 === 0) {
      const liveDepth = -_vPacketPos.z;
      hudCoords.textContent = `DEPTH: ${liveDepth.toFixed(1)}m · SIG: OK`;
    }
  }

  /* ── 10. DYNAMIC SECTION PROGRESS & SCROLL INTEGRATION ──────── */
  function setupScrollAndSync() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const Lenis = window.Lenis;

    // Compute exact dynamic progress for each section
    function updateSectionWaypoints() {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

      CHECKPOINTS.forEach((cp, idx) => {
        const el = document.getElementById(cp.id);
        let u = 0;
        if (el) {
          if (idx === 0) {
            u = 0.0;
          } else if (idx === CHECKPOINTS.length - 1) {
            u = 0.999;
          } else {
            const top = el.offsetTop - window.innerHeight * 0.35;
            u = Math.min(0.99, Math.max(0.01, top / maxScroll));
          }
        } else {
          u = idx / (CHECKPOINTS.length - 1);
        }

        const cpMesh = checkpointMeshes[idx];
        if (cpMesh) {
          cpMesh.u = u;
          splineCurve.getPoint(u, cpMesh.group.position);
        }
      });
    }

    updateSectionWaypoints();

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

    // Initialize Lenis
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.92
    });

    // Drive Lenis from gsap.ticker
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // Forward Lenis scroll to ScrollTrigger
    if (ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
    }

    // Smooth page scroll listener updating master progress
    lenis.on('scroll', (e) => {
      if (typeof e.progress === 'number') {
        scrollRef.progress = e.progress;
      } else {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        scrollRef.progress = Math.min(1, Math.max(0, e.scroll / max));
      }

      // First-scroll detection: fade out "MOVE TO EXPLORE" hint
      if (!scrollRef.hasScrolled && e.scroll > 16) {
        scrollRef.hasScrolled = true;
        if (exploreHint) {
          gsap.to(exploreHint, {
            opacity: 0,
            duration: 0.5,
            ease: 'power2.out',
            onComplete: () => { exploreHint.style.pointerEvents = 'none'; }
          });
        }
      }
    });

    // Smooth anchor navigation clicks with Lenis
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          lenis.scrollTo(target, { offset: -20, duration: 1.15 });
        }
      });
    });

    // Master & Per-Section ScrollTriggers
    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          scrollRef.progress = self.progress;
        }
      });

      CHECKPOINTS.forEach((cp, idx) => {
        const el = document.getElementById(cp.id);
        if (!el) return;

        ScrollTrigger.create({
          trigger: el,
          start: 'top 65%',
          end: 'bottom 35%',
          onEnter: () => {
            scrollRef.activeCheckpoint = idx;
            triggerCheckpointPulse(idx);
          },
          onEnterBack: () => {
            scrollRef.activeCheckpoint = idx;
            triggerCheckpointPulse(idx);
          }
        });
      });

      const mm = gsap.matchMedia();
      mm.add('(max-width: 767px)', () => {
        isMobile = true;
      });
      mm.add('(min-width: 768px)', () => {
        isMobile = false;
      });

      ScrollTrigger.addEventListener('refresh', updateSectionWaypoints);
      ScrollTrigger.refresh();
    }
  }

  /* ── 11. MOUSE PARALLAX & LIFECYCLE LISTENERS ───────────────── */
  function setupInteractions() {
    window.addEventListener('mousemove', (e) => {
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      mouse.targetX = 0;
      mouse.targetY = 0;
    });

    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      isMobile = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
      isTabActive = !document.hidden;
    });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[SignalPath] WebGL context lost.');
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[SignalPath] WebGL context restored.');
      initThree();
    }, false);
  }

  /* ── 12. UNIFIED RENDER LOOP (Inside GSAP Ticker) ────────────── */
  function startRenderLoop() {
    let lastTime = performance.now();

    const tickerCallback = (time, deltaTime) => {
      if (!isTabActive) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      updateSignalAndCamera(now, dt);
      renderer.render(scene, camera);
    };

    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add(tickerCallback);
    } else {
      const loop = (now) => {
        tickerCallback(now, 0.016);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  /* ── 13. BOOTSTRAP ──────────────────────────────────────────── */
  if (initThree()) {
    setupInteractions();
    setupScrollAndSync();

    if (prefersReducedMotion) {
      scrollRef.progress = 0;
      scrollRef.smoothed = 0;
      updateSignalAndCamera(0, 0);
      renderer.render(scene, camera);
    } else {
      startRenderLoop();
    }
  }
})();
