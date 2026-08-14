/* =========================================================
   MOTOSPORT — profile-chip.js
   Проверяет активную сессию (/api/auth/me) и, если пользователь
   авторизован, рисует в шапке кликабельную плашку с его именем
   и email вместо иконки "Войти". По клику — разворачивается
   меню профиля с выходом из аккаунта.

   Зависит от: /api/auth/me.js, /api/auth/logout.js
   Подключать ПОСЛЕ nav-dock.js.
========================================================= */
document.addEventListener('DOMContentLoaded', async () => {
  const nav = document.querySelector('.site-header .nav');
  if (!nav) return;

  const loginDockLink = document.querySelector('.nav-dock .dock-item[href="/login.html"]');
  const mobileLoginLink = document.querySelector('.mobile-nav a[href="/login.html"]');

  let data;
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    data = await r.json();
  } catch (e) {
    /* бэкенд недоступен — просто оставляем стандартную ссылку "Войти" */
    return;
  }

  if (!data || !data.ok || !data.user) return; // пользователь не авторизован

  const { name, email } = data.user;
  const displayName = (name && name.trim()) || email;
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  const escapeHtml = (str) => String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

  /* прячем ссылку "Войти" в доке шапки и в мобильном меню, подставляем профиль */
  if (loginDockLink) loginDockLink.style.display = 'none';

  if (mobileLoginLink) {
    mobileLoginLink.href = '/profile.html';
    mobileLoginLink.innerHTML = `<span>06</span>${escapeHtml(displayName)}`;
    mobileLoginLink.style.display = '';

    /* добавляем пункт "Выйти" сразу под профилем в мобильном меню */
    const mobileLogout = document.createElement('a');
    mobileLogout.href = '#';
    mobileLogout.id = 'mobileLogoutLink';
    mobileLogout.innerHTML = `<span>07</span>Выйти`;
    mobileLoginLink.insertAdjacentElement('afterend', mobileLogout);

    mobileLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (err) { /* уводим в любом случае */ }
      location.href = '/index.html';
    });
  }


  /* ---------- собираем DOM плашки ---------- */
  const chip = document.createElement('div');
  chip.className = 'profile-chip';
  chip.setAttribute('role', 'button');
  chip.setAttribute('aria-haspopup', 'true');
  chip.setAttribute('aria-expanded', 'false');
  chip.tabIndex = 0;

  chip.innerHTML = `
    <div class="profile-chip-avatar">${escapeHtml(initial)}</div>
    <span class="profile-chip-name">${escapeHtml(displayName)}</span>
    <span class="profile-chip-caret">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="6 9 12 15 18 9"/></svg>
    </span>

    <div class="profile-dropdown" role="menu" aria-label="Меню профиля">
      <div class="profile-dropdown-head">
        <div class="profile-chip-avatar">${escapeHtml(initial)}</div>
        <div>
          <div class="profile-dropdown-name">${escapeHtml(displayName)}</div>
          <div class="profile-dropdown-email">${escapeHtml(email)}</div>
        </div>
      </div>
      <nav>
        <a href="/profile.html" role="menuitem">
          <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Личный кабинет
        </a>
        <a href="/contact.html" role="menuitem">
          <svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>
          Мои заявки
        </a>
        <div class="profile-dropdown-divider"></div>
        <button type="button" class="logout-btn" id="profileLogoutBtn" role="menuitem">
          <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Выйти
        </button>
      </nav>
    </div>
  `;

  /* вставляем перед кнопкой "Забронировать" */
  const bookBtn = nav.querySelector('.btn-primary');
  if (bookBtn) {
    nav.insertBefore(chip, bookBtn);
  } else {
    nav.appendChild(chip);
  }
  chip.style.display = 'flex';

  const dropdown = chip.querySelector('.profile-dropdown');

  function openDropdown() {
    chip.classList.add('open');
    dropdown.classList.add('open');
    chip.setAttribute('aria-expanded', 'true');
  }
  function closeDropdown() {
    chip.classList.remove('open');
    dropdown.classList.remove('open');
    chip.setAttribute('aria-expanded', 'false');
  }
  function toggleDropdown() {
    if (dropdown.classList.contains('open')) closeDropdown();
    else openDropdown();
  }

  chip.addEventListener('click', (e) => {
    if (e.target.closest('#profileLogoutBtn') || e.target.closest('a')) return;
    e.stopPropagation();
    toggleDropdown();
  });

  chip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDropdown();
    }
    if (e.key === 'Escape') closeDropdown();
  });

  document.addEventListener('click', closeDropdown);
  dropdown.addEventListener('click', (e) => e.stopPropagation());

  /* ---------- выход из аккаунта ---------- */
  chip.querySelector('#profileLogoutBtn').addEventListener('click', async () => {
    const btn = chip.querySelector('#profileLogoutBtn');
    btn.disabled = true;
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      /* даже если запрос не прошёл — уводим на главную */
    }
    location.href = '/index.html';
  });
});
