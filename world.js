import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');

  /* ── Renderer & Scene Setup ── */
  let renderer, scene, camera;
  let particles, starField;
  let centralCore, innerCore, ringA, ringB, cyberGrid;
  const floatingNodes = [];
  let animId = null;
  let isTabActive = !document.hidden;

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const camPos = { x: 0, y: 0, z: 22 };
  const targetCam = { x: 0, y: 0, z: 22 };
  let scrollProgress = 0;

  const PHASES = [
    { threshold: 0.18, name: '01 / ORIGIN' },
    { threshold: 0.42, name: '02 / SELECTED WORK' },
    { threshold: 0.65, name: '03 / STORY & JOURNEY' },
    { threshold: 0.85, name: '04 / TOOLKIT & STACK' },
    { threshold: 1.00, name: '05 / COLLABORATE' }
  ];

  function initWebGL2() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: window.devicePixelRatio < 2,
        alpha: true,
        powerPreference: 'high-performance',
        stencil: false
      });
    } catch (e) {
      console.warn('WebGL2 not available, falling back', e);
      return false;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080a, 0.015);

    camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 160);
    camera.position.set(0, 0, 22);

    /* ── Lighting ── */
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const limeLight = new THREE.PointLight(0xc8f542, 2.5, 45);
    limeLight.position.set(8, 6, 12);
    scene.add(limeLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 2.2, 45);
    cyanLight.position.set(-8, -4, 5);
    scene.add(cyanLight);

    buildStarfield();
    buildCentralCyberCore();
    buildFloatingPolyhedra();
    buildCyberGrid();

    return true;
  }

  /* ── 3D Starfield & Space Dust ── */
  function buildStarfield() {
    const count = window.innerWidth < 768 ? 750 : 1500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorPalette = [
      new THREE.Color(0xc8f542), // cyber lime
      new THREE.Color(0x38bdf8), // electric cyan
      new THREE.Color(0xffffff), // crisp starlight
      new THREE.Color(0x94a3b8)  // muted steel
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Cylindrical spread along the scroll tunnel
      const radius = 12 + Math.random() * 55;
      const theta = Math.random() * Math.PI * 2;
      positions[i3]     = Math.cos(theta) * radius;
      positions[i3 + 1] = (Math.random() - 0.5) * 80;
      positions[i3 + 2] = 30 - Math.random() * 140;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: window.innerWidth < 768 ? 1.4 : 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    starField = new THREE.Points(geometry, material);
    scene.add(starField);
  }

  /* ── Central Cybernetic 3D Core ── */
  function buildCentralCyberCore() {
    centralCore = new THREE.Group();

    // Outer wireframe icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(3.6, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0xc8f542,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const icoMesh = new THREE.Mesh(icoGeo, icoMat);
    centralCore.add(icoMesh);

    // Inner glowing solid tetrahedron/core
    const innerGeo = new THREE.OctahedronGeometry(1.8, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.85,
      emissive: 0x0e3a5a,
      wireframe: false
    });
    innerCore = new THREE.Mesh(innerGeo, innerMat);
    centralCore.add(innerCore);

    // Concentric orbiting ring A (lime)
    const ringGeoA = new THREE.TorusGeometry(5.8, 0.04, 16, 90);
    const ringMatA = new THREE.MeshBasicMaterial({
      color: 0xc8f542,
      transparent: true,
      opacity: 0.5
    });
    ringA = new THREE.Mesh(ringGeoA, ringMatA);
    ringA.rotation.x = Math.PI / 3;
    centralCore.add(ringA);

    // Concentric orbiting ring B (cyan)
    const ringGeoB = new THREE.TorusGeometry(7.2, 0.03, 16, 90);
    const ringMatB = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4
    });
    ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.y = Math.PI / 4;
    centralCore.add(ringB);

    centralCore.position.set(0, 0, 4);
    scene.add(centralCore);
  }

  /* ── Floating Polyhedra along Scroll Journey ── */
  function buildFloatingPolyhedra() {
    const geometries = [
      new THREE.TetrahedronGeometry(1.4, 0),
      new THREE.OctahedronGeometry(1.5, 0),
      new THREE.DodecahedronGeometry(1.3, 0),
      new THREE.IcosahedronGeometry(1.2, 0)
    ];

    const waypoints = [
      { x: -9,  y: -8,  z: -14, color: 0xc8f542 },
      { x: 10,  y: -14, z: -28, color: 0x38bdf8 },
      { x: -8,  y: -22, z: -44, color: 0xc8f542 },
      { x: 9,   y: -30, z: -60, color: 0x38bdf8 },
      { x: -5,  y: -38, z: -76, color: 0xc8f542 }
    ];

    waypoints.forEach((wp, idx) => {
      const geo = geometries[idx % geometries.length];
      const mat = new THREE.MeshStandardMaterial({
        color: wp.color,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(wp.x, wp.y, wp.z);
      mesh.userData = {
        rotSpeedX: (Math.random() - 0.5) * 0.015,
        rotSpeedY: (Math.random() - 0.5) * 0.015,
        baseY: wp.y,
        floatFreq: 1 + Math.random() * 0.8
      };
      scene.add(mesh);
      floatingNodes.push(mesh);
    });
  }

  /* ── Cybernetic Floor Grid ── */
  function buildCyberGrid() {
    const gridHelper = new THREE.GridHelper(180, 45, 0xc8f542, 0x1f2937);
    gridHelper.position.y = -18;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.12;
    scene.add(gridHelper);
    cyberGrid = gridHelper;
  }

  /* ── Scroll & Pointer Handlers ── */
  function updateScrollMetrics() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    // Dynamic 3D Camera path
    targetCam.z = 22 - scrollProgress * 78;
    targetCam.y = -scrollProgress * 22;
    targetCam.x = Math.sin(scrollProgress * Math.PI * 1.6) * 7.5;

    // Update HUD phase indicator
    for (let i = 0; i < PHASES.length; i++) {
      if (scrollProgress <= PHASES[i].threshold || i === PHASES.length - 1) {
        if (hudPhase && hudPhase.textContent !== PHASES[i].name) {
          hudPhase.textContent = PHASES[i].name;
        }
        break;
      }
    }
  }

  if (isFinePointer) {
    window.addEventListener('mousemove', (e) => {
      pointer.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    });
  }

  window.addEventListener('scroll', updateScrollMetrics, { passive: true });

  function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    camera.aspect = w / h;
    camera.fov = w < 768 ? 64 : 52;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', onResize, { passive: true });

  /* ── Animation Loop ── */
  let clock = new THREE.Clock();

  function animate() {
    if (!isTabActive) return;
    animId = requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Smooth camera interpolation
    camPos.x += (targetCam.x + pointer.x * 2.2 - camPos.x) * 0.06;
    camPos.y += (targetCam.y - pointer.y * 1.8 - camPos.y) * 0.06;
    camPos.z += (targetCam.z - camPos.z) * 0.06;

    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    camera.position.set(camPos.x, camPos.y, camPos.z);
    camera.lookAt(
      pointer.x * 1.5,
      camPos.y - 1.2,
      camPos.z - 18
    );

    // Rotate central cyber core
    if (centralCore) {
      centralCore.rotation.y = elapsedTime * 0.18;
      centralCore.rotation.x = Math.sin(elapsedTime * 0.12) * 0.2;
      if (innerCore) {
        innerCore.rotation.y = -elapsedTime * 0.35;
        innerCore.rotation.z = elapsedTime * 0.25;
      }
      if (ringA) ringA.rotation.z = elapsedTime * 0.28;
      if (ringB) ringB.rotation.x = -elapsedTime * 0.22;
    }

    // Animate starfield drift
    if (starField) {
      starField.rotation.y = elapsedTime * 0.015;
    }

    // Animate floating polyhedra
    floatingNodes.forEach((node) => {
      node.rotation.x += node.userData.rotSpeedX;
      node.rotation.y += node.userData.rotSpeedY;
      node.position.y = node.userData.baseY + Math.sin(elapsedTime * node.userData.floatFreq) * 0.6;
    });

    // Update HUD Coordinates telemetry
    if (hudCoords && Math.floor(elapsedTime * 10) % 6 === 0) {
      hudCoords.textContent = `Z: ${camPos.z.toFixed(1)} · POS [${camPos.x.toFixed(1)}, ${camPos.y.toFixed(1)}]`;
    }

    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    isTabActive = !document.hidden;
    if (isTabActive && !animId) {
      clock.start();
      animate();
    } else if (!isTabActive && animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  });

  if (initWebGL2()) {
    updateScrollMetrics();
    onResize();
    if (!prefersReducedMotion) {
      animate();
    } else {
      camera.position.set(0, 0, 22);
      renderer.render(scene, camera);
    }
  }
})();
