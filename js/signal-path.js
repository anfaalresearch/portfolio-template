/**
 * ══════════════════════════════════════════════════════════════════
 * SIGNAL PATH — Scroll-Driven WebGL Spatial Network Engine
 * ══════════════════════════════════════════════════════════════════
 * Concept: Sparse 3D network graph winding through depth.
 * A single bright packet travels along the 3D spline directly driven
 * by scroll progress. Camera follows with physical easing.
 * Checkpoints pulse at each section; contact pulls back for completed circuit.
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

/* ── 1. TUNABLE CONFIGURATION OBJECT ──────────────────────────── */
export const CONFIG = {
  // Network Graph Density
  nodeCount: 62,              // Base node count on desktop (reduced by 50% on mobile)
  accentColor: '#c8f542',     // Brand cyber-lime accent
  accentColorHex: 0xc8f542,
  baseNodeColor: 0x4a6078,    // Desaturated low-opacity grey-blue
  baseLineColor: 0x1e2c3c,    // Very thin, subtle network lines
  lineOpacity: 0.22,
  
  // Spline & Curve Topology
  pathCurvature: 1.0,         // Spline curve curvature multiplier
  splineDepth: 110,           // Total Z distance traversed
  
  // Camera & Tracking Physics
  cameraFollowDistance: 13.5, // Distance camera glides behind packet
  cameraElevation: 3.2,       // Height of camera above spline path
  cameraLookAhead: 5.5,       // Distance ahead along path camera looks
  cameraPullbackAtEnd: 26.0,  // Pullback distance at Contact for "completed circuit"
  smoothing: 0.065,           // Physical smoothing / inertia on scroll progress
  
  // Micro-Interactions & Parallax
  mouseParallaxMax: 0.045,    // Max camera shift angle in radians (~2.5 deg)
  mouseEasing: 0.05,          // Mouse spring damping
  idleDriftAmp: 0.35,         // Subtle floating idle motion in Hero
  
  // Pulses & Checkpoints
  pulseIntensity: 1.0,
  pulseDuration: 1.35,        // Duration of checkpoint surge in seconds
  pulseMaxRadius: 6.2,        // Size of checkpoint radiant pulse ring
  trailLength: 26             // Number of vertices in fading packet tail
};

