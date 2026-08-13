/* =========================================================
   MOTOSPORT — nav-dock.js
   Ванильный порт «Magnetic Dock» (Motiq, motiq.dev — MIT) под
   навигацию сайта. Никакого React/Tailwind — только та же
   физика: одно общее гауссово поле притяжения на весь док,
   из-за чего соседние иконки каскадом реагируют на курсор,
   плюс подхватываемый пружиной чип-подпись и keyboard-parity
   (фокус с клавиатуры выгибает поле так же, как курсор).
========================================================= */
(function () {
  const dock = document.querySelector('.nav-dock');
  if (!dock) return;

  const items = Array.from(dock.querySelectorAll('.dock-item'));
  if (!items.length) return;

  /* ---------- активная ссылка (как в script.js) ---------- */
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  items.forEach((el) => {
    if (el.getAttribute('href') === currentPage) el.classList.add('active');
  });

  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- параметры поля (подобраны под компактный header) ---------- */
  const cfg = {
    magnetRadius: 60,
    maxScale: 1.32,
    lift: 10,
    stiffness: 420,
    damping: 26,
    idleWave: true,
    tooltip: true,
  };
  const LIFT_K = 360, LIFT_C = 22;
  const DRIFT = 0.13, DRIFT_K = 300, DRIFT_C = 20;
  const TIP_K = 340, TIP_C = 26;
  const VERTICAL_REACH = 120;

  const mkSpring = (x) => ({ x: x || 0, v: 0 });

  /** Полу-неявный метод Эйлера с подшагами — устойчив при низком/нестабильном FPS. */
  function spring(s, target, k, c, dt) {
    const n = dt > 0.012 ? Math.ceil(dt / 0.008) : 1;
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      s.v += (-k * (s.x - target) - c * s.v) * h;
      s.x += s.v * h;
    }
    return s.x;
  }

  /** mulberry32 — детерминированный сид для фазы idle-wave. */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------- тултип-чип ---------- */
  let tip = null;
  if (cfg.tooltip) {
    tip = document.createElement('div');
    tip.className = 'dock-tip';
    tip.setAttribute('aria-hidden', 'true');
    dock.appendChild(tip);
  }

  /* ---------- базовые координаты иконок (не зависят от transform) ---------- */
  let bases = [];
  function measure() {
    const dockRect = dock.getBoundingClientRect();
    bases = items.map((el) => {
      const prevTransform = el.style.transform;
      el.style.transform = 'none';
      const r = el.getBoundingClientRect();
      el.style.transform = prevTransform;
      return {
        x: r.left - dockRect.left + r.width / 2,
        y: r.top - dockRect.top + r.height / 2,
      };
    });
  }
  measure();
  window.addEventListener('resize', measure);
  if ('ResizeObserver' in window) {
    new ResizeObserver(measure).observe(dock);
  }

  /* ---------- указатель и фокус ---------- */
  const pointer = { x: -1e4, y: -1e4, inside: false };
  let focusIndex = -1;

  dock.addEventListener('pointermove', (e) => {
    const r = dock.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  });
  dock.addEventListener('pointerdown', (e) => {
    const r = dock.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
    pointer.inside = true;
  });
  dock.addEventListener('pointerleave', () => {
    pointer.inside = false;
    pointer.x = -1e4;
    pointer.y = -1e4;
  });
  items.forEach((el, i) => {
    el.addEventListener('focus', () => { focusIndex = i; });
    el.addEventListener('blur', () => { if (focusIndex === i) focusIndex = -1; });
  });

  /* ---------- пауза вне экрана / на скрытой вкладке ---------- */
  let onScreen = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      entries.forEach((e) => { onScreen = e.isIntersecting; });
    }, { threshold: 0.05 }).observe(dock);
  }
  let tabVisible = true;
  document.addEventListener('visibilitychange', () => {
    tabVisible = document.visibilityState !== 'hidden';
  });

  /* ---------- статичный режим (reduced-motion) ---------- */
  function applyStaticMode(isStatic) {
    dock.dataset.motion = isStatic ? 'static' : 'animated';
    if (isStatic) {
      items.forEach((el) => { el.style.transform = ''; });
      if (tip) tip.style.opacity = '0';
    }
  }
  applyStaticMode(mql.matches);
  mql.addEventListener('change', (e) => applyStaticMode(e.matches));

  if (mql.matches) return; // дальше запускать rAF-цикл не нужно

  /* ---------- цикл пружин ---------- */
  const states = items.map(() => ({ s: mkSpring(1), y: mkSpring(0), dx: mkSpring(0) }));
  const tipX = mkSpring(0);
  const tipO = mkSpring(0);
  const rng = makeRng(7);
  let idleT = rng() * 20;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    if (mql.matches) return; // могли переключиться в статику на лету
    if (!onScreen || !tabVisible) { last = now; return; }

    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0) || dt > 0.05) dt = 0.016;
    idleT += dt;

    const grow = Math.max(0, cfg.maxScale - 1);
    const sigma = Math.max(8, cfg.magnetRadius);
    const dockW = dock.clientWidth;

    let px, py, amp;
    if (pointer.inside) {
      px = pointer.x; py = pointer.y; amp = 1;
    } else if (focusIndex >= 0 && bases[focusIndex]) {
      // клавиатурный фокус выгибает поле точно так же, как курсор
      px = bases[focusIndex].x; py = bases[focusIndex].y; amp = 1;
    } else if (cfg.idleWave) {
      px = dockW / 2 + Math.sin(idleT * 0.55) * dockW * 0.34;
      py = bases[0] ? bases[0].y : 20;
      amp = 0.35;
    } else {
      px = -1e4; py = -1e4; amp = 0;
    }

    let bestI = -1, bestInf = 0;
    for (let i = 0; i < items.length; i++) {
      const b = bases[i], el = items[i], st = states[i];
      if (!b || !el) continue;
      const d = px - b.x;
      const vert = Math.max(0, 1 - Math.abs(py - b.y) / VERTICAL_REACH);
      const inf = Math.exp(-(d * d) / (2 * sigma * sigma)) * amp * vert;
      if (inf > bestInf) { bestInf = inf; bestI = i; }
      spring(st.s, 1 + grow * inf, cfg.stiffness, cfg.damping, dt);
      spring(st.y, -cfg.lift * inf, LIFT_K, LIFT_C, dt);
      spring(st.dx, d * DRIFT * inf, DRIFT_K, DRIFT_C, dt);
      el.style.transform = 'translate3d(' + st.dx.x.toFixed(2) + 'px,' + st.y.x.toFixed(2) + 'px,0) scale(' + st.s.x.toFixed(3) + ')';
    }

    if (!tip) return;
    const showTip = cfg.tooltip && (pointer.inside || focusIndex >= 0) && bestInf > 0.55 && bestI >= 0;
    if (showTip) {
      const label = items[bestI].dataset.tip || items[bestI].getAttribute('aria-label') || '';
      if (tip.textContent !== label) tip.textContent = label;
      spring(tipX, bases[bestI].x, TIP_K, TIP_C, dt);
    }
    spring(tipO, showTip ? 1 : 0, 220, 24, dt);
    const o = clamp(tipO.x, 0, 1);
    if (o > 0.01 && bestI >= 0 && bases[bestI]) {
      // чип под доком (шапка сайта сверху, поэтому подпись выезжает вниз)
      const ty = bases[bestI].y + 26 + states[bestI].y.x * 0.4 + 6 * o;
      tip.style.opacity = o.toFixed(3);
      tip.style.transform = 'translate3d(' + (tipX.x - tip.offsetWidth / 2).toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
    } else {
      tip.style.opacity = '0';
    }
  }
  requestAnimationFrame(frame);
})();
