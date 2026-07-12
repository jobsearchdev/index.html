const API_VERSION = '2022-11-28';
const LANGUAGES = ['uk', 'en'];
const state = {
  data: { uk: null, en: null },
  originals: { uk: null, en: null },
  shas: { uk: null, en: null },
  source: null
};

const elements = {
  token: document.getElementById('token'), owner: document.getElementById('owner'),
  repo: document.getElementById('repo'), branch: document.getElementById('branch'),
  basePath: document.getElementById('basePath'), connect: document.getElementById('connectButton'),
  publish: document.getElementById('publishButton'), language: document.getElementById('languageSelect'),
  search: document.getElementById('searchFields'), loadLocal: document.getElementById('loadLocalButton'),
  download: document.getElementById('downloadButton'), reset: document.getElementById('resetButton'),
  status: document.getElementById('statusText'), statusPanel: document.querySelector('.editor-status-panel'),
  fields: document.getElementById('fieldsContainer'), dirty: document.getElementById('dirtyIndicator'),
  languageLabel: document.getElementById('currentLanguageLabel')
};

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.statusPanel.classList.toggle('is-error', type === 'error');
  elements.statusPanel.classList.toggle('is-success', type === 'success');
}

function deepClone(value) { return JSON.parse(JSON.stringify(value)); }
function normalizeBasePath(value) { return value.trim().replace(/^\/+|\/+$/g, ''); }
function filePath(language) {
  const base = normalizeBasePath(elements.basePath.value);
  return [base, 'locales', `${language}.json`].filter(Boolean).join('/');
}
function apiHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${elements.token.value.trim()}`,
    'X-GitHub-Api-Version': API_VERSION,
    'Content-Type': 'application/json'
  };
}
function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}
function base64ToUtf8(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function endpoint(language) {
  const owner = encodeURIComponent(elements.owner.value.trim());
  const repo = encodeURIComponent(elements.repo.value.trim());
  const path = filePath(language).split('/').map(encodeURIComponent).join('/');
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
}
function validateConnectionFields() {
  if (!elements.token.value.trim() || !elements.owner.value.trim() || !elements.repo.value.trim() || !elements.branch.value.trim()) {
    throw new Error('Заповніть token, власника, репозиторій і гілку.');
  }
}
function flattenObject(object, prefix = '', output = []) {
  Object.entries(object).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flattenObject(value, path, output);
    else output.push({ path, value: String(value ?? '') });
  });
  return output;
}
function setByPath(object, path, value) {
  const keys = path.split('.');
  let target = object;
  keys.slice(0, -1).forEach((key) => { target = target[key]; });
  target[keys.at(-1)] = value;
}
function isDirty() {
  return LANGUAGES.some((language) => state.data[language] && JSON.stringify(state.data[language]) !== JSON.stringify(state.originals[language]));
}
function refreshDirtyState() {
  const dirty = isDirty();
  elements.dirty.textContent = dirty ? 'Є незбережені зміни' : 'Без змін';
  elements.dirty.classList.toggle('is-dirty', dirty);
  elements.publish.disabled = !dirty;
}
function fieldLabel(path) {
  if (path.startsWith('text.')) return path.slice(5);
  if (path.startsWith('labels.')) return `ARIA: ${path.slice(7)}`;
  return path;
}
function renderFields() {
  const language = elements.language.value;
  const data = state.data[language];
  elements.languageLabel.textContent = language === 'uk' ? 'Українська' : 'English';
  elements.fields.innerHTML = '';
  if (!data) {
    elements.fields.innerHTML = '<div class="empty-editor-state"><p>Спочатку завантажте мовні файли.</p></div>';
    return;
  }
  const fields = flattenObject(data);
  let lastGroup = '';
  fields.forEach(({ path, value }) => {
    const group = path.split('.')[0];
    if (group !== lastGroup) {
      const title = document.createElement('h3');
      title.className = 'field-group-title';
      title.textContent = group === 'text' ? 'Текст сторінки' : group === 'labels' ? 'Підписи доступності' : 'Основні параметри';
      elements.fields.appendChild(title);
      lastGroup = group;
    }
    const card = document.createElement('article');
    card.className = 'field-card';
    card.dataset.search = `${path} ${value}`.toLowerCase();
    const header = document.createElement('div');
    header.className = 'field-card-header';
    const heading = document.createElement('h3');
    heading.textContent = fieldLabel(path);
    header.appendChild(heading);
    const input = path === 'lang' ? document.createElement('input') : document.createElement('textarea');
    input.value = value;
    input.dataset.path = path;
    if (value.length > 180) input.classList.add('is-long');
    input.addEventListener('input', () => {
      setByPath(state.data[language], path, input.value);
      card.dataset.search = `${path} ${input.value}`.toLowerCase();
      refreshDirtyState();
    });
    card.append(header, input);
    elements.fields.appendChild(card);
  });
  applySearch();
  refreshDirtyState();
}
function applySearch() {
  const query = elements.search.value.trim().toLowerCase();
  document.querySelectorAll('.field-card').forEach((card) => { card.hidden = Boolean(query) && !card.dataset.search.includes(query); });
}
async function loadLocalFiles() {
  setStatus('Завантаження локальних мовних файлів…');
  try {
    const responses = await Promise.all(LANGUAGES.map((language) => fetch(`locales/${language}.json`, { cache: 'no-store' })));
    if (responses.some((response) => !response.ok)) throw new Error('Не вдалося відкрити локальні JSON-файли. Запустіть сайт через GitHub Pages або локальний сервер.');
    const payloads = await Promise.all(responses.map((response) => response.json()));
    LANGUAGES.forEach((language, index) => {
      state.data[language] = payloads[index]; state.originals[language] = deepClone(payloads[index]); state.shas[language] = null;
    });
    state.source = 'local'; renderFields();
    setStatus('Локальні файли завантажено. Для публікації підключіться до GitHub.', 'success');
  } catch (error) { setStatus(error.message, 'error'); }
}
async function loadFromGitHub() {
  try {
    validateConnectionFields();
    sessionStorage.setItem('github-editor-owner', elements.owner.value.trim());
    sessionStorage.setItem('github-editor-repo', elements.repo.value.trim());
    sessionStorage.setItem('github-editor-branch', elements.branch.value.trim());
    sessionStorage.setItem('github-editor-base-path', elements.basePath.value.trim());
    sessionStorage.setItem('github-editor-token', elements.token.value.trim());
    elements.connect.disabled = true;
    setStatus('Завантаження файлів із GitHub…');
    for (const language of LANGUAGES) {
      const payload = await githubRequest(
        `${endpoint(language)}?ref=${encodeURIComponent(elements.branch.value.trim())}`,
        { headers: apiHeaders() }
      );
      const parsed = JSON.parse(base64ToUtf8(payload.content));
      state.data[language] = parsed; state.originals[language] = deepClone(parsed); state.shas[language] = payload.sha;
    }
    state.source = 'github'; renderFields();
    setStatus(`Підключено до ${elements.owner.value.trim()}/${elements.repo.value.trim()} · ${elements.branch.value.trim()}.`, 'success');
  } catch (error) { setStatus(error.message, 'error'); }
  finally { elements.connect.disabled = false; }
}
async function githubRequest(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (_) {
    throw new Error('Не вдалося з’єднатися з GitHub API. Перевірте інтернет, блокувальники та відкрийте редактор через GitHub Pages або локальний сервер.');
  }

  let payload = {};
  try { payload = await response.json(); } catch (_) {}

  if (!response.ok) {
    const accepted = response.headers.get('x-accepted-github-permissions');
    const details = [];
    if (response.status === 401) details.push('Токен недійсний або прострочений.');
    if (response.status === 403) details.push('Токен не має права Contents: Read and write або доступ до репозиторію обмежено.');
    if (response.status === 404) details.push('Не знайдено репозиторій, гілку або файл. Перевірте власника, назву репозиторію, гілку та шлях.');
    if (response.status === 409) details.push('Конфлікт версій. Дані на GitHub змінилися; повторіть публікацію.');
    if (response.status === 422) details.push('GitHub відхилив зміни. Можливо, гілка захищена правилами.');
    if (accepted) details.push(`GitHub очікує дозволи: ${accepted}.`);
    throw new Error(`${payload.message || `GitHub API: ${response.status}`} ${details.join(' ')}`.trim());
  }
  return payload;
}

async function getRemoteFile(language) {
  const url = `${endpoint(language)}?ref=${encodeURIComponent(elements.branch.value.trim())}`;
  try {
    return await githubRequest(url, { headers: apiHeaders() });
  } catch (error) {
    if (error.message.includes('Не знайдено репозиторій, гілку або файл')) return null;
    throw error;
  }
}

async function updateGitHubFile(language) {
  const content = `${JSON.stringify(state.data[language], null, 2)}