(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');
  const exploreHint = document.getElementById('explore-hint');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobileQuery = window.matchMedia('(max-width: 767px)');
  let isMobile = isMobileQuery.matches;

  /* ── 2. SECTION CHECKPOINTS DEFINITION ──────────────────────── */
  const CHECKPOINTS = [
    { id: 'about',   u: 0.00, phase: '01 / ORIGIN',         name: 'Origin' },
    { id: 'work',    u: 0.26, phase: '02 / SELECTED WORK',  name: 'Selected Work' },
    { id: 'journey', u: 0.52, phase: '03 / STORY & JOURNEY',name: 'Story & Journey' },
    { id: 'toolkit', u: 0.77, phase: '04 / TOOLKIT MATRIX', name: 'Toolkit Matrix' },
    { id: 'contact', u: 1.00, phase: '05 / CIRCUIT COMPLETE', name: 'Collaborate' }
  ];

  /* ── 3. THREE.JS SCENE SETUP ────────────────────────────────── */
  let renderer, scene, camera;
  let splineCurve;
  let nodePointsMesh, lineSegmentsMesh;
  let packetMesh, packetGlowMesh, trailMesh;
  const checkpointMeshes = [];
  const pulseRings = [];

  // Scroll state container updated by master ScrollTrigger
  const scrollRef = {
    progress: 0,
    smoothed: 0,
    activeCheckpoint: 0,
    hasScrolled: false
  };

  // Mouse parallax state
  const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function initThree() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('[SignalPath] WebGL initialization failed, fallback active:', e);
      return false;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080a, 0.016);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 250);

    buildSpline();
    buildNetworkGraph();
    buildPacketAndTrail();
    buildCheckpointMarkers();

    return true;
  }

  /* ── 4. 3D SPLINE CURVE (Signal Highway) ─────────────────────── */
  function buildSpline() {
    // 5 anchor waypoints + gentle tangents winding through space
    const points = [
      new THREE.Vector3(0, 0.5, 8),          // 0.00: Hero (calm, wide front view)
      new THREE.Vector3(-4.5, 2.0, -12),     // 0.13: Transition
      new THREE.Vector3(-7.5, -0.5, -30),    // 0.26: Work (sweeping curve left)
      new THREE.Vector3(-1.0, 3.2, -48),     // 0.39: Transition
      new THREE.Vector3(7.0, -1.8, -65),     // 0.52: Journey (curving right through depth)
      new THREE.Vector3(2.5, 2.5, -78),      // 0.65: Transition
      new THREE.Vector3(-3.8, 1.2, -92),     // 0.77: Toolkit (tighter cluster region)
      new THREE.Vector3(-1.5, -1.0, -102),   // 0.88: Transition into loop
      new THREE.Vector3(0, 0, -114)          // 1.00: Contact (circuit apex)
    ];

    splineCurve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.42 * CONFIG.pathCurvature);
  }

  /* ── 5. SPARSE 3D NETWORK GRAPH ─────────────────────────────── */
  function buildNetworkGraph() {
    const totalNodes = isMobile ? Math.floor(CONFIG.nodeCount * 0.5) : CONFIG.nodeCount;
    const nodePositions = [];
    const nodeColors = [];
    const lineIndices = [];

    const colorDim = new THREE.Color(CONFIG.baseNodeColor);
    const colorAccent = new THREE.Color(CONFIG.accentColorHex);

    // Generate nodes distributed along and offset from spline
    for (let i = 0; i < totalNodes; i++) {
      const u = i / (totalNodes - 1);
      const splinePt = splineCurve.getPoint(u);

      // Toolkit section (u ~ 0.72 - 0.82) has tighter cluster dispersion
      const isToolkit = u > 0.70 && u < 0.85;
      const dispersion = isToolkit ? 2.8 : (4.5 + Math.sin(u * Math.PI) * 2.2);

      const angle = (i * 2.39996) + Math.sin(i * 1.5) * 1.2; // Golden ratio spiral
      const radius = Math.random() * dispersion + 0.6;
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius * 0.75;
      const oz = (Math.random() - 0.5) * 3.5;

      const px = splinePt.x + ox;
      const py = splinePt.y + oy;
      const pz = splinePt.z + oz;

      nodePositions.push(px, py, pz);

      // Accent color subtly tints ~12% of nodes
      const isTinted = Math.random() < 0.14;
      const c = isTinted ? colorAccent.clone().lerp(colorDim, 0.4) : colorDim;
      nodeColors.push(c.r, c.g, c.b);
    }

    // Connect nodes with thin low-opacity lines
    const lineDistThreshold = isMobile ? 7.5 : 8.8;
    const lineThresholdSq = lineDistThreshold * lineDistThreshold;

    for (let i = 0; i < totalNodes; i++) {
      const idxA = i * 3;
      const ax = nodePositions[idxA];
      const ay = nodePositions[idxA + 1];
      const az = nodePositions[idxA + 2];

      // Sequential connection along spine
      if (i < totalNodes - 1) {
        lineIndices.push(i, i + 1);
      }

      // Proximity cross-connections for organic mesh feel (limit connections per node)
      let connections = 0;
      for (let j = i + 2; j < totalNodes; j++) {
        if (connections >= 2) break;
        const idxB = j * 3;
        const dx = ax - nodePositions[idxB];
        const dy = ay - nodePositions[idxB + 1];
        const dz = az - nodePositions[idxB + 2];
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < lineThresholdSq) {
          lineIndices.push(i, j);
          connections++;
        }
      }
    }

    // Node Points Mesh
    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePositions, 3));
    nodeGeo.setAttribute('color', new THREE.Float32BufferAttribute(nodeColors, 3));

    const nodeMat = new THREE.PointsMaterial({
      size: isMobile ? 3.0 : 3.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
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
  function buildPacketAndTrail() {
    // 1. Packet Solid Core (crisp cyber-lime sphere)
    const coreGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.98
    });
    packetMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(packetMesh);

    // 2. Packet Ambient Glow Halo
    const glowGeo = new THREE.SphereGeometry(1.15, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    packetGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    packetMesh.add(packetGlowMesh);

    // 3. Fading Light Trail
    const trailPositions = new Float32Array(CONFIG.trailLength * 3);
    const trailColors = new Float32Array(CONFIG.trailLength * 3);
    const cAccent = new THREE.Color(CONFIG.accentColorHex);

    const initialPt = splineCurve.getPoint(0);
    for (let i = 0; i < CONFIG.trailLength; i++) {
      const idx = i * 3;
      trailPositions[idx]     = initialPt.x;
      trailPositions[idx + 1] = initialPt.y;
      trailPositions[idx + 2] = initialPt.z;

      const alpha = Math.pow(1 - i / CONFIG.trailLength, 2.2);
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
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    trailMesh = new THREE.Line(trailGeo, trailMat);
    scene.add(trailMesh);
  }

  /* ── 7. SECTION CHECKPOINT MARKERS ──────────────────────────── */
  function buildCheckpointMarkers() {
    CHECKPOINTS.forEach((cp, idx) => {
      const pt = splineCurve.getPoint(cp.u);

      const markerGroup = new THREE.Group();
      markerGroup.position.copy(pt);

      // Checkpoint glowing halo ring
      const ringGeo = new THREE.RingGeometry(0.85, 1.05, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: CONFIG.accentColorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: idx === 0 ? 0.75 : 0.28,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      markerGroup.add(ringMesh);

      // Inner anchor point
      const dotGeo = new THREE.SphereGeometry(0.25, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: CONFIG.accentColorHex,
        transparent: true,
        opacity: idx === 0 ? 0.95 : 0.45
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      markerGroup.add(dotMesh);

      scene.add(markerGroup);
      checkpointMeshes.push({ group: markerGroup, ring: ringMesh, dot: dotMesh, checkpoint: cp });
    });
  }

  /* ── 8. CHECKPOINT PULSE TRIGGER ────────────────────────────── */
  function triggerCheckpointPulse(index) {
    if (!scene || index < 0 || index >= checkpointMeshes.length) return;
    const cpData = checkpointMeshes[index];
    const origin = cpData.group.position;

    // Surge the checkpoint marker appearance
    if (window.gsap) {
      window.gsap.to(cpData.ring.scale, {
        x: 1.6, y: 1.6, z: 1.6,
        duration: 0.35,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
      window.gsap.to(cpData.ring.material, {
        opacity: 0.9,
        duration: 0.4,
        onComplete: () => {
          // If at Contact (completed circuit), keep softly lit!
          const targetOp = index === 4 ? 0.75 : 0.35;
          window.gsap.to(cpData.ring.material, { opacity: targetOp, duration: 0.8 });
        }
      });
    }

    // Create an expanding shockwave pulse ring
    const pulseGeo = new THREE.RingGeometry(0.2, 0.4, 48);
    const pulseMat = new THREE.MeshBasicMaterial({
      color: CONFIG.accentColorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
    pulseMesh.position.copy(origin);
    pulseMesh.lookAt(camera.position);

    scene.add(pulseMesh);
    pulseRings.push({
      mesh: pulseMesh,
      geo: pulseGeo,
      mat: pulseMat,
      scale: 1,
      opacity: 0.85
    });

    // Update HUD indicator
    if (hudPhase && cpData.checkpoint.phase) {
      hudPhase.textContent = cpData.checkpoint.phase;
    }
  }

  /* ── 9. CAMERA AND TRAIL UPDATE PER FRAME ───────────────────── */
  const trailHistory = [];

  function updateSignalAndCamera(now, dt) {
    // 1. Smooth scroll interpolation (Physical easing)
    const targetProgress = scrollRef.progress;
    scrollRef.smoothed += (targetProgress - scrollRef.smoothed) * CONFIG.smoothing;
    const u = Math.min(0.999, Math.max(0.001, scrollRef.smoothed));

    // 2. Position packet on spline
    const packetPos = splineCurve.getPoint(u);
    const tangent = splineCurve.getTangent(u).normalize();
    packetMesh.position.copy(packetPos);

    // Pulse core scale slightly
    const pulseScale = 1 + Math.sin(now * 0.005) * 0.08;
    packetMesh.scale.set(pulseScale, pulseScale, pulseScale);

    // 3. Update Trail History
    trailHistory.unshift(packetPos.clone());
    if (trailHistory.length > CONFIG.trailLength) {
      trailHistory.pop();
    }

    const posAttr = trailMesh.geometry.attributes.position;
    for (let i = 0; i < CONFIG.trailLength; i++) {
      const p = trailHistory[i] || packetPos;
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;

    // 4. Camera Follow Physics Along Spline
    // Normal follow: camera is slightly behind packet on the curve
    const followOffset = Math.max(0.0, u - (CONFIG.cameraFollowDistance / CONFIG.splineDepth));
    const rawCamPos = splineCurve.getPoint(followOffset);

    // Up vector for banking
    const upVec = new THREE.Vector3(0, 1, 0);

    // Calculate normal camera position behind tangent with vertical elevation
    const desiredCamPos = rawCamPos.clone()
      .add(tangent.clone().multiplyScalar(-CONFIG.cameraFollowDistance * 0.45))
      .add(upVec.clone().multiplyScalar(CONFIG.cameraElevation));

    // Special Contact section behavior: pull back to view the whole network ("completed circuit")
    if (u > 0.88) {
      const endFactor = (u - 0.88) / 0.12; // 0 to 1
      const circuitOverviewPos = new THREE.Vector3(0, 7.5, -92);
      desiredCamPos.lerp(circuitOverviewPos, endFactor);

      // Light up all checkpoint markers in completed circuit mode
      checkpointMeshes.forEach((cp) => {
        cp.ring.material.opacity = 0.35 + endFactor * 0.45;
      });
    }

    // Apply smooth mouse parallax to camera position
    mouse.x += (mouse.targetX - mouse.x) * CONFIG.mouseEasing;
    mouse.y += (mouse.targetY - mouse.y) * CONFIG.mouseEasing;

    const parallaxX = mouse.x * CONFIG.mouseParallaxMax * (isMobile ? 0 : 25);
    const parallaxY = -mouse.y * CONFIG.mouseParallaxMax * (isMobile ? 0 : 18);

    // Idle floating drift when near origin (Hero)
    const idleY = (1 - Math.min(1, u * 3.5)) * Math.sin(now * 0.001) * CONFIG.idleDriftAmp;

    camera.position.x += (desiredCamPos.x + parallaxX - camera.position.x) * 0.08;
    camera.position.y += (desiredCamPos.y + parallaxY + idleY - camera.position.y) * 0.08;
    camera.position.z += (desiredCamPos.z - camera.position.z) * 0.08;

    // Look at packet ahead (or ahead along tangent)
    const lookTarget = packetPos.clone().add(tangent.clone().multiplyScalar(CONFIG.cameraLookAhead));
    if (u > 0.88) {
      const endFactor = (u - 0.88) / 0.12;
      lookTarget.lerp(new THREE.Vector3(0, -0.5, -112), endFactor);
    }
    camera.lookAt(lookTarget);

    // 5. Update Expanding Pulse Rings
    for (let i = pulseRings.length - 1; i >= 0; i--) {
      const ring = pulseRings[i];
      ring.scale += 0.18;
      ring.opacity *= 0.94;
      ring.mesh.scale.set(ring.scale, ring.scale, 1);
      ring.mat.opacity = ring.opacity;

      if (ring.opacity < 0.02 || ring.scale > CONFIG.pulseMaxRadius) {
        scene.remove(ring.mesh);
        ring.geo.dispose();
        ring.mat.dispose();
        pulseRings.splice(i, 1);
      }
    }

    // 6. Live HUD Coordinate Update tied to real packet depth
    if (hudCoords && Math.floor(now / 100) % 3 === 0) {
      const liveDepth = -packetPos.z;
      hudCoords.textContent = `DEPTH: ${liveDepth.toFixed(1)}m · SIG: OK`;
    }
  }

  /* ── 10. GSAP, SCROLLTRIGGER & LENIS SYNC INTEGRATION ────────── */
  function setupScrollAndSync() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const Lenis = window.Lenis;

    if (!gsap || !ScrollTrigger || !Lenis) {
      console.warn('[SignalPath] GSAP, ScrollTrigger, or Lenis missing; falling back to window scroll.');
      window.addEventListener('scroll', () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        scrollRef.progress = max > 0 ? (window.scrollY / max) : 0;
      }, { passive: true });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // 1. Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.95
    });

    // 2. Drive Lenis from gsap.ticker
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    // 3. Connect Lenis scroll to ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // 4. First-scroll detection: fade out "MOVE TO EXPLORE" hint
    lenis.on('scroll', (e) => {
      if (!scrollRef.hasScrolled && e.scroll > 18) {
        scrollRef.hasScrolled = true;
        if (exploreHint) {
          gsap.to(exploreHint, {
            opacity: 0,
            duration: 0.55,
            ease: 'power2.out',
            onComplete: () => { exploreHint.style.pointerEvents = 'none'; }
          });
        }
      }
    });

    // 5. ONE Master ScrollTrigger for entire page progress
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self) => {
        scrollRef.progress = self.progress;
      }
    });

    // 6. Per-Section ScrollTriggers for Checkpoint Pulses & Phase Names
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

    // 7. Responsive handling via gsap.matchMedia()
    const mm = gsap.matchMedia();
    mm.add('(max-width: 767px)', () => {
      isMobile = true;
    });
    mm.add('(min-width: 768px)', () => {
      isMobile = false;
    });

    // Refresh triggers once layout settles
    ScrollTrigger.refresh();
  }

  /* ── 11. MOUSE PARALLAX & RESIZE LISTENERS ──────────────────── */
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

    // Handle WebGL Context Loss / Recovery Gracefully
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[SignalPath] WebGL context lost. Rendering paused.');
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      console.info('[SignalPath] WebGL context restored. Rebuilding scene.');
      initThree();
    }, false);
  }

  /* ── 12. UNIFIED RENDER LOOP (Inside GSAP Ticker) ────────────── */
  function startRenderLoop() {
    let lastTime = performance.now();

    // Single unified render loop driven by gsap.ticker
    const tickerCallback = (time, deltaTime) => {
      if (document.hidden) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.033);
      lastTime = now;

      updateSignalAndCamera(now, dt);
      renderer.render(scene, camera);
    };

    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add(tickerCallback);
    } else {
      // Fallback single requestAnimationFrame loop
      const fallbackLoop = (now) => {
        tickerCallback(now, 0.016);
        requestAnimationFrame(fallbackLoop);
      };
      requestAnimationFrame(fallbackLoop);
    }
  }

  /* ── 13. BOOTSTRAP OR PREFERS-REDUCED-MOTION ────────────────── */
  if (initThree()) {
    setupInteractions();
    setupScrollAndSync();

    if (prefersReducedMotion) {
      // Accessibility: Render a single, calm static frame without animation
      scrollRef.progress = 0;
      scrollRef.smoothed = 0;
      updateSignalAndCamera(0, 0);
      renderer.render(scene, camera);
    } else {
      startRenderLoop();
    }
  }
})();
