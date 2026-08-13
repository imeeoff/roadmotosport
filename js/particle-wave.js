/* =========================================================
   MOTOSPORT — particle-wave.js
   Фон из волнообразных частиц для hero-секции.
   Адаптация React-компонента ParticleWave на чистый JS.

   Требует подключения Three.js ПЕРЕД этим файлом:
   <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>

   Использование в HTML:
   <canvas id="particle-wave" class="particle-wave-canvas"></canvas>
========================================================= */

(function () {
  const canvas = document.getElementById('particle-wave');
  if (!canvas || typeof THREE === 'undefined') return;

  // Уважаем настройку "меньше анимаций"
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const particleVertex = `
    attribute float scale;
    uniform float uTime;
    void main() {
      vec3 p = position;
      float s = scale;
      p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
      p.x += (sin(p.y + uTime) * 0.5);
      s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const particleFragment = `
    uniform vec3 uColor;
    void main() {
      gl_FragColor = vec4(uColor, 0.45);
    }
  `;

  let scene, camera, renderer, particles, particleMaterial, animationId;
  let mouse = new THREE.Vector2(-10, -10);

  function getSize() {
    const parent = canvas.parentElement;
    return {
      w: parent ? parent.clientWidth : window.innerWidth,
      h: parent ? parent.clientHeight : window.innerHeight,
    };
  }

  function initScene() {
    const { w, h } = getSize();

    camera = new THREE.PerspectiveCamera(75, w / h, 0.01, 1000);
    camera.position.set(0, 6, 5);

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true, // прозрачный фон — встраивается в тёмный hero сайта
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0); // полностью прозрачный

    const gap = 0.3;
    const amountX = 140;
    const amountY = 140;
    const particleNum = amountX * amountY;
    const particlePositions = new Float32Array(particleNum * 3);
    const particleScales = new Float32Array(particleNum);

    let i = 0, j = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        particlePositions[i] = ix * gap - ((amountX * gap) / 2);
        particlePositions[i + 1] = 0;
        particlePositions[i + 2] = iy * gap - ((amountX * gap) / 2);
        particleScales[j] = 1;
        i += 3;
        j++;
      }
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('scale', new THREE.BufferAttribute(particleScales, 1));

    // Акцентный гоночный красный MotoSport (#e8382c)
    const accentColor = new THREE.Vector3(0.91, 0.22, 0.17);

    particleMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: accentColor },
      },
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
  }

  function animate() {
    particleMaterial.uniforms.uTime.value += 0.05;
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  function onResize() {
    const { w, h } = getSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  initScene();
  animate();

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);

  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('mousemove', onMouseMove);
    if (particles) {
      scene.remove(particles);
      particles.geometry.dispose();
      particles.material.dispose();
    }
    renderer.dispose();
  });
})();
