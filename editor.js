const API_VERSION = '2022-11-28';
const LANGUAGES = ['uk', 'en'];

const state = {
  data: { uk: null, en: null },
  originals: { uk: null, en: null },
  connected: false,
  account: null,
  repo: null,
  lastDiagnostics: ''
};

const elements = {
  token: document.getElementById('token'),
  owner: document.getElementById('owner'),
  repo: document.getElementById('repo'),
  branch: document.getElementById('branch'),
  basePath: document.getElementById('basePath'),
  connect: document.getElementById('connectButton'),
  publish: document.getElementById('publishButton'),
  language: document.getElementById('languageSelect'),
  search: document.getElementById('searchFields'),
  loadLocal: document.getElementById('loadLocalButton'),
  download: document.getElementById('downloadButton'),
  reset: document.getElementById('resetButton'),
  status: document.getElementById('statusText'),
  statusPanel: document.querySelector('.editor-status-panel'),
  fields: document.getElementById('fieldsContainer'),
  dirty: document.getElementById('dirtyIndicator'),
  languageLabel: document.getElementById('currentLanguageLabel'),
  connectionInfo: document.getElementById('connectionInfo'),
  copyDiagnostics: document.getElementById('copyDiagnosticsButton')
};

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.statusPanel.classList.toggle('is-error', type === 'error');
  elements.statusPanel.classList.toggle('is-success', type === 'success');
}

function setDiagnostics(lines) {
  state.lastDiagnostics = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
  elements.copyDiagnostics.disabled = !state.lastDiagnostics;
}

function normalizeBasePath(value) {
  return String(value || '').trim().replace(/^\/+|\/+$/g, '');
}

function getConfig() {
  return {
    token: elements.token.value.trim(),
    owner: elements.owner.value.trim(),
    repo: elements.repo.value.trim(),
    branch: elements.branch.value.trim() || 'main',
    basePath: normalizeBasePath(elements.basePath.value)
  };
}

function validateConfig({ token, owner, repo, branch }) {
  if (!token) throw new Error('Вставте GitHub token.');
  if (!owner) throw new Error('Вкажіть власника репозиторію.');
  if (!repo) throw new Error('Вкажіть назву репозиторію.');
  if (!branch) throw new Error('Вкажіть гілку.');
}

function filePath(language, config = getConfig()) {
  return [config.basePath, 'locales', `${language}.json`].filter(Boolean).join('/');
}

