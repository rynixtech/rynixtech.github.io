// ============================================
// RYNIX TECH — CINEMATIC SHADER GALAXY BACKGROUND
// Uses existing galaxy.jpg image with WebGL shaders
// ============================================

(function () {
  "use strict";

  // Respect reduced motion preference
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const canvas = document.getElementById("stars");
  if (!canvas || typeof THREE === "undefined") return;

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 800;

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x050711, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 3000);
  camera.position.set(0, 0, 600);

  // Mouse Parallax (desktop)
  let mouseX = 0, mouseY = 0;
  let targetMouseX = 0, targetMouseY = 0;

  if (!isMobile) {
    window.addEventListener("mousemove", (e) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  // Load existing galaxy.jpg texture
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load("galaxy.jpg", (galaxyTexture) => {
    galaxyTexture.minFilter = THREE.LinearFilter;
    galaxyTexture.magFilter = THREE.LinearFilter;
    galaxyTexture.generateMipmaps = false;

    // Custom Shaders for organic 2D galaxy displacement & Z-depth bulge
    const vertexShader = `
      uniform float u_time;
      varying vec2 vUv;
      varying vec3 vWorldPosition;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Subtle 3D bulge at galaxy center (pushes core gently toward camera)
        vec2 center = vec2(0.5, 0.5);
        float dist = length(uv - center);
        float coreBulge = (1.0 - smoothstep(0.0, 0.42, dist)) * 32.0;
        pos.z += coreBulge;

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;

    const fragmentShader = `
      uniform sampler2D u_texture;
      uniform float u_time;
      uniform vec2 u_resolution;

      varying vec2 vUv;
      varying vec3 vWorldPosition;

      // GLSL 2D Simplex Noise implementation
      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                 -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m; m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);
        vec2 distVec = uv - center;
        float dist = length(distVec);

        // Core mask: center stays completely stable (0 displacement at core)
        float coreMask = smoothstep(0.02, 0.22, dist);

        // Polar angle for spiral arm alignment
        float angle = atan(distVec.y, distVec.x);

        // Tangential & radial direction vectors
        vec2 dirTangent = vec2(-distVec.y, distVec.x) / (dist + 0.0001);
        vec2 dirRadial = distVec / (dist + 0.0001);

        // Organic multi-scale noise flow for dust lanes & nebulae
        float noise1 = snoise(uv * 3.2 + vec2(u_time * 0.025, u_time * 0.015));
        float noise2 = snoise(uv * 6.5 - vec2(u_time * 0.035, u_time * 0.02));

        // Spiral arm wave motion (slow, fluid, natural movement)
        float spiralArmPhase = angle * 2.5 - dist * 7.0 + u_time * 0.08;
        float spiralFlow = sin(spiralArmPhase) * 0.004;

        // Combine subtle tangential arm flow and organic dust displacement
        vec2 displacement = (dirTangent * (noise1 * 0.006 + spiralFlow) + dirRadial * (noise2 * 0.003)) * coreMask;

        vec2 displacedUv = uv + displacement;
        displacedUv = clamp(displacedUv, vec2(0.001), vec2(0.999));

        vec4 texColor = texture2D(u_texture, displacedUv);

        // Subtle luminance-based star & nebula twinkling
        float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        float shimmer = sin(u_time * 0.5 + luminance * 15.0) * 0.035 * luminance;
        texColor.rgb += vec3(shimmer * 0.4, shimmer * 0.6, shimmer * 0.9);

        // Smooth vignetting to blend galaxy edges into deep space background
        float edgeVignette = 1.0 - smoothstep(0.38, 0.50, dist);
        texColor.rgb = mix(texColor.rgb * 0.7, texColor.rgb, edgeVignette);

        gl_FragColor = texColor;
      }
    `;

    const imgAspect = galaxyTexture.image.width / galaxyTexture.image.height;
    const planeHeight = 900;
    const planeWidth = planeHeight * imgAspect;

    const galaxyGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight, 128, 128);
    const galaxyMaterial = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        u_texture: { value: galaxyTexture },
        u_time: { value: 0 },
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      transparent: true,
      depthWrite: false
    });

    const galaxyMesh = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
    galaxyMesh.rotation.x = -0.15;
    scene.add(galaxyMesh);

    // Overlay layered foreground 3D depth stars & space particles
    const starCount = isMobile ? 800 : 2500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      starPositions[i3] = (Math.random() - 0.5) * 1800;
      starPositions[i3 + 1] = (Math.random() - 0.5) * 1200;
      starPositions[i3 + 2] = -200 + Math.random() * 900;

      const temp = Math.random();
      if (temp < 0.2) {
        starColors[i3] = 0.7; starColors[i3 + 1] = 0.85; starColors[i3 + 2] = 1.0;
      } else if (temp < 0.4) {
        starColors[i3] = 1.0; starColors[i3 + 1] = 0.9; starColors[i3 + 2] = 0.7;
      } else {
        const w = 0.8 + Math.random() * 0.2;
        starColors[i3] = w; starColors[i3 + 1] = w; starColors[i3 + 2] = w;
      }
      starSizes[i] = 1.0 + Math.random() * 2.5;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute("size", new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
      depthWrite: false
    });
    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      galaxyMaterial.uniforms.u_time.value = elapsed;

      // Smooth camera parallax
      if (!isMobile) {
        mouseX += (targetMouseX - mouseX) * 0.03;
        mouseY += (targetMouseY - mouseY) * 0.03;
        camera.position.x = mouseX * 35;
        camera.position.y = -mouseY * 25;
      } else {
        // Automatic gentle mobile camera sway
        camera.position.x = Math.sin(elapsed * 0.08) * 20;
        camera.position.y = Math.cos(elapsed * 0.06) * 12;
      }

      // Very slow floating space drift on Z axis
      camera.position.z = 600 + Math.sin(elapsed * 0.04) * 20;
      camera.lookAt(0, 0, 0);

      // Foreground star subtle drift
      starPoints.rotation.z = elapsed * 0.00005;

      renderer.render(scene, camera);
    }

    animate();

    // Resize Handler
    window.addEventListener("resize", () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      galaxyMaterial.uniforms.u_resolution.value.set(w, h);
    });
  });

  // Cleanup on unload
  window.addEventListener("beforeunload", () => {
    renderer.dispose();
  });
})();