`;
  const remote = await getRemoteFile(language);
  const body = {
    message: `Update ${language.toUpperCase()} website content`,
    content: utf8ToBase64(content),
    branch: elements.branch.value.trim()
  };
  if (remote?.sha) body.sha = remote.sha;

  const payload = await githubRequest(endpoint(language), {
    method: 'PUT',
    headers: apiHeaders(),
    body: JSON.stringify(body)
  });
  state.shas[language] = payload.content.sha;
  state.originals[language] = deepClone(state.data[language]);
}
async function publishChanges() {
  if (!confirm('Опублікувати зміни в GitHub? Буде оновлено мовні JSON-файли в обраній гілці.')) return;
  try {
    validateConnectionFields(); elements.publish.disabled = true;
    const changed = LANGUAGES.filter((language) => JSON.stringify(state.data[language]) !== JSON.stringify(state.originals[language]));
    if (!changed.length) return;
    for (const language of changed) {
      setStatus(`Публікація ${language.toUpperCase()}…`);
      await updateGitHubFile(language);
    }
    renderFields();
    state.source = 'github';
    setStatus('Зміни успішно опубліковано на GitHub. GitHub Pages оновиться після завершення deployment.', 'success');
  } catch (error) {
    setStatus(`${error.message} Оновіть дані з GitHub перед повторною спробою, якщо файл уже змінився.`, 'error');
  } finally { refreshDirtyState(); }
}
function downloadCurrentLanguage() {
  const language = elements.language.value;
  if (!state.data[language]) return setStatus('Немає даних для завантаження.', 'error');
  const blob = new Blob([`${JSON.stringify(state.data[language], null, 2)}\n`], { type: 'application/json' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${language}.json`; link.click(); URL.revokeObjectURL(link.href);
}
function resetChanges() {
  const language = elements.language.value;
  if (!state.originals[language]) return;
  if (!confirm(`Скасувати незбережені зміни для ${language.toUpperCase()}?`)) return;
  state.data[language] = deepClone(state.originals[language]); renderFields(); setStatus('Незбережені зміни скасовано.');
}

elements.connect.addEventListener('click', loadFromGitHub);
elements.publish.addEventListener('click', publishChanges);
elements.loadLocal.addEventListener('click', loadLocalFiles);
elements.download.addEventListener('click', downloadCurrentLanguage);
elements.reset.addEventListener('click', resetChanges);
elements.language.addEventListener('change', renderFields);
elements.search.addEventListener('input', applySearch);
window.addEventListener('beforeunload', (event) => { if (isDirty()) { event.preventDefault(); event.returnValue = ''; } });

['owner', 'repo', 'branch', 'basePath', 'token'].forEach((key) => {
  const stored = sessionStorage.getItem(`github-editor-${key === 'basePath' ? 'base-path' : key}`);
  if (stored) elements[key].value = stored;
});