function encodePath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function repoApiBase(config = getConfig()) {
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

function contentEndpoint(language, config = getConfig()) {
  return `${repoApiBase(config)}/contents/${encodePath(filePath(language, config))}`;
}

function apiHeaders(config = getConfig()) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${config.token}`,
    'X-GitHub-Api-Version': API_VERSION,
    'Content-Type': 'application/json'
  };
}

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function explainGitHubError(response, payload, action, config = getConfig()) {
  const detail = payload?.message || `${response.status} ${response.statusText}`;
  const accepted = response.headers.get('x-accepted-github-permissions');
  const permission = accepted ? ` GitHub очікує: ${accepted}.` : '';
  const target = `${config.owner}/${config.repo}@${config.branch}`;

  if (response.status === 401) return `Токен недійсний, прострочений або введений не повністю. ${detail}`;
  if (response.status === 403) return `Немає дозволу на ${action}. Для ${target} потрібен fine-grained token з Contents: Read and write.${permission} ${detail}`;
  if (response.status === 404) return `GitHub не знайшов ${action}. Перевірте owner, repo, branch і шлях. Для приватного репозиторію 404 також означає, що token не має доступу. ${detail}`;
  if (response.status === 409) return `GitHub повідомив про конфлікт. Дані в гілці змінилися або гілка має обмеження. Перезавантажте файли та повторіть. ${detail}`;
  if (response.status === 422) return `GitHub відхилив запис. Перевірте SHA, назву гілки та правила захисту гілки. ${detail}`;
  return `Не вдалося ${action}: ${detail}${permission}`;
}

async function githubRequest(url, options = {}, action = 'виконати запит', config = getConfig()) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      ...apiHeaders(config),
      ...(options.headers || {})
    }
  });
  const payload = await readResponse(response);
  setDiagnostics([
    `${options.method || 'GET'} ${url}`,
    `HTTP ${response.status} ${response.statusText}`,
    payload?.message ? `Message: ${payload.message}` : '',
    response.headers.get('x-accepted-github-permissions') ? `Accepted permissions: ${response.headers.get('x-accepted-github-permissions')}` : ''
  ].filter(Boolean));
  if (!response.ok) throw new Error(explainGitHubError(response, payload, action, config));
  return payload;
}

function flattenObject(object, keys = [], output = []) {
  Object.entries(object).forEach(([key, value]) => {
    const nextKeys = [...keys, key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value, nextKeys, output);
    } else {
      output.push({
        keys: nextKeys,
        displayPath: nextKeys.join(' → '),
        value: String(value ?? '')
      });
    }
  });
  return output;
}

function setByKeys(object, keys, value) {
  let target = object;
  for (const key of keys.slice(0, -1)) {
    if (!target || typeof target !== 'object' || !(key in target)) {
      throw new Error(`Не вдалося знайти поле: ${keys.join(' → ')}`);
    }
    target = target[key];
  }
  target[keys.at(-1)] = value;
}

function isDirty() {
  return LANGUAGES.some(language => state.data[language] && JSON.stringify(state.data[language]) !== JSON.stringify(state.originals[language]));
}

function refreshDirtyState() {
  const dirty = isDirty();
  elements.dirty.textContent = dirty ? 'Є незбережені зміни' : 'Без змін';
  elements.dirty.classList.toggle('is-dirty', dirty);
  elements.publish.disabled = !dirty || !state.connected;
}

function fieldLabel(keys) {
  if (keys[0] === 'text') return keys.slice(1).join(' → ');
  if (keys[0] === 'labels') return `ARIA: ${keys.slice(1).join(' → ')}`;
  return keys.join(' → ');
}


function renderFields() {
  const language = elements.language.value;
  const data = state.data[language];
  elements.languageLabel.textContent = language === 'uk' ? 'Українська' : 'English';
  elements.fields.innerHTML = '';

  if (!data) {
    elements.fields.innerHTML = '<div class="empty-editor-state"><p>Підключіться до GitHub або завантажте локальні JSON.</p></div>';
    refreshDirtyState();
    return;
  }

  let lastGroup = '';
  for (const { keys, displayPath, value } of flattenObject(data)) {
    const group = keys[0];
    if (group !== lastGroup) {
      const title = document.createElement('h3');
      title.className = 'field-group-title';
      title.textContent = group === 'text' ? 'Текст сторінки' : group === 'labels' ? 'Підписи доступності' : 'Основні параметри';
      elements.fields.appendChild(title);
      lastGroup = group;
    }

    const card = document.createElement('article');
    card.className = 'field-card';
    card.dataset.search = `${displayPath} ${value}`.toLowerCase();

    const header = document.createElement('div');
    header.className = 'field-card-header';
    const heading = document.createElement('h3');
    heading.textContent = fieldLabel(keys);
    const code = document.createElement('code');
    code.textContent = displayPath;
    header.append(heading, code);

    const input = keys.length === 1 && keys[0] === 'lang' ? document.createElement('input') : document.createElement('textarea');
    input.value = value;
    input.dataset.keys = JSON.stringify(keys);
    if (value.length > 180) input.classList.add('is-long');
    input.addEventListener('input', () => {
      try {
        setByKeys(state.data[language], keys, input.value);
        card.dataset.search = `${displayPath} ${input.value}`.toLowerCase();
        refreshDirtyState();
      } catch (error) {
        setStatus(error.message, 'error');
      }
    });

    card.append(header, input);
    elements.fields.appendChild(card);
  }

  applySearch();
  refreshDirtyState();
}

function applySearch() {
  const query = elements.search.value.trim().toLowerCase();
  document.querySelectorAll('.field-card').forEach(card => {
    card.hidden = Boolean(query) && !card.dataset.search.includes(query);
  });
}

function inferGitHubPagesRepository() {
  const host = location.hostname.toLowerCase();
  if (!host.endsWith('.github.io')) return;
  const owner = host.replace(/\.github\.io$/, '');
  const firstPath = location.pathname.split('/').filter(Boolean)[0] || '';
  const repo = firstPath && !firstPath.endsWith('.html') ? firstPath : `${owner}.github.io`;

  if (!elements.owner.value) elements.owner.value = owner;
  if (!elements.repo.value) elements.repo.value = repo;
}

function restoreSettings() {
  inferGitHubPagesRepository();
  const fields = ['owner', 'repo', 'branch', 'basePath'];
  for (const field of fields) {
    const saved = localStorage.getItem(`github-editor-${field}`);
    if (saved) elements[field].value = saved;
  }
  const token = sessionStorage.getItem('github-editor-token');
  if (token) elements.token.value = token;
}

function persistSettings(config) {
  localStorage.setItem('github-editor-owner', config.owner);
  localStorage.setItem('github-editor-repo', config.repo);
  localStorage.setItem('github-editor-branch', config.branch);
  localStorage.setItem('github-editor-basePath', config.basePath);
  sessionStorage.setItem('github-editor-token', config.token);
}

async function verifyConnection(config) {
  const account = await githubRequest('https://api.github.com/user', {}, 'перевірити token', config);
  const repo = await githubRequest(repoApiBase(config), {}, 'відкрити репозиторій', config);
  await githubRequest(`${repoApiBase(config)}/branches/${encodeURIComponent(config.branch)}`, {}, 'знайти гілку', config);
  return { account, repo };
}

async function loadLanguageFromGitHub(language, config) {
  const url = `${contentEndpoint(language, config)}?ref=${encodeURIComponent(config.branch)}`;
  const payload = await githubRequest(url, {}, `завантажити ${filePath(language, config)}`, config);
  if (payload.type !== 'file' || !payload.content) throw new Error(`${filePath(language, config)} не є звичайним JSON-файлом.`);
  try {
    return JSON.parse(base64ToUtf8(payload.content));
  } catch (error) {
    throw new Error(`У ${filePath(language, config)} некоректний JSON: ${error.message}`);
  }
}

async function connectAndLoad() {
  const config = getConfig();
  try {
    validateConfig(config);
    elements.connect.disabled = true;
    elements.publish.disabled = true;
    setStatus('Перевіряю token, репозиторій і гілку…');

    const { account, repo } = await verifyConnection(config);
    setStatus('Завантажую український та англійський файли…');
    const [uk, en] = await Promise.all([
      loadLanguageFromGitHub('uk', config),
      loadLanguageFromGitHub('en', config)
    ]);

    state.account = account;
    state.repo = repo;
    state.data.uk = uk;
    state.data.en = en;
    state.originals.uk = deepClone(uk);
    state.originals.en = deepClone(en);
    state.connected = true;
    persistSettings(config);

    elements.connectionInfo.textContent = `${account.login} → ${config.owner}/${config.repo} · ${config.branch}`;
    renderFields();
    setStatus(`Підключено. Файли locales/uk.json та locales/en.json завантажено.`, 'success');
  } catch (error) {
    state.connected = false;
    elements.connectionInfo.textContent = 'Не підключено';
    refreshDirtyState();
    setStatus(error.message, 'error');
  } finally {
    elements.connect.disabled = false;
  }
}

async function loadLocalFiles() {
  try {
    setStatus('Завантажую локальні мовні файли…');
    const responses = await Promise.all(LANGUAGES.map(language => fetch(`locales/${language}.json`, { cache: 'no-store' })));
    if (responses.some(response => !response.ok)) throw new Error('Не вдалося відкрити локальні JSON. Відкрийте редактор через GitHub Pages або локальний сервер.');
    const [uk, en] = await Promise.all(responses.map(response => response.json()));
    state.data.uk = uk;
    state.data.en = en;
    state.originals.uk = deepClone(uk);
    state.originals.en = deepClone(en);
    renderFields();
    setStatus(state.connected ? 'Локальні файли завантажено. Публікація піде в підключений репозиторій.' : 'Локальні файли завантажено. Для публікації підключіться до GitHub.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function getCurrentFile(language, config) {
  const url = `${contentEndpoint(language, config)}?ref=${encodeURIComponent(config.branch)}`;
  const payload = await githubRequest(url, {}, `прочитати актуальний ${filePath(language, config)}`, config);
  if (!payload.sha) throw new Error(`GitHub не повернув SHA для ${filePath(language, config)}.`);
  return payload;
}

async function publishLanguage(language, config) {
  const current = await getCurrentFile(language, config);
  const content = `${JSON.stringify(state.data[language], null, 2)}\n`;
  const body = {
    message: `Update ${language.toUpperCase()} website content`,
    content: utf8ToBase64(content),
    branch: config.branch,
    sha: current.sha
  };

  await githubRequest(contentEndpoint(language, config), {
    method: 'PUT',
    body: JSON.stringify(body)
  }, `опублікувати ${filePath(language, config)}`, config);

  state.originals[language] = deepClone(state.data[language]);
}

async function publishChanges() {
  const config = getConfig();
  try {
    validateConfig(config);
    if (!state.connected) throw new Error('Спочатку натисніть «Підключитися та завантажити».');

    const changed = LANGUAGES.filter(language => state.data[language] && JSON.stringify(state.data[language]) !== JSON.stringify(state.originals[language]));
    if (!changed.length) {
      setStatus('Немає змін для публікації.');
      return;
    }

    if (!confirm(`Опублікувати зміни: ${changed.map(language => language.toUpperCase()).join(', ')}?`)) return;

    elements.publish.disabled = true;
    for (const language of changed) {
      setStatus(`Публікую ${language.toUpperCase()}…`);
      await publishLanguage(language, config);
    }

    renderFields();
    setStatus('Зміни опубліковано. GitHub Pages оновиться після завершення deployment.', 'success');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    refreshDirtyState();
  }
}

function downloadCurrentLanguage() {
  const language = elements.language.value;
  if (!state.data[language]) {
    setStatus('Немає даних для завантаження.', 'error');
    return;
  }
  const blob = new Blob([`${JSON.stringify(state.data[language], null, 2)}\n`], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${language}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function resetChanges() {
  const language = elements.language.value;
  if (!state.originals[language]) return;
  if (!confirm(`Скасувати незбережені зміни для ${language.toUpperCase()}?`)) return;
  state.data[language] = deepClone(state.originals[language]);
  renderFields();
  setStatus('Незбережені зміни скасовано.');
}

async function copyDiagnostics() {
  if (!state.lastDiagnostics) return;
  try {
    await navigator.clipboard.writeText(state.lastDiagnostics);
    setStatus('Діагностику скопійовано.', 'success');
  } catch {
    setStatus('Не вдалося скопіювати діагностику. Скопіюйте її з консолі браузера.', 'error');
    console.info(state.lastDiagnostics);
  }
}

elements.connect.addEventListener('click', connectAndLoad);
elements.publish.addEventListener('click', publishChanges);
elements.loadLocal.addEventListener('click', loadLocalFiles);
elements.download.addEventListener('click', downloadCurrentLanguage);
elements.reset.addEventListener('click', resetChanges);
elements.copyDiagnostics.addEventListener('click', copyDiagnostics);
elements.language.addEventListener('change', renderFields);
elements.search.addEventListener('input', applySearch);
window.addEventListener('beforeunload', event => {
  if (isDirty()) {
    event.preventDefault();
    event.returnValue = '';
  }
});

restoreSettings();
refreshDirtyState();
