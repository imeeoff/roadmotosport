/* =========================================================
   MOTOSPORT — auth.js
   Логика страницы входа/регистрации.

   Подключён к реальному бэкенду:
   /api/auth/register.js, /api/auth/login.js,
   /api/auth/me.js, /api/auth/logout.js
   Сессия хранится в httpOnly-cookie (не в localStorage).
========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const detailsForm = document.getElementById('detailsForm');
  if (!detailsForm) return; // не на странице авторизации

  const resetForm = document.getElementById('resetForm');
  const verifyForm = document.getElementById('verifyForm');
  const completeStep = document.getElementById('completeStep');
  const loginSignupWrap = document.getElementById('loginSignupWrap');

  const authTitle = document.getElementById('authTitle');
  const authSubtitle = document.getElementById('authSubtitle');
  const tabs = document.querySelectorAll('.auth-tabs [data-tab]');

  const fieldName = document.getElementById('fieldName');
  const fieldConfirm = document.getElementById('fieldConfirm');
  const fieldPhone = document.getElementById('fieldPhone');
  const loginExtras = document.getElementById('loginExtras');
  const signupExtras = document.getElementById('signupExtras');
  const detailsSubmitText = document.getElementById('detailsSubmitText');
  const bottomSwitch = document.getElementById('bottomSwitch');
  const switchQuestion = document.getElementById('switchQuestion');
  const switchModeBtn = document.getElementById('switchModeBtn');

  let mode = 'login'; // 'login' | 'signup'
  let pendingEmail = ''; // email, ожидающий подтверждения после регистрации

  /* ---------- Переключение шагов (форм) ---------- */
  function showStep(el) {
    [detailsForm, resetForm, verifyForm].forEach(f => f.classList.remove('active'));
    el.classList.add('active');
  }

  function setMode(newMode) {
    mode = newMode;
    tabs.forEach(t => {
      const active = t.dataset.tab === newMode;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active);
    });

    const isSignup = newMode === 'signup';
    fieldName.style.display = isSignup ? '' : 'none';
    fieldConfirm.style.display = isSignup ? '' : 'none';
    fieldPhone.style.display = isSignup ? '' : 'none';
    loginExtras.style.display = isSignup ? 'none' : '';
    signupExtras.style.display = isSignup ? '' : 'none';
    document.getElementById('pwStrength').classList.toggle('show', isSignup);

    authTitle.textContent = isSignup ? 'Создать аккаунт' : 'С возвращением';
    authSubtitle.textContent = isSignup ? 'Зарегистрируйтесь, чтобы бронировать байки' : 'Войдите, чтобы управлять бронированиями';
    detailsSubmitText.textContent = isSignup ? 'Зарегистрироваться' : 'Войти';
    switchQuestion.textContent = isSignup ? 'Уже есть аккаунт?' : 'Нет аккаунта?';
    switchModeBtn.textContent = isSignup ? 'Войти' : 'Зарегистрироваться';
    switchModeBtn.dataset.tab = isSignup ? 'login' : 'signup';

    clearErrors(detailsForm);
    hideStatus(document.getElementById('detailsStatus'));
    bottomSwitch.style.display = '';
    showStep(detailsForm);
  }

  tabs.forEach(t => t.addEventListener('click', () => {
    if (t.dataset.tab === 'reset') { openReset(); return; }
    setMode(t.dataset.tab);
  }));
  switchModeBtn.addEventListener('click', () => setMode(switchModeBtn.dataset.tab));
  document.querySelectorAll('[data-tab="reset"]').forEach(b => b.addEventListener('click', openReset));
  document.querySelectorAll('[data-tab="login"]').forEach(b => b.addEventListener('click', (e) => {
    if (b.closest('#resetForm')) { setMode('login'); }
  }));

  function openReset() {
    bottomSwitch.style.display = 'none';
    showStep(resetForm);
  }

  /* ---------- Показать/скрыть пароль ---------- */
  document.querySelectorAll('.field-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggleFor);
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.setAttribute('aria-label', isPw ? 'Скрыть пароль' : 'Показать пароль');
    });
  });

  /* ---------- Индикатор сложности пароля ---------- */
  const REQS = [
    { key: 'length', label: 'Минимум 8 символов', test: v => v.length >= 8 },
    { key: 'upper', label: 'Заглавная буква', test: v => /[A-ZА-Я]/.test(v) },
    { key: 'lower', label: 'Строчная буква', test: v => /[a-zа-я]/.test(v) },
    { key: 'number', label: 'Цифра', test: v => /\d/.test(v) },
    { key: 'special', label: 'Спецсимвол', test: v => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v) },
  ];
  const strengthLabels = ['Очень слабый', 'Слабый', 'Средний', 'Хороший', 'Отличный'];

  const pwInput = document.getElementById('password');
  const pwFill = document.getElementById('pwStrengthFill');
  const pwLabel = document.getElementById('pwStrengthLabel');
  const pwHints = document.getElementById('pwHints');

  function passwordScore(v) {
    return REQS.filter(r => r.test(v)).length;
  }

  pwInput.addEventListener('input', () => {
    if (mode !== 'signup') return;
    const v = pwInput.value;
    const score = passwordScore(v);
    pwFill.style.width = (score / 5 * 100) + '%';
    pwFill.style.background = score <= 1 ? '#e8382c' : score <= 2 ? '#e88a2c' : score <= 3 ? '#e8d02c' : score <= 4 ? '#4f8cf0' : '#8fd6a8';
    pwLabel.textContent = v ? strengthLabels[Math.max(score - 1, 0)] : '—';
    pwHints.innerHTML = REQS.map(r => {
      const ok = r.test(v);
      return `<span class="pw-hint ${ok ? 'ok' : ''}"><span class="dot"></span>${r.label}</span>`;
    }).join('');
  });

  /* ---------- Валидация ---------- */
  function setError(field, message) {
    const wrap = document.querySelector(`[data-error-for="${field}"]`)?.closest('.field');
    const errEl = document.querySelector(`[data-error-for="${field}"]`);
    if (!errEl) return;
    if (message) {
      errEl.textContent = message;
      errEl.hidden = false;
      wrap?.classList.add('error');
    } else {
      errEl.hidden = true;
      wrap?.classList.remove('error');
    }
  }

  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => { el.hidden = true; el.textContent = ''; });
    form.querySelectorAll('.field').forEach(el => el.classList.remove('error'));
  }

  function validateEmail(v) {
    if (!v.trim()) return 'Укажите электронную почту';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Введите корректный email';
    return '';
  }

  function validateDetails() {
    let ok = true;
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('phone').value;
    const agree = document.getElementById('agreeToTerms').checked;

    if (mode === 'signup' && !name.trim()) { setError('name', 'Укажите имя'); ok = false; } else setError('name', '');

    const emailErr = validateEmail(email);
    setError('email', emailErr); if (emailErr) ok = false;

    if (!password) { setError('password', 'Введите пароль'); ok = false; }
    else if (password.length < 8) { setError('password', 'Минимум 8 символов'); ok = false; }
    else if (mode === 'signup' && passwordScore(password) < 3) { setError('password', 'Пароль слишком простой'); ok = false; }
    else setError('password', '');

    if (mode === 'signup') {
      if (confirm !== password) { setError('confirmPassword', 'Пароли не совпадают'); ok = false; }
      else setError('confirmPassword', '');

      if (phone && !/^\+?[\d\s\-()]+$/.test(phone)) { setError('phone', 'Введите корректный телефон'); ok = false; }
      else setError('phone', '');

      if (!agree) { setError('agreeToTerms', 'Нужно принять условия'); ok = false; }
    }

    return ok;
  }

  /* ---------- Статус-сообщения ---------- */
  function showStatus(el, message, type) {
    el.textContent = message;
    el.className = 'auth-status show ' + type;
  }
  function hideStatus(el) {
    el.className = 'auth-status';
  }

  /* ---------- Submit: логин / регистрация ---------- */
  const detailsStatus = document.getElementById('detailsStatus');
  const detailsSubmit = document.getElementById('detailsSubmit');

  detailsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(detailsStatus);
    if (!validateDetails()) return;

    setLoading(detailsSubmit, true, detailsSubmitText);

    const email = document.getElementById('email').value.trim();
    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = mode === 'login'
      ? {
          email,
          password: document.getElementById('password').value,
        }
      : {
          name: document.getElementById('name').value.trim(),
          email,
          password: document.getElementById('password').value,
          phone: document.getElementById('phone').value.trim(),
        };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then(r => r.json().then(data => ({ status: r.status, data })))
      .then(({ status, data }) => {
        setLoading(detailsSubmit, false, detailsSubmitText);

        if (!data || !data.ok) {
          showStatus(detailsStatus, (data && data.error) || 'Не удалось выполнить запрос. Попробуйте ещё раз.', 'err');
          return;
        }

        if (mode === 'login') {
          showStatus(detailsStatus, 'Вход выполнен успешно.', 'ok');
          setTimeout(() => { location.href = '/index.html'; }, 700);
        } else {
          // Регистрация прошла успешно — сессия уже установлена бэкендом.
          // Показываем шаг с кодом как декоративный (без реальной email-верификации)
          // и сразу переводим пользователя в личный кабинет.
          pendingEmail = email;
          document.getElementById('verifyEmailLabel').textContent = pendingEmail;
          bottomSwitch.style.display = 'none';
          showStep(verifyForm);
        }
      })
      .catch(() => {
        setLoading(detailsSubmit, false, detailsSubmitText);
        showStatus(detailsStatus, 'Сервер недоступен. Попробуйте позже.', 'err');
      });
  });

  function setLoading(btn, loading, textEl) {
    btn.disabled = loading;
    if (loading) {
      textEl.dataset.original = textEl.textContent;
      btn.innerHTML = '<span class="spinner"></span>';
    } else {
      btn.innerHTML = `<span id="detailsSubmitText">${textEl.dataset.original || textEl.textContent}</span>`;
    }
  }

  /* ---------- Submit: восстановление пароля ---------- */
  const resetStatus = document.getElementById('resetStatus');
  resetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(resetStatus);
    const email = document.getElementById('resetEmail').value;
    const err = validateEmail(email);
    setError('resetEmail', err);
    if (err) return;

    const btn = document.getElementById('resetSubmit');
    btn.disabled = true;

    // TODO: реализовать /api/auth/reset-password (требует email-провайдера
    // для отправки ссылки — например, Resend, SendGrid или Telegram-бот,
    // как уже используется в collect.js/webhook.js).
    setTimeout(() => {
      btn.disabled = false;
      showStatus(resetStatus, 'Если такой email зарегистрирован — на него отправлена ссылка.', 'ok');
      setTimeout(() => setMode('login'), 1800);
    }, 800);
  });

  /* ---------- Submit: код подтверждения ----------
     Пока не подключена реальная email-верификация — этот шаг
     декоративный и просто завершает регистрацию (сессия уже
     установлена бэкендом при регистрации). Когда подключите
     email-провайдера, замените блок ниже на fetch к
     /api/auth/verify-email. */
  const verifyStatus = document.getElementById('verifyStatus');
  const codeInput = document.getElementById('verificationCode');
  codeInput.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  verifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideStatus(verifyStatus);
    const code = codeInput.value;
    if (!/^\d{6}$/.test(code)) { setError('verificationCode', 'Введите 6-значный код'); return; }
    setError('verificationCode', '');

    const btn = document.getElementById('verifySubmit');
    btn.disabled = true;

    setTimeout(() => {
      btn.disabled = false;
      loginSignupWrap.style.display = 'none';
      completeStep.classList.add('active');
    }, 600);
  });

  document.getElementById('backToDetails').addEventListener('click', () => {
    showStep(detailsForm);
  });

  setMode('login');
});
