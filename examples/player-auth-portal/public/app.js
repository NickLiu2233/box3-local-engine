'use strict';

const loadingView = document.querySelector('#loading-view');
const authView = document.querySelector('#auth-view');
const accountView = document.querySelector('#account-view');
const loginTab = document.querySelector('#login-tab');
const registerTab = document.querySelector('#register-tab');
const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const message = document.querySelector('#message');
const accountMessage = document.querySelector('#message-account');
const logoutButton = document.querySelector('#logout-button');
const continueLink = document.querySelector('#continue-link');
const themeToggle = document.querySelector('#theme-toggle');
const pageTitle = document.querySelector('#page-title');
const pageSubtitle = document.querySelector('#page-subtitle');

const themeKey = 'box-player-admin-theme';
const themeLabels = {
  system: '跟随系统',
  light: '亮色',
  dark: '暗色',
};

const query = new URLSearchParams(location.search);
const navigation = {
  source: query.get('source') || '',
  returnUrl: query.get('returnUrl') || '',
};

function errorMessage(error) {
  return error instanceof Error ? error.message : '请求失败，请稍后重试';
}

function showMessage(target, value) {
  target.textContent = value || '';
  target.hidden = !value;
}

function setButtonPending(button, pending, pendingLabel) {
  if (!button.dataset.label) button.dataset.label = button.textContent;
  button.disabled = pending;
  button.textContent = pending ? pendingLabel : button.dataset.label;
}

function currentTheme() {
  const value = document.documentElement.dataset.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}

function updateThemeButton() {
  const theme = currentTheme();
  const description = `主题：${themeLabels[theme]}（点击切换）`;
  themeToggle.title = description;
  themeToggle.setAttribute('aria-label', description);
}

themeToggle.addEventListener('click', () => {
  const current = currentTheme();
  const next = current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(themeKey, next);
  } catch {
    // Theme persistence is optional.
  }
  updateThemeButton();
});

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `请求失败（HTTP ${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return data;
}

function setMode(mode) {
  const login = mode === 'login';
  loginTab.classList.toggle('is-active', login);
  loginTab.setAttribute('aria-selected', String(login));
  registerTab.classList.toggle('is-active', !login);
  registerTab.setAttribute('aria-selected', String(!login));
  loginForm.hidden = !login;
  registerForm.hidden = login;
  showMessage(message, '');
  const firstInput = (login ? loginForm : registerForm).querySelector('input');
  firstInput.focus();
}

function showAuthentication(registrationEnabled = true) {
  loadingView.hidden = true;
  accountView.hidden = true;
  authView.hidden = false;
  registerTab.hidden = !registrationEnabled;
  if (!registrationEnabled && !registerForm.hidden) setMode('login');
  pageTitle.textContent = '登录玩家账号';
  pageSubtitle.textContent = registrationEnabled
    ? '登录后继续访问游戏或创作端'
    : '使用服主创建的账号继续访问';
}

function showAccount(player, returnUrl) {
  loadingView.hidden = true;
  authView.hidden = true;
  accountView.hidden = false;
  const name = player.displayName || player.username || '玩家';
  document.querySelector('#avatar').textContent = Array.from(name)[0] || '玩';
  document.querySelector('#display-name').textContent = name;
  document.querySelector('#username').textContent = player.username
    ? `@${player.username}`
    : '';
  continueLink.hidden = !returnUrl;
  if (returnUrl) continueLink.href = returnUrl;
  showMessage(accountMessage, '');
  pageTitle.textContent = '账号已登录';
  pageSubtitle.textContent = '当前身份已通过 Player Service 验证';
}

loginTab.addEventListener('click', () => setMode('login'));
registerTab.addEventListener('click', () => setMode('register'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(message, '');
  const button = loginForm.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(loginForm));
  setButtonPending(button, true, '正在登录');
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ ...values, ...navigation }),
    });
    showAccount(data.player, data.returnUrl);
    if (data.returnUrl) location.assign(data.returnUrl);
  } catch (error) {
    showMessage(message, errorMessage(error));
  } finally {
    setButtonPending(button, false, '正在登录');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(message, '');
  const button = registerForm.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(registerForm));
  if (values.password !== values.confirmPassword) {
    showMessage(message, '两次输入的密码不一致');
    return;
  }
  if (String(values.password || '').length < 8) {
    showMessage(message, '密码至少需要 8 位');
    return;
  }
  delete values.confirmPassword;
  setButtonPending(button, true, '正在创建');
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ ...values, ...navigation }),
    });
    showAccount(data.player, data.returnUrl);
    if (data.returnUrl) location.assign(data.returnUrl);
  } catch (error) {
    showMessage(message, errorMessage(error));
  } finally {
    setButtonPending(button, false, '正在创建');
  }
});

logoutButton.addEventListener('click', async () => {
  setButtonPending(logoutButton, true, '正在退出');
  showMessage(accountMessage, '');
  try {
    await api('/api/auth/logout', { method: 'POST', body: '{}' });
    loginForm.reset();
    registerForm.reset();
    showAuthentication(!registerTab.hidden);
    setMode('login');
  } catch (error) {
    showMessage(accountMessage, errorMessage(error));
  } finally {
    setButtonPending(logoutButton, false, '正在退出');
  }
});

updateThemeButton();

(async () => {
  try {
    const search = new URLSearchParams(navigation);
    const data = await api(`/api/auth/session?${search}`);
    if (data.player) showAccount(data.player, data.returnUrl);
    else showAuthentication(data.registrationEnabled !== false);
  } catch (error) {
    loadingView.hidden = true;
    showAuthentication(true);
    showMessage(message, errorMessage(error));
  }
})();
