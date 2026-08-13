/* =========================================================
   MOTOSPORT — script.js
   Навигация, скролл-анимации, тахометры, лайтбокс галереи,
   переключатель цен (сутки/неделя), форма контактов
========================================================= */

/* =========================================================
   Учёт визитов (отправка в Telegram через /api/track)
   Работает только при деплое на Vercel — на обычном Nginx
   без серверной функции запрос просто не пройдёт и будет
   тихо проигнорирован (сайт при этом не ломается).
========================================================= */
(function trackVisit() {
  try {
    const payload = JSON.stringify({
      page: location.pathname.replace(/^\//, '') || 'index.html',
      referrer: document.referrer || '',
      lang: navigator.language || '',
      screen: `${window.screen.width}x${window.screen.height}`,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/collect', blob);
    } else {
      fetch('/api/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (e) {
    /* тихо игнорируем — трекинг не должен мешать работе сайта */
  }
})();

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Активная ссылка в меню ---------- */
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-dock a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) link.classList.add('active');
  });

  /* ---------- Шапка при скролле ---------- */
  const header = document.querySelector('.site-header');
  const progressBar = document.querySelector('.scroll-progress');

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 30);

    if (progressBar) {
      const h = document.documentElement;
      const scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
      progressBar.style.width = scrolled + '%';
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобильное меню ---------- */
  const burger = document.querySelector('.burger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        burger.classList.remove('open');
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Появление элементов при скролле ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------- Тахометры (анимация циферблатов и чисел) ---------- */
  const gauges = document.querySelectorAll('.gauge');
  if (gauges.length) {
    const CIRC = 326; // длина дуги (совпадает с stroke-dasharray в CSS)

    const animateGauge = (gauge) => {
      const fill = gauge.querySelector('.gauge-fill');
      const valueEl = gauge.querySelector('.gauge-value');
      const target = parseFloat(gauge.dataset.value || '0');
      const max = parseFloat(gauge.dataset.max || '100');
      const suffix = gauge.dataset.suffix || '';
      const ratio = Math.min(target / max, 1);
      const offset = CIRC - ratio * CIRC * 0.72; // 0.72 ~ дуга 260°, оставляем разрыв внизу

      if (fill) fill.style.strokeDashoffset = offset;

      if (valueEl) {
        const duration = 1500;
        const start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const current = Math.round(target * eased);
          valueEl.textContent = current + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    };

    if ('IntersectionObserver' in window) {
      const gIo = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateGauge(entry.target);
            gIo.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      gauges.forEach(g => gIo.observe(g));
    } else {
      gauges.forEach(animateGauge);
    }
  }

  /* ---------- Переключатель цен: сутки / неделя (каталог) ---------- */
  const switchBtns = document.querySelectorAll('.pricing-switch button');
  const priceEls = document.querySelectorAll('.bike-price .price-flip');

  if (switchBtns.length && priceEls.length) {
    switchBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('active')) return;
        switchBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode; // 'day' | 'week'

        priceEls.forEach(el => {
          el.classList.add('swap');
          setTimeout(() => {
            const card = el.closest('.bike-card');
            const price = mode === 'week' ? card.dataset.priceWeek : card.dataset.priceDay;
            el.textContent = price + ' ₽';
            const unitEl = card.querySelector('.price-unit');
            if (unitEl) unitEl.textContent = mode === 'week' ? 'за неделю' : 'за сутки';
            el.classList.remove('swap');
          }, 220);
        });
      });
    });
  }

  /* ---------- Лайтбокс галереи ---------- */
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.querySelector('.lightbox');

  if (galleryItems.length && lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbCaption = lightbox.querySelector('.lightbox-caption');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-nav.prev');
    const nextBtn = lightbox.querySelector('.lightbox-nav.next');
    const items = Array.from(galleryItems);
    let currentIndex = 0;

    const openLightbox = (index) => {
      currentIndex = index;
      const img = items[index].querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      if (lbCaption) lbCaption.textContent = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const closeLightbox = () => {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    };
    const showRelative = (dir) => {
      currentIndex = (currentIndex + dir + items.length) % items.length;
      openLightbox(currentIndex);
    };

    items.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)));
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', () => showRelative(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => showRelative(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showRelative(1);
      if (e.key === 'ArrowLeft') showRelative(-1);
    });
  }

  /* ---------- Форма контактов ---------- */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    const statusEl = contactForm.querySelector('.form-status');
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const requiredFields = contactForm.querySelectorAll('[required]');
      let valid = true;
      requiredFields.forEach(field => {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#e8382c';
        } else {
          field.style.borderColor = '';
        }
      });

      if (!valid) {
        if (statusEl) {
          statusEl.textContent = 'Заполните обязательные поля, отмеченные звёздочкой.';
          statusEl.style.color = '#e8382c';
          statusEl.classList.add('show');
        }
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.textContent = 'Отправляем…';
        submitBtn.disabled = true;
      }

      setTimeout(() => {
        if (statusEl) {
          statusEl.textContent = 'Заявка отправлена. Мы свяжемся с вами в течение часа.';
          statusEl.style.color = '#8fd6a8';
          statusEl.classList.add('show');
        }
        if (submitBtn) {
          submitBtn.textContent = 'Отправлено ✓';
          setTimeout(() => {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
            contactForm.reset();
          }, 2200);
        }
      }, 900);
    });
  }

  /* ---------- Плавный переход по ссылкам-якорям ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  /* ---------- Параллакс полосы в hero ---------- */
  const heroStripe = document.querySelector('.hero-stripe');
  if (heroStripe) {
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      heroStripe.style.transform = `translateY(${-8 + y * 0.05}%)`;
    }, { passive: true });
  }

});
