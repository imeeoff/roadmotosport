/* =========================================================
   MOTOSPORT — profile.js
   Личный кабинет: проверка сессии, заполнение данных райдера,
   переключение разделов, формы настроек.

   Раздел "История аренд" и "Гараж" пока работают на демо-данных —
   на бэкенде ещё нет таблиц бронирований/избранного. Как только
   появятся соответствующие эндпойнты (например /api/bookings,
   /api/garage), замените блоки renderBookings()/renderGarage()
   на fetch к ним — разметка и стили уже готовы.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('profileRoot');
  if (!root) return;

  /* ---------- 1. Проверяем сессию ---------- */
  let session;
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    session = await r.json();
  } catch (e) {
    session = { ok: false, user: null };
  }

  if (!session || !session.ok || !session.user) {
    // не авторизован — уводим на вход, запомнив, куда вернуться
    location.href = '/login.html';
    return;
  }

  const user = session.user;
  const displayName = (user.name && user.name.trim()) || user.email;
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  /* ---------- 2. Заполняем шапку кабинета ---------- */
  document.querySelectorAll('[data-user-initial]').forEach(el => el.textContent = initial);
  document.querySelectorAll('[data-user-name]').forEach(el => el.textContent = displayName);
  document.querySelectorAll('[data-user-email]').forEach(el => el.textContent = user.email);

  const nameInput = document.getElementById('settingsName');
  const emailInput = document.getElementById('settingsEmail');
  const phoneInput = document.getElementById('settingsPhone');
  if (nameInput) nameInput.value = user.name || '';
  if (emailInput) emailInput.value = user.email || '';
  if (phoneInput) phoneInput.value = user.phone || '';

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
    : '—';
  document.querySelectorAll('[data-member-since]').forEach(el => el.textContent = memberSince);

  root.classList.add('ready');

  /* ---------- 3. Переключение разделов ---------- */
  const navButtons = document.querySelectorAll('.profile-nav button[data-panel]');
  const panels = document.querySelectorAll('.profile-panel');

  function activatePanel(id) {
    panels.forEach(p => p.classList.toggle('active', p.id === id));
    navButtons.forEach(b => b.classList.toggle('active', b.dataset.panel === id));
    history.replaceState(null, '', `#${id}`);
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => activatePanel(btn.dataset.panel));
  });

  const initialPanel = location.hash.replace('#', '');
  const validPanel = [...panels].some(p => p.id === initialPanel);
  activatePanel(validPanel ? initialPanel : 'panel-overview');

  /* ---------- 4. Выход ---------- */
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (e) { /* уводим в любом случае */ }
      location.href = '/index.html';
    });
  });

  /* ---------- 5. Форма личных данных ---------- */
  const profileForm = document.getElementById('profileForm');
  const profileStatus = document.getElementById('profileFormStatus');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // TODO: подключить реальный /api/auth/update-profile, когда появится
      showSettingsStatus(profileStatus, 'Изменения сохранены.', 'ok');
    });
  }

  /* ---------- 6. Форма смены пароля ---------- */
  const passwordForm = document.getElementById('passwordForm');
  const passwordStatus = document.getElementById('passwordFormStatus');
  if (passwordForm) {
    passwordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = document.getElementById('newPassword').value;
      const confirm = document.getElementById('confirmNewPassword').value;
      if (next.length < 8) {
        showSettingsStatus(passwordStatus, 'Пароль должен быть не короче 8 символов.', 'err');
        return;
      }
      if (next !== confirm) {
        showSettingsStatus(passwordStatus, 'Пароли не совпадают.', 'err');
        return;
      }
      // TODO: подключить реальный /api/auth/change-password, когда появится
      showSettingsStatus(passwordStatus, 'Пароль обновлён.', 'ok');
      passwordForm.reset();
    });
  }

  function showSettingsStatus(el, text, type) {
    if (!el) return;
    el.textContent = text;
    el.className = 'settings-status show ' + type;
    setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------- 7. Удаление аккаунта (заглушка с подтверждением) ---------- */
  const deleteBtn = document.getElementById('deleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      const sure = confirm('Удалить аккаунт без возможности восстановления? Это действие нельзя отменить.');
      if (!sure) return;
      // TODO: подключить реальный /api/auth/delete-account, когда появится
      alert('Функция удаления аккаунта скоро будет доступна. Пока напишите нам на roadmotosport@outlook.com.');
    });
  }

  /* ---------- 8. Демо-данные: история аренд ---------- */
  const demoBookings = [
    { bike: 'Ducati Panigale V4 S', img: '/images/panigale.jpg', date: '2–4 августа 2026', type: 'Аренда · 3 суток', price: '36 000 ₽', status: 'done' },
    { bike: 'Kawasaki Ninja ZX-10R', img: '/images/zx10r.jpg', date: '14 июня 2026', type: 'Аренда · сутки', price: '8 500 ₽', status: 'done' },
    { bike: 'BMW S1000RR', img: '/images/s1000rr.jpg', date: '30 августа 2026', type: 'Аренда · неделя', price: '52 000 ₽', status: 'upcoming' },
  ];
  renderBookings(demoBookings);

  function renderBookings(items) {
    const list = document.getElementById('bookingList');
    const empty = document.getElementById('bookingEmpty');
    if (!list) return;
    if (!items.length) {
      list.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    list.style.display = 'flex';
    if (empty) empty.style.display = 'none';
    list.innerHTML = items.map(b => `
      <div class="booking-row">
        <div class="booking-thumb"><img src="${b.img}" alt="${b.bike}"></div>
        <div class="booking-info">
          <div class="booking-bike">${b.bike}</div>
          <div class="booking-meta">${b.type} · ${b.date}</div>
        </div>
        <span class="booking-status ${b.status}">${b.status === 'done' ? 'Завершено' : 'Предстоит'}</span>
        <div class="booking-price">${b.price}</div>
      </div>
    `).join('');
  }

  /* ---------- 9. Демо-данные: гараж (избранное) ---------- */
  const demoGarage = [
    { name: 'Ninja ZX-10R', brand: 'Kawasaki', img: '/images/zx10r.jpg', price: 'от 8 500 ₽ / сутки' },
    { name: 'Panigale V4 S', brand: 'Ducati', img: '/images/panigale.jpg', price: 'от 12 000 ₽ / сутки' },
  ];
  renderGarage(demoGarage);

  function renderGarage(items) {
    const grid = document.getElementById('garageGrid');
    const empty = document.getElementById('garageEmpty');
    if (!grid) return;
    if (!items.length) {
      grid.style.display = 'none';
      if (empty) empty.style.display = 'block';
      return;
    }
    grid.style.display = 'grid';
    if (empty) empty.style.display = 'none';
    grid.innerHTML = items.map((b, i) => `
      <div class="garage-card" data-idx="${i}">
        <div class="garage-media">
          <img src="${b.img}" alt="${b.name}">
          <button class="garage-unfav" title="Убрать из избранного" aria-label="Убрать из избранного">
            <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
          </button>
        </div>
        <div class="garage-body">
          <div class="garage-brand">${b.brand}</div>
          <h3 class="garage-name">${b.name}</h3>
          <div class="garage-price">${b.price}</div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.garage-unfav').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.garage-card');
        card.style.transition = 'opacity .3s, transform .3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(.92)';
        setTimeout(() => {
          const idx = Number(card.dataset.idx);
          demoGarage.splice(idx, 1);
          renderGarage(demoGarage);
        }, 280);
      });
    });
  }

  /* ---------- 10. Демо-данные: активность ---------- */
  const activity = [
    { date: memberSince, text: `<strong>${displayName}</strong> зарегистрировался(ась) в MotoSport` },
    { date: 'Сегодня', text: 'Выполнен вход в личный кабинет' },
  ];
  const activityList = document.getElementById('activityList');
  if (activityList) {
    activityList.innerHTML = activity.map(a => `
      <div class="activity-item">
        <div class="activity-date">${a.date}</div>
        <div class="activity-text">${a.text}</div>
      </div>
    `).join('');
  }
});
