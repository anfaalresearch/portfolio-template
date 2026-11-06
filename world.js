(() => {
  'use strict';

  const canvas = document.getElementById('world-canvas');
  if (!canvas) return;

  const THREE = window.THREE;
  if (!THREE) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hudPhase = document.getElementById('hud-phase');
  const hudCoords = document.getElementById('hud-coords');

  let renderer, scene, camera;
  let heroGroup, starField, cyberGrid;
  const floatingWaypoints = [];
  let animId = null;
  let isTabActive = !document.hidden;

  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  const cameraTarget = new THREE.Vector3(0, 0, 0);
  let scrollProgress = 0;

  // Chapter phases mapped to scroll percent
  const PHASES = [
    { threshold: 0.20, name: '01 / ORIGIN CORE' },
    { threshold: 0.45, name: '02 / SELECTED WORK' },
    { threshold: 0.70, name: '03 / JOURNEY PORTAL' },
    { threshold: 0.88, name: '04 / TOOLKIT MATRIX' },
    { threshold: 1.00, name: '05 / COLLABORATION' }
  ];

  function init() {
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      console.warn('WebGL init failed:', e);
      return false;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (THREE.ACESFilmicToneMapping) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
    }

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x07080a, 0.012);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 250);
    camera.position.set(0, 0, 24);

    /* ── Scene Lights ── */
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const limeLight = new THREE.PointLight(0xc8f542, 4.5, 60);
    limeLight.position.set(10, 8, 15);
    scene.add(limeLight);

    const cyanLight = new THREE.PointLight(0x38bdf8, 4.0, 60);
    cyanLight.position.set(-10, -6, 12);
    scene.add(cyanLight);

    /* ── Build 3D Visual Assets ── */
    buildHeroSpatialCore();
    buildHyperStarfield();
    buildFloatingWaypoints();
    buildCyberGridFloor();

    return true;
  }

  /* ── 1. Hero Spatial Cyber Core (Massive & Eye-Catching) ── */
  function buildHeroSpatialCore() {
    heroGroup = new THREE.Group();

    // Central Torus Knot (Cyber Engine)
    const knotGeo = new THREE.TorusKnotGeometry(3.6, 0.85, 120, 24, 2, 3);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x0e1726,
      emissive: 0x142838,
      roughness: 0.25,
      metalness: 0.9,
      wireframe: false
    });
    const knotMesh = new THREE.Mesh(knotGeo, knotMat);
    heroGroup.add(knotMesh);

    // Glowing wireframe overlay for Torus Knot
    const knotWireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    const knotWire = new THREE.Mesh(knotGeo, knotWireMat);
    heroGroup.add(knotWire);

    // Outer Geodesic Icosahedron Cage
    const cageGeo = new THREE.IcosahedronGeometry(6.2, 1);
    const cageMat = new THREE.MeshBasicMaterial({
      color: 0xc8f542,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    heroGroup.add(cageMesh);

    // Primary Equatorial Orbital Ring (Lime)
    const ringGeoA = new THREE.TorusGeometry(8.5, 0.08, 16, 120);
    const ringMatA = new THREE.MeshStandardMaterial({
      color: 0xc8f542,
      emissive: 0xc8f542,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    const ringA = new THREE.Mesh(ringGeoA, ringMatA);
    ringA.rotation.x = Math.PI / 2.8;
    heroGroup.add(ringA);

    // Secondary Tilted Orbital Ring (Cyan)
    const ringGeoB = new THREE.TorusGeometry(9.8, 0.06, 16, 120);
    const ringMatB = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.6,
      roughness: 0.3
    });
    const ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.y = Math.PI / 3.2;
    ringB.rotation.z = Math.PI / 5;
    heroGroup.add(ringB);

    // Floating satellite nodes on the rings
    const satGeo = new THREE.OctahedronGeometry(0.35, 0);
    const satMat = new THREE.MeshStandardMaterial({ color: 0xc8f542, emissive: 0xc8f542 });
    for (let i = 0; i < 4; i++) {
      const sat = new THREE.Mesh(satGeo, satMat);
      const angle = (i / 4) * Math.PI * 2;
      sat.position.set(Math.cos(angle) * 8.5, Math.sin(angle) * 8.5, 0);
      ringA.add(sat);
    }

    // Position Hero Core slightly offset to pair with the Hero visual
    heroGroup.position.set(6, 1, 0);
    scene.add(heroGroup);
  }

  /* ── 2. Hyper Starfield (2,000 Luminous Depth Particles) ── */
  function buildHyperStarfield() {
    const count = window.innerWidth < 768 ? 900 : 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0xc8f542), // cyber lime
      new THREE.Color(0x38bdf8), // electric cyan
      new THREE.Color(0xffffff), // pure white star
      new THREE.Color(0x7dd3fc)  // sky blue
    ];

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      // Cylindrical spread along the scroll tunnel
      const radius = 10 + Math.random() * 65;
      const theta = Math.random() * Math.PI * 2;
      positions[i3]     = Math.cos(theta) * radius;
      positions[i3 + 1] = (Math.random() - 0.5) * 90;
      positions[i3 + 2] = 30 - Math.random() * 160;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: window.innerWidth < 768 ? 1.6 : 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    starField = new THREE.Points(geometry, material);
    scene.add(starField);
  }

  /* ── 3. Floating 3D Waypoint Monuments Down the Page ── */
  function buildFloatingWaypoints() {
    const configs = [
      // Section 01: Work Gallery Entrance
      { x: -9, y: -16, z: -25, color: 0x38bdf8, geo: new THREE.TorusGeometry(3.2, 0.15, 12, 60), rotZ: 0.5 },
      // Section 02: Middle Work Landmark
      { x: 10, y: -30, z: -48, color: 0xc8f542, geo: new THREE.IcosahedronGeometry(3.0, 1), rotZ: -0.3 },
      // Section 03: Story Portal Ring
      { x: -8, y: -45, z: -72, color: 0x38bdf8, geo: new THREE.OctahedronGeometry(3.5, 0), rotZ: 0.8 },
      // Section 04: Toolkit Matrix Cage
      { x: 9, y: -60, z: -96, color: 0xc8f542, geo: new THREE.DodecahedronGeometry(3.2, 0), rotZ: -0.4 },
      // Section 05: Contact Horizon Monument
      { x: 0, y: -75, z: -120, color: 0x38bdf8, geo: new THREE.TorusKnotGeometry(3.0, 0.6, 80, 16), rotZ: 0 }
    ];

    configs.forEach((cfg) => {
      const group = new THREE.Group();

      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.45,
        wireframe: true,
        transparent: true,
        opacity: 0.65
      });
      const mesh = new THREE.Mesh(cfg.geo, mat);
      group.add(mesh);

      // Inner glowing core
      const inner = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 16, 16),
        new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 0.9 })
      );
      group.add(inner);

      group.position.set(cfg.x, cfg.y, cfg.z);
      group.rotation.z = cfg.rotZ;
      group.userData = {
        rotX: (Math.random() - 0.5) * 0.016,
        rotY: (Math.random() - 0.5) * 0.016,
        baseY: cfg.y
      };

      scene.add(group);
      floatingWaypoints.push(group);
    });
  }

  /* ── 4. Cyber Floor Grid ── */
  function buildCyberGridFloor() {
    const grid = new THREE.GridHelper(240, 50, 0xc8f542, 0x1e293b);
    grid.position.y = -22;
    grid.material.transparent = true;
    grid.material.opacity = 0.22;
    scene.add(grid);
    cyberGrid = grid;
  }

  /* ── Scroll & Pointer Controller ── */
  function onScroll() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

    // Update HUD Phase Tag
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

  window.addEventListener('scroll', onScroll, { passive: true });

  function onResize() {
    if (!renderer || !camera) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    camera.aspect = w / h;
    camera.fov = w < 768 ? 62 : 50;
    camera.updateProjectionMatrix();

    // Adjust hero core position on mobile vs desktop
    if (heroGroup) {
      if (w < 820) {
        heroGroup.position.set(0, 3, -6);
        heroGroup.scale.set(0.7, 0.7, 0.7);
      } else {
        heroGroup.position.set(5.5, 1, 0);
        heroGroup.scale.set(1, 1, 1);
      }
    }
  }

  window.addEventListener('resize', onResize, { passive: true });

  /* ── Render Loop ── */
  let clock = new THREE.Clock();

  function animate() {
    if (!isTabActive) return;
    animId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Smooth pointer dampening
    pointer.x += (pointer.targetX - pointer.x) * 0.05;
    pointer.y += (pointer.targetY - pointer.y) * 0.05;

    // Cinematic scroll flight camera positioning
    const targetZ = 24 - scrollProgress * 120;
    const targetY = -scrollProgress * 65;
    const targetX = Math.sin(scrollProgress * Math.PI * 1.5) * 11;

    camera.position.x += (targetX + pointer.x * 2.8 - camera.position.x) * 0.055;
    camera.position.y += (targetY - pointer.y * 2.2 - camera.position.y) * 0.055;
    camera.position.z += (targetZ - camera.position.z) * 0.055;

    // Camera look point glides ahead into depth
    cameraTarget.set(
      pointer.x * 2,
      camera.position.y - 2.5,
      camera.position.z - 28
    );
    camera.lookAt(cameraTarget);

    // Animate Hero Spatial Core
    if (heroGroup) {
      heroGroup.rotation.y = elapsed * 0.22;
      heroGroup.rotation.x = Math.sin(elapsed * 0.15) * 0.35;
      heroGroup.position.y = (window.innerWidth < 820 ? 3 : 1) + Math.sin(elapsed * 0.8) * 0.5;
    }

    // Animate starfield drift
    if (starField) {
      starField.rotation.y = elapsed * 0.012;
      starField.rotation.z = elapsed * 0.006;
    }

    // Animate floating monuments
    floatingWaypoints.forEach((wp) => {
      wp.rotation.x += wp.userData.rotX;
      wp.rotation.y += wp.userData.rotY;
      wp.position.y = wp.userData.baseY + Math.sin(elapsed * 1.1) * 0.8;
    });

    // Update HUD Coordinates
    if (hudCoords && Math.floor(elapsed * 10) % 5 === 0) {
      hudCoords.textContent = `Z: ${camera.position.z.toFixed(0)}m · NAV: OK`;
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

  if (init()) {
    onScroll();
    onResize();
    if (!prefersReducedMotion) {
      animate();
    } else {
      camera.position.set(0, 0, 24);
      renderer.render(scene, camera);
    }
  }
})();
