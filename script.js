// ============================================
// RYNIX TECH — REALISTIC 3D GALAXY BACKGROUND
// Three.js WebGL implementation
// ============================================

(function () {
  "use strict";

  // Respect reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const canvas = document.getElementById("stars");
  if (!canvas || typeof THREE === "undefined") return;

  // ============================================
  // DEVICE DETECTION & PERFORMANCE TIERS
  // ============================================
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 800;
  const isLowEnd = isMobile && (navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : true);

  const STAR_COUNT = isLowEnd ? 2500 : isMobile ? 5000 : 12000;
  const DUST_COUNT = isLowEnd ? 400 : isMobile ? 800 : 2000;
  const NEBULA_COUNT = isLowEnd ? 60 : isMobile ? 120 : 300;
  const SPACE_OBJECT_COUNT = isLowEnd ? 3 : isMobile ? 5 : 10;

  // ============================================
  // RENDERER SETUP
  // ============================================
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050711, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050711, 0.00018);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 8000);
  camera.position.set(0, 120, 600);
  camera.lookAt(0, 0, 0);

  // ============================================
  // MOUSE PARALLAX (desktop only)
  // ============================================
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  if (!isMobile) {
    document.addEventListener("mousemove", (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  // ============================================
  // STAR FIELD — layered depth with varied sizes
  // ============================================
  function createStarField() {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      // Distribute stars in a large sphere with concentration toward center
      const r = 400 + Math.random() * 3500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.45; // flatten vertically
      positions[i3 + 2] = r * Math.cos(phi);

      // Star color temperature variation: blue-white to warm yellow
      const temp = Math.random();
      if (temp < 0.15) {
        // Hot blue-white stars
        colors[i3] = 0.7 + Math.random() * 0.3;
        colors[i3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i3 + 2] = 1.0;
      } else if (temp < 0.35) {
        // Cool orange/amber stars
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.7 + Math.random() * 0.2;
        colors[i3 + 2] = 0.3 + Math.random() * 0.3;
      } else {
        // White/pale stars
        const w = 0.85 + Math.random() * 0.15;
        colors[i3] = w;
        colors[i3 + 1] = w;
        colors[i3 + 2] = w + Math.random() * 0.05;
      }

      sizes[i] = 0.5 + Math.random() * 2.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);
    return stars;
  }

  // ============================================
  // SPIRAL GALAXY ARMS — particles along logarithmic spirals
  // ============================================
  function createGalaxyArms() {
    const armCount = 4;
    const particlesPerArm = Math.floor(DUST_COUNT / armCount);
    const totalParticles = armCount * particlesPerArm;

    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);

    let idx = 0;
    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm / armCount) * Math.PI * 2;

      for (let p = 0; p < particlesPerArm; p++) {
        const i3 = idx * 3;
        // Logarithmic spiral
        const t = (p / particlesPerArm) * 3.5;
        const r = 40 + t * 320;
        const angle = armOffset + t * 2.2;

        // Spread around the arm
        const spread = (15 + t * 45) * (Math.random() - 0.5);
        const spreadY = (5 + t * 12) * (Math.random() - 0.5);

        positions[i3] = Math.cos(angle) * r + Math.sin(angle) * spread;
        positions[i3 + 1] = spreadY;
        positions[i3 + 2] = Math.sin(angle) * r - Math.cos(angle) * spread;

        // Warm dust colors: gold, amber, soft violet
        const dustTemp = Math.random();
        if (dustTemp < 0.4) {
          // Gold/amber dust
          colors[i3] = 0.95 + Math.random() * 0.05;
          colors[i3 + 1] = 0.65 + Math.random() * 0.2;
          colors[i3 + 2] = 0.15 + Math.random() * 0.2;
        } else if (dustTemp < 0.65) {
          // Soft blue
          colors[i3] = 0.4 + Math.random() * 0.2;
          colors[i3 + 1] = 0.5 + Math.random() * 0.2;
          colors[i3 + 2] = 0.9 + Math.random() * 0.1;
        } else {
          // Soft violet
          colors[i3] = 0.55 + Math.random() * 0.15;
          colors[i3 + 1] = 0.35 + Math.random() * 0.15;
          colors[i3 + 2] = 0.75 + Math.random() * 0.15;
        }

        sizes[idx] = 1.5 + Math.random() * 3.5;
        idx++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 3.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const arms = new THREE.Points(geometry, material);
    scene.add(arms);
    return arms;
  }

  // ============================================
  // NEBULA CLOUDS — soft glowing sprites
  // ============================================
  function createNebulaCloud() {
    const group = new THREE.Group();

    // Create a simple radial gradient texture for nebula sprites
    const nebulaCanvas = document.createElement("canvas");
    nebulaCanvas.width = 128;
    nebulaCanvas.height = 128;
    const nCtx = nebulaCanvas.getContext("2d");
    const gradient = nCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.3)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.08)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    nCtx.fillStyle = gradient;
    nCtx.fillRect(0, 0, 128, 128);
    const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);

    const nebulaColors = [
      [0.95, 0.6, 0.15],   // Gold
      [0.35, 0.45, 0.85],  // Cool blue
      [0.6, 0.25, 0.7],    // Violet
      [0.2, 0.6, 0.85],    // Cyan
      [0.85, 0.35, 0.2],   // Warm orange
    ];

    for (let i = 0; i < NEBULA_COUNT; i++) {
      const colorChoice = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      const material = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: new THREE.Color(colorChoice[0], colorChoice[1], colorChoice[2]),
        transparent: true,
        opacity: 0.04 + Math.random() * 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(material);

      // Position nebula clouds along galaxy arms but spread wider
      const angle = Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 900;
      sprite.position.set(
        Math.cos(angle) * r + (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 80,
        Math.sin(angle) * r + (Math.random() - 0.5) * 200
      );

      const scale = 80 + Math.random() * 350;
      sprite.scale.set(scale, scale, 1);

      // Store drift data
      sprite.userData = {
        driftSpeed: (Math.random() - 0.5) * 0.03,
        driftPhase: Math.random() * Math.PI * 2,
        baseY: sprite.position.y,
        yDrift: (Math.random() - 0.5) * 0.015
      };

      group.add(sprite);
    }

    scene.add(group);
    return group;
  }

  // ============================================
  // GALAXY CORE GLOW
  // ============================================
  function createGalaxyCore() {
    const group = new THREE.Group();

    // Core glow texture
    const coreCanvas = document.createElement("canvas");
    coreCanvas.width = 256;
    coreCanvas.height = 256;
    const cCtx = coreCanvas.getContext("2d");
    const grad = cCtx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255, 220, 120, 0.6)");
    grad.addColorStop(0.15, "rgba(255, 180, 60, 0.3)");
    grad.addColorStop(0.4, "rgba(200, 120, 40, 0.1)");
    grad.addColorStop(0.7, "rgba(100, 60, 40, 0.03)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
    cCtx.fillStyle = grad;
    cCtx.fillRect(0, 0, 256, 256);
    const coreTexture = new THREE.CanvasTexture(coreCanvas);

    const coreMaterial = new THREE.SpriteMaterial({
      map: coreTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreSprite = new THREE.Sprite(coreMaterial);
    coreSprite.position.set(0, 0, 0);
    coreSprite.scale.set(300, 300, 1);
    group.add(coreSprite);

    // Secondary softer haze
    const hazeMat = new THREE.SpriteMaterial({
      map: coreTexture,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(0.5, 0.6, 1.0)
    });
    const hazeSprite = new THREE.Sprite(hazeMat);
    hazeSprite.position.set(0, 0, 0);
    hazeSprite.scale.set(500, 500, 1);
    group.add(hazeSprite);

    scene.add(group);
    return group;
  }

  // ============================================
  // SPACE OBJECTS — small planets, asteroids, distant satellite
  // ============================================
  function createSpaceObjects() {
    const group = new THREE.Group();
    const objects = [];

    for (let i = 0; i < SPACE_OBJECT_COUNT; i++) {
      const type = Math.random();
      let mesh;

      if (type < 0.45) {
        // Small planet
        const radius = 2 + Math.random() * 6;
        const geo = new THREE.SphereGeometry(radius, 12, 8);
        const planetColors = [0x334466, 0x554433, 0x443355, 0x335544, 0x664433];
        const mat = new THREE.MeshBasicMaterial({
          color: planetColors[Math.floor(Math.random() * planetColors.length)],
          transparent: true,
          opacity: 0.5 + Math.random() * 0.3
        });
        mesh = new THREE.Mesh(geo, mat);
      } else if (type < 0.8) {
        // Asteroid
        const geo = new THREE.IcosahedronGeometry(1 + Math.random() * 3, 0);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x444444,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.3
        });
        mesh = new THREE.Mesh(geo, mat);
      } else {
        // Tiny satellite/spacecraft — simple cross shape
        const geo = new THREE.BoxGeometry(0.5, 0.5, 3);
        const mat = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.6
        });
        mesh = new THREE.Mesh(geo, mat);
        // Solar panel wings
        const wingGeo = new THREE.BoxGeometry(6, 0.15, 1.2);
        const wingMat = new THREE.MeshBasicMaterial({
          color: 0x3355aa,
          transparent: true,
          opacity: 0.5
        });
        const wing = new THREE.Mesh(wingGeo, wingMat);
        mesh.add(wing);
      }

      // Place at varied distances
      const angle = Math.random() * Math.PI * 2;
      const r = 300 + Math.random() * 2000;
      const elevation = (Math.random() - 0.5) * 600;
      mesh.position.set(
        Math.cos(angle) * r,
        elevation,
        Math.sin(angle) * r
      );

      mesh.userData = {
        orbitRadius: r,
        orbitAngle: angle,
        orbitSpeed: (0.00005 + Math.random() * 0.0002) * (Math.random() > 0.5 ? 1 : -1),
        rotSpeed: (Math.random() - 0.5) * 0.01,
        elevation: elevation
      };

      group.add(mesh);
      objects.push(mesh);
    }

    scene.add(group);
    return { group, objects };
  }

  // ============================================
  // CREATE ALL ELEMENTS
  // ============================================
  const starField = createStarField();
  const galaxyArms = createGalaxyArms();
  const nebula = createNebulaCloud();
  const galaxyCore = createGalaxyCore();
  const spaceObjects = createSpaceObjects();

  // Tilt the galaxy plane slightly for cinematic angle
  const galaxyGroup = new THREE.Group();
  scene.remove(starField, galaxyArms, nebula, galaxyCore, spaceObjects.group);
  galaxyGroup.add(starField, galaxyArms, nebula, galaxyCore, spaceObjects.group);
  galaxyGroup.rotation.x = -0.35;
  galaxyGroup.rotation.z = 0.12;
  scene.add(galaxyGroup);

  // ============================================
  // ANIMATION LOOP
  // ============================================
  let time = 0;
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsed = clock.getElapsedTime();
    time += delta;

    // --- Smooth mouse parallax (desktop) ---
    if (!isMobile) {
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;
      camera.position.x = mouseX * 40;
      camera.position.y = 120 + mouseY * -25;
    } else {
      // Gentle automatic drift on mobile
      camera.position.x = Math.sin(elapsed * 0.08) * 25;
      camera.position.y = 120 + Math.cos(elapsed * 0.06) * 10;
    }
    camera.lookAt(0, 0, 0);

    // --- Very slow galaxy rotation (not the whole background — just the arm structure) ---
    galaxyArms.rotation.y += 0.00012;
    starField.rotation.y += 0.00003;

    // --- Nebula cloud drift ---
    nebula.children.forEach((sprite) => {
      const d = sprite.userData;
      sprite.position.y = d.baseY + Math.sin(elapsed * d.driftSpeed + d.driftPhase) * 8;
      sprite.material.rotation += d.yDrift * 0.1;
    });

    // --- Galaxy core subtle pulse ---
    const corePulse = 1 + Math.sin(elapsed * 0.15) * 0.05;
    galaxyCore.children[0].scale.set(300 * corePulse, 300 * corePulse, 1);

    // --- Space objects orbit & rotation ---
    spaceObjects.objects.forEach((obj) => {
      const od = obj.userData;
      od.orbitAngle += od.orbitSpeed;
      obj.position.x = Math.cos(od.orbitAngle) * od.orbitRadius;
      obj.position.z = Math.sin(od.orbitAngle) * od.orbitRadius;
      obj.rotation.y += od.rotSpeed;
      obj.rotation.x += od.rotSpeed * 0.3;
    });

    // --- Star twinkle via slight size variation ---
    const starSizes = starField.geometry.attributes.size;
    if (starSizes && !isLowEnd) {
      // Only update a subset per frame for performance
      const updateCount = Math.min(500, STAR_COUNT);
      const startIdx = Math.floor(Math.random() * (STAR_COUNT - updateCount));
      for (let i = startIdx; i < startIdx + updateCount; i++) {
        const base = 0.5 + (i % 7) * 0.35;
        starSizes.array[i] = base + Math.sin(elapsed * 1.5 + i * 0.7) * 0.4;
      }
      starSizes.needsUpdate = true;
    }

    // --- Camera slow forward drift (floating through space feel) ---
    camera.position.z = 600 + Math.sin(elapsed * 0.03) * 30;

    renderer.render(scene, camera);
  }

  animate();

  // ============================================
  // RESIZE HANDLER
  // ============================================
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }, 100);
  });

  // ============================================
  // CLEANUP on page unload
  // ============================================
  window.addEventListener("beforeunload", () => {
    renderer.dispose();
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (obj.material.map) obj.material.map.dispose();
        obj.material.dispose();
      }
    });
  });
})();
