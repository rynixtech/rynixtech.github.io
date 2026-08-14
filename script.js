(function(){"use strict";const prefersReducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;if(prefersReducedMotion)return;const canvas=document.getElementById("stars");if(!canvas||typeof THREE==="undefined")return;const isMobile=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)||window.innerWidth<800;const renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!isMobile,alpha:true,powerPreference:"high-performance"});const maxPixelRatio=isMobile?1.25:1.5;renderer.setPixelRatio(Math.min(window.devicePixelRatio,maxPixelRatio));renderer.setSize(window.innerWidth,window.innerHeight);renderer.setClearColor(0x050711,1);const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(50,window.innerWidth/window.innerHeight,1,2500);camera.position.set(0,0,600);let mouseX=0,mouseY=0;let targetMouseX=0,targetMouseY=0;if(!isMobile){window.addEventListener("mousemove",(e)=>{targetMouseX=(e.clientX/window.innerWidth-0.5)*2;targetMouseY=(e.clientY/window.innerHeight-0.5)*2;},{passive:true});}const galaxyAsset=isMobile?"galaxy-mobile.webp":"galaxy.webp";const textureLoader=new THREE.TextureLoader();textureLoader.load(galaxyAsset,(galaxyTexture)=>{setupGalaxyScene(galaxyTexture);},undefined,()=>{textureLoader.load("galaxy.jpg",(fallbackTexture)=>{setupGalaxyScene(fallbackTexture);});});function setupGalaxyScene(galaxyTexture){galaxyTexture.minFilter=THREE.LinearFilter;galaxyTexture.magFilter=THREE.LinearFilter;galaxyTexture.generateMipmaps=false;const vertexShader=`
      uniform float u_time;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;

        vec2 center = vec2(0.5, 0.5);
        float dist = length(uv - center);
        float coreBulge = (1.0 - smoothstep(0.0, 0.42, dist)) * ${isMobile ? '18.0' : '30.0'};
        pos.z += coreBulge;

        vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `;const fragmentShader=`
      uniform sampler2D u_texture;
      uniform float u_time;

      varying vec2 vUv;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
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

        float coreMask = smoothstep(0.02, 0.22, dist);
        float angle = atan(distVec.y, distVec.x);

        vec2 dirTangent = vec2(-distVec.y, distVec.x) / (dist + 0.0001);
        vec2 dirRadial = distVec / (dist + 0.0001);

        float noise1 = snoise(uv * 3.2 + vec2(u_time * 0.025, u_time * 0.015));
        float spiralArmPhase = angle * 2.5 - dist * 7.0 + u_time * 0.08;
        float spiralFlow = sin(spiralArmPhase) * 0.004;

        vec2 displacement = (dirTangent * (noise1 * 0.005 + spiralFlow)) * coreMask;
        vec2 displacedUv = clamp(uv + displacement, vec2(0.001), vec2(0.999));

        vec4 texColor = texture2D(u_texture, displacedUv);

        float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        float shimmer = sin(u_time * 0.5 + luminance * 15.0) * 0.03 * luminance;
        texColor.rgb += vec3(shimmer * 0.4, shimmer * 0.6, shimmer * 0.9);

        float edgeVignette = 1.0 - smoothstep(0.38, 0.50, dist);
        texColor.rgb = mix(texColor.rgb * 0.7, texColor.rgb, edgeVignette);

        gl_FragColor = texColor;
      }
    `;const imgAspect=galaxyTexture.image.width/galaxyTexture.image.height;const planeHeight=900;const planeWidth=planeHeight*imgAspect;const segs=isMobile?32:64;const galaxyGeometry=new THREE.PlaneGeometry(planeWidth,planeHeight,segs,segs);const galaxyMaterial=new THREE.ShaderMaterial({vertexShader:vertexShader,fragmentShader:fragmentShader,uniforms:{u_texture:{value:galaxyTexture},u_time:{value:0}},transparent:true,depthWrite:false});const galaxyMesh=new THREE.Mesh(galaxyGeometry,galaxyMaterial);galaxyMesh.rotation.x=-0.15;scene.add(galaxyMesh);const starCount=isMobile?400:1200;const starPositions=new Float32Array(starCount*3);const starColors=new Float32Array(starCount*3);for(let i=0;i<starCount;i++){const i3=i*3;starPositions[i3]=(Math.random()-0.5)*1800;starPositions[i3+1]=(Math.random()-0.5)*1200;starPositions[i3+2]=-200+Math.random()*900;const temp=Math.random();if(temp<0.2){starColors[i3]=0.7;starColors[i3+1]=0.85;starColors[i3+2]=1.0;}else{const w=0.8+Math.random()*0.2;starColors[i3]=w;starColors[i3+1]=w;starColors[i3+2]=w;}}const starGeo=new THREE.BufferGeometry();starGeo.setAttribute("position",new THREE.BufferAttribute(starPositions,3));starGeo.setAttribute("color",new THREE.BufferAttribute(starColors,3));const starMat=new THREE.PointsMaterial({size:isMobile?1.5:2.0,vertexColors:true,transparent:true,opacity:0.7,sizeAttenuation:true,depthWrite:false});const starPoints=new THREE.Points(starGeo,starMat);scene.add(starPoints);const clock=new THREE.Clock();let isVisible=true;let animFrameId=null;function animate(){if(!isVisible)return;animFrameId=requestAnimationFrame(animate);const elapsed=clock.getElapsedTime();galaxyMaterial.uniforms.u_time.value=elapsed;if(!isMobile){mouseX+=(targetMouseX-mouseX)*0.03;mouseY+=(targetMouseY-mouseY)*0.03;camera.position.x=mouseX*30;camera.position.y=-mouseY*20;}else{camera.position.x=Math.sin(elapsed*0.08)*15;camera.position.y=Math.cos(elapsed*0.06)*10;}camera.position.z=600+Math.sin(elapsed*0.04)*15;camera.lookAt(0,0,0);starPoints.rotation.z=elapsed*0.00004;renderer.render(scene,camera);}if("IntersectionObserver" in window){const heroSection=document.getElementById("home")||canvas;const observer=new IntersectionObserver((entries)=>{entries.forEach((entry)=>{isVisible=entry.isIntersecting;if(isVisible&&!animFrameId){clock.start();animate();}else if(!isVisible&&animFrameId){cancelAnimationFrame(animFrameId);animFrameId=null;}});},{threshold:0.05});observer.observe(heroSection);}else{animate();}let resizeTimer;window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const w=window.innerWidth;const h=window.innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();},150);},{passive:true});}window.addEventListener("beforeunload",()=>{renderer.dispose();});})();
