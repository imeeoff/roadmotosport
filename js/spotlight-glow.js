/* =========================================================
   MOTOSPORT — spotlight-glow.js
   Обновляет CSS-переменные --glow-x/--glow-y/--glow-xp на
   :root. Все .glow-card подхватывают их через наследование
   custom properties + background-attachment:fixed, поэтому
   свет выглядит как единый источник, "просвечивающий" сквозь
   все карточки на странице сразу.
========================================================= */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  const root = document.documentElement;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let raf = null;

  function apply() {
    root.style.setProperty('--glow-x', x + 'px');
    root.style.setProperty('--glow-y', y + 'px');
    root.style.setProperty('--glow-xp', (x / window.innerWidth).toFixed(3));
    raf = null;
  }

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (!raf) raf = requestAnimationFrame(apply);
  }, { passive: true });
})();
