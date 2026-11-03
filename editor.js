const API_VERSION = '2022-11-28';
const LANGUAGES = ['uk', 'en'];
const { LISTS, CONTACTS, applyContact } = window.SITE_LISTS;

const state = {
  data: { uk: null, en: null },
  originals: { uk: null, en: null },
  indexHtml: null,
  indexOriginal: null,
  uploads: {},
  connected: false,
  lastDiagnostics: '',
  mode: 'lists',
  listKey: LISTS[0].key,
  items: [],
  blocks: []
};

const $ = id => document.getElementById(id);
const elements = {
  token: $('token'), remember: $('rememberToken'), owner: $('owner'), repo: $('repo'), branch: $('branch'), basePath: $('basePath'),
  connect: $('connectButton'), publish: $('publishButton'), previewUk: $('previewUkButton'), previewEn: $('previewEnButton'),
  search: $('searchFields'), loadLocal: $('loadLocalButton'), download: $('downloadButton'), reset: $('resetButton'),
  status: $('statusText'), statusPanel: document.querySelector('.editor-status-panel'), fields: $('fieldsContainer'),
  dirty: $('dirtyIndicator'), kicker: $('workspaceKicker'), title: $('workspaceTitle'), connectionInfo: $('connectionInfo'),
  copyDiagnostics: $('copyDiagnosticsButton'), listPicker: $('listPicker'), addBlock: $('addBlockButton'),
  controls: { lists: $('listControls'), text: $('textControls'), contacts: $('contactsControls'), blocks: $('blocksControls') }
};

/* ---------- helpers ---------- */
const deepClone = value => JSON.parse(JSON.stringify(value));
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  });
  children.flat().filter(c => c !== null && c !== undefined).forEach(c => node.append(c));
  return node;
};
const button = (label, handler, extra = {}) => el('button', { class: 'button button-ghost', type: 'button', textContent: label, onclick: handler, ...extra });
const plain = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };

function setStatus(message, type = '') {
  elements.status.textContent = message;
  elements.statusPanel.classList.toggle('is-error', type === 'error');
  elements.statusPanel.classList.toggle('is-success', type === 'success');
}
function setDiagnostics(lines) {
  state.lastDiagnostics = Array.isArray(lines) ? lines.join('\n') : String(lines || '');
  elements.copyDiagnostics.disabled = !state.lastDiagnostics;
}

/* ---------- GitHub API ---------- */
const normalizeBasePath = value => String(value || '').trim().replace(/^\/+|\/+$/g, '');
function getConfig() {
  return {
    token: elements.token.value.trim(), owner: elements.owner.value.trim(), repo: elements.repo.value.trim(),
    branch: elements.branch.value.trim() || 'main', basePath: normalizeBasePath(elements.basePath.value)
  };
}
function validateConfig({ token, owner, repo, branch }) {
  if (!token) throw new Error('Вставте GitHub token.');
  if (!owner) throw new Error('Вкажіть власника репозиторію (Налаштування репозиторію).');
  if (!repo) throw new Error('Вкажіть назву репозиторію (Налаштування репозиторію).');
  if (!branch) throw new Error('Вкажіть гілку.');
}
const encodePath = path => path.split('/').map(encodeURIComponent).join('/');
const repoPath = (path, config = getConfig()) => [config.basePath, path].filter(Boolean).join('/');
const repoApiBase = (config = getConfig()) => `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
const contentsUrl = (path, config = getConfig()) => `${repoApiBase(config)}/contents/${encodePath(repoPath(path, config))}`;

function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToUtf8(value) {
  const binary = atob(String(value || '').replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}
async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { message: text }; }
}
function explainGitHubError(response, payload, action, config) {
  const detail = payload?.message || `${response.status} ${response.statusText}`;
  const accepted = response.headers.get('x-accepted-github-permissions');
  const permission = accepted ? ` GitHub очікує: ${accepted}.` : '';
  const target = `${config.owner}/${config.repo}@${config.branch}`;
  if (response.status === 401) return `Token недійсний, прострочений або введений не повністю. Створіть новий token. ${detail}`;
  if (response.status === 403) return `Немає дозволу на ${action}. Для ${target} потрібен fine-grained token з Contents: Read and write.${permission} ${detail}`;
  if (response.status === 404) return `GitHub не знайшов ${action}. Перевірте owner, repo, branch і шлях. ${detail}`;
  if (response.status === 409) return `Конфлікт: файли в репозиторії змінилися. Збережіть копію, перепідключіться й повторіть. ${detail}`;
  if (response.status === 422) return `GitHub відхилив запис. ${detail}`;
  return `Не вдалося ${action}: ${detail}${permission}`;
}
async function githubRequest(url, options = {}, action = 'виконати запит', config = getConfig()) {
  const response = await fetch(url, {
    ...options, cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${config.token}`, 'X-GitHub-Api-Version': API_VERSION, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await readResponse(response);
  setDiagnostics([`${options.method || 'GET'} ${url}`, `HTTP ${response.status} ${response.statusText}`, payload?.message ? `Message: ${payload.message}` : ''].filter(Boolean));
  if (!response.ok) { const error = new Error(explainGitHubError(response, payload, action, config)); error.status = response.status; throw error; }
  return payload;
}
async function getFile(path, config, action) {
  return githubRequest(`${contentsUrl(path, config)}?ref=${encodeURIComponent(config.branch)}`, {}, action || `завантажити ${path}`, config);
}
async function getFileSha(path, config) {
  try { return (await getFile(path, config)).sha; } catch (error) { if (error.status === 404) return undefined; throw error; }
}
async function putFile(path, base64, message, config) {
  const sha = await getFileSha(path, config);
  await githubRequest(contentsUrl(path, config), {
    method: 'PUT', body: JSON.stringify({ message, content: base64, branch: config.branch, ...(sha ? { sha } : {}) })
  }, `опублікувати ${path}`, config);
}

/* ---------- document model ---------- */
const parseDoc = () => new DOMParser().parseFromString(state.indexHtml, 'text/html');
const serialize = doc => `<!doctype html>\n${doc.documentElement.outerHTML}\n`;
function mutateDoc(fn) { const doc = parseDoc(); fn(doc); state.indexHtml = serialize(doc); }
const text = lang => state.data[lang].text;
const renderCtx = () => ({ uk: key => text('uk')[key] });
const listDef = key => LISTS.find(def => def.key === key);

function readItems(def, doc = parseDoc()) {
  const container = doc.querySelector(def.container);
  if (!container) return null;
  return [...container.children].filter(node => node.dataset.item).map(node => {
    const id = node.dataset.item;
    const item = { id, uk: {}, en: {}, attrs: {} };
    def.fields.forEach(field => {
      const key = `${id}.${field.name}`;
      item.uk[field.name] = text('uk')[key] ?? node.querySelector(`[data-i18n="${key}"]`)?.innerHTML ?? '';
      item.en[field.name] = text('en')[key] ?? '';
    });
    def.attrs.forEach(attr => { item.attrs[attr.name] = node.dataset[attr.name] || ''; });
    return item;
  });
}

function writeItems(def, removedIds = []) {
  const ctx = renderCtx();
  mutateDoc(doc => {
    const container = doc.querySelector(def.container);
    container.innerHTML = state.items.map((item, index) => def.render(item, ctx, index)).join('');
  });
  for (const lang of LANGUAGES) {
    const dict = text(lang);
    removedIds.forEach(id => Object.keys(dict).filter(key => key.startsWith(`${id}.`)).forEach(key => delete dict[key]));
    state.items.forEach(item => def.fields.forEach(field => {
      const key = `${item.id}.${field.name}`;
      const value = item[lang][field.name];
      if (value) dict[key] = value; else delete dict[key];
    }));
  }
  refreshDirtyState();
}

/* ---------- dirty state ---------- */
const languageDirty = lang => state.data[lang] && JSON.stringify(state.data[lang]) !== JSON.stringify(state.originals[lang]);
const indexDirty = () => state.indexHtml !== null && state.indexHtml !== state.indexOriginal;
const isDirty = () => indexDirty() || LANGUAGES.some(languageDirty) || Object.keys(state.uploads).length > 0;
function refreshDirtyState() {
  const dirty = isDirty();
  elements.dirty.textContent = dirty ? 'Є неопубліковані зміни' : 'Без змін';
  elements.dirty.classList.toggle('is-dirty', dirty);
  elements.publish.disabled = !dirty || !state.connected;
  const loaded = Boolean(state.indexHtml && state.data.uk && state.data.en);
  elements.previewUk.disabled = !loaded;
  elements.previewEn.disabled = !loaded;
}

/* ---------- modes ---------- */
function setEditorMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(b => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('is-active', active);
    b.setAttribute('aria-selected', String(active));
  });
  Object.entries(elements.controls).forEach(([key, node]) => { node.hidden = key !== mode; });
  render();
}
function render() {
  elements.fields.innerHTML = '';
  if (!state.indexHtml || !state.data.uk || !state.data.en) {
    elements.fields.append(el('div', { class: 'empty-editor-state' }, el('p', { textContent: 'Підключіться до GitHub або завантажте локальні файли.' })));
    refreshDirtyState();
    return;
  }
  ({ lists: renderLists, text: renderTexts, contacts: renderContacts, blocks: renderBlocks })[state.mode]();
  refreshDirtyState();
}

/* ---------- lists mode ---------- */
function renderListPicker() {
  elements.listPicker.innerHTML = '';
  LISTS.forEach(def => {
    elements.listPicker.append(button(def.title, () => { state.listKey = def.key; renderListPicker(); if (state.mode === 'lists') render(); },
      { class: `button button-ghost${def.key === state.listKey ? ' is-active' : ''}` }));
  });
}

function emptyItem(def) {
  const id = `${def.prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const item = { id, uk: {}, en: {}, attrs: {} };
  def.fields.forEach(f => { item.uk[f.name] = ''; item.en[f.name] = ''; });
  def.attrs.forEach(a => { item.attrs[a.name] = ''; });
  return item;
}

function renderLists() {
  const def = listDef(state.listKey);
  elements.kicker.textContent = 'Списки';
  elements.title.textContent = def.title;
  const items = readItems(def);
  if (!items) {
    elements.fields.append(el('div', { class: 'empty-editor-state' }, el('p', { textContent: `На сторінці не знайдено контейнер ${def.container}. Можливо, його видалили в режимі HTML.` })));
    return;
  }
  state.items = items;
  const add = position => {
    const item = emptyItem(def);
    position === 'start' ? state.items.unshift(item) : state.items.push(item);
    writeItems(def); renderLists();
    setStatus('Новий пункт додано. Заповніть поля та опублікуйте.');
  };
  elements.fields.innerHTML = '';
  elements.fields.append(el('div', { class: 'list-toolbar' },
    el('span', { class: 'list-count', textContent: `Пунктів: ${state.items.length}` }),
    button('+ Додати на початок', () => add('start'), { class: 'button' }),
    button('+ Додати в кінець', () => add('end'))));
  state.items.forEach((item, index) => elements.fields.append(renderItemCard(def, item, index)));
  if (state.items.length > 3) elements.fields.append(el('div', { class: 'list-toolbar' }, button('+ Додати в кінець', () => add('end'))));
}

function renderItemCard(def, item, index) {
  const firstField = def.fields[0].name;
  const heading = el('h3', { class: 'item-title', textContent: plain(item.uk[firstField]) || plain(item.uk[def.fields[1]?.name]) || 'Новий пункт' });
  const move = delta => {
    const target = index + delta;
    [state.items[index], state.items[target]] = [state.items[target], state.items[index]];
    writeItems(def); renderLists();
  };
  const remove = () => {
    if (!confirm(`Видалити «${heading.textContent}»?`)) return;
    const [removed] = state.items.splice(index, 1);
    dropUpload(removed.attrs.image);
    writeItems(def, [removed.id]); renderLists();
    setStatus('Пункт видалено. Зміни з’являться на сайті після публікації.');
  };
  const card = el('article', { class: 'item-card' },
    el('div', { class: 'item-card-header' },
      el('span', { class: 'item-number', textContent: String(index + 1).padStart(2, '0') }), heading,
      el('div', { class: 'block-card-actions' },
        button('↑', () => move(-1), { disabled: index === 0, title: 'Вище' }),
        button('↓', () => move(1), { disabled: index === state.items.length - 1, title: 'Нижче' }),
        button('Видалити', remove, { class: 'button button-ghost button-danger' }))));

  def.fields.forEach(field => {
    const row = el('div', { class: 'bilingual-row' });
    LANGUAGES.forEach(lang => {
      const input = el(field.multiline ? 'textarea' : 'input', { value: item[lang][field.name] || '', placeholder: field.example || (field.optional ? 'необов’язково' : '') });
      if (!field.optional && !item[lang][field.name]) input.classList.add('is-empty');
      input.addEventListener('input', () => {
        item[lang][field.name] = input.value;
        input.classList.toggle('is-empty', !field.optional && !input.value.trim());
        if (field.name === firstField && lang === 'uk') heading.textContent = plain(input.value) || 'Новий пункт';
        writeItems(def);
      });
      row.append(el('label', { class: 'lang-field' }, el('span', { class: 'lang-badge', textContent: lang === 'uk' ? 'UA' : 'EN' }), input));
    });
    card.append(el('div', { class: 'item-field' }, el('div', { class: 'item-field-label', textContent: `${field.label}${field.optional ? ' (необов’язково)' : ''}` }), row));
  });

  def.attrs.forEach(attr => {
    if (attr.type === 'image') { card.append(renderImageField(def, item, attr)); return; }
    const input = el('input', { value: item.attrs[attr.name] || '', type: attr.type === 'url' ? 'url' : 'text', placeholder: attr.type === 'url' ? 'https://…' : '' });
    input.addEventListener('input', () => { item.attrs[attr.name] = input.value.trim(); writeItems(def); });
    card.append(el('div', { class: 'item-field' }, el('div', { class: 'item-field-label', textContent: `${attr.label}${attr.optional ? ' (необов’язково)' : ''}` }), input));
  });
  return card;
}

const imageSrc = path => state.uploads[path]?.dataUrl || path;
function dropUpload(path) { if (path && state.uploads[path]) delete state.uploads[path]; }

function renderImageField(def, item, attr) {
  const current = item.attrs[attr.name];
  const preview = current ? el('img', { class: 'image-preview', src: imageSrc(current), alt: '' }) : el('div', { class: 'image-preview image-empty', textContent: 'Немає картинки' });
  const fileInput = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      setStatus('Готую зображення…');
      const { base64, dataUrl } = await resizeImage(file);
      const slug = (plain(item.en.title || item.uk.title || 'certificate').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)) || 'certificate';
      const path = `certificates/${slug}-${Date.now().toString(36)}.jpg`;
      dropUpload(current);
      state.uploads[path] = { base64, dataUrl };
      item.attrs[attr.name] = path;
      writeItems(def); renderLists();
      setStatus('Зображення додано. Воно завантажиться на GitHub під час публікації.', 'success');
    } catch (error) { setStatus(error.message, 'error'); }
  });
  const removeButton = current ? button('Прибрати картинку', () => { dropUpload(current); item.attrs[attr.name] = ''; writeItems(def); renderLists(); }) : null;
  return el('div', { class: 'item-field' },
    el('div', { class: 'item-field-label', textContent: `${attr.label} — JPG, PNG або WEBP (PDF спершу збережіть як картинку)` }),
    el('div', { class: 'image-field' }, preview, el('div', { class: 'image-actions' }, el('label', { class: 'button button-ghost file-button' }, current ? 'Замінити картинку' : 'Вибрати картинку', fileInput), removeButton)));
}

async function resizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Потрібна картинка (JPG, PNG або WEBP). PDF збережіть як картинку або зробіть скріншот.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
  return { dataUrl, base64: dataUrl.split(',')[1] };
}

/* ---------- texts mode ---------- */
const SECTION_NAMES = { about: 'Профіль', skills: 'Навички', experience: 'Досвід', projects: 'Проєкти', certificates: 'Сертифікати', labs: 'Лабораторії', contact: 'Контакт' };
const KEY_NAMES = {
  kicker: 'Надзаголовок', title: 'Заголовок', intro: 'Підзаголовок', p1: 'Абзац 1', p2: 'Абзац 2', lead: 'Опис', eyebrow: 'Рядок над заголовком',
  cta: 'Кнопка', cta1: 'Кнопка 1', cta2: 'Кнопка 2', status: 'Статус', focusTitle: 'Заголовок «Фокус»', value: 'Значення', label: 'Підпис',
  name: 'Ім’я', top: 'Посилання «нагору»', text: 'Текст', link: 'Текст посилання в усіх проєктах', verify: 'Текст кнопки перевірки', tag: 'Теги',
  desc: 'Опис', pdf: 'Кнопка PDF', languagesTitle: 'Заголовок «Мови»', languages: 'Мови', profile: 'Меню: Профіль', skills: 'Меню: Навички',
  experience: 'Меню: Досвід', projects: 'Меню: Проєкти', certificates: 'Меню: Сертифікати', labs: 'Меню: Лабораторії'
};
function groupName(node) {
  if (!node) return 'Інше';
  if (node.closest('header')) return 'Шапка і меню';
  if (node.closest('footer')) return 'Підвал';
  if (node.closest('.hero')) return 'Головний екран';
  if (node.closest('.cert-feature')) return 'Сертифікати: головний (Prometheus)';
  if (node.closest('.info-grid')) return 'Навчання та освіта';
  const section = node.closest('section');
  return SECTION_NAMES[section?.id] || section?.id || 'Інше';
}
function keyLabel(key) {
  const parts = key.split('.');
  const last = parts.at(-1);
  if (key === 'certs.verify') return 'Текст кнопки «Перевірити» в усіх сертифікатах';
  if (key === 'cv.file') return 'Файл CV: шлях (cv/назва.pdf) або посилання';
  if (key === 'cv.button') return 'Кнопка «Завантажити CV»';
  if (key === 'cv.link') return 'Посилання на CV у контактах';
  if (parts[0] === 'facts') return `Факт ${parts[1]}: ${KEY_NAMES[last] || last}`;
  return KEY_NAMES[last] || key;
}

function renderTexts() {
  elements.kicker.textContent = 'Тексти сторінки';
  elements.title.textContent = 'Українська / English';
  const doc = parseDoc();
  const itemIds = new Set([...doc.querySelectorAll('[data-item]')].map(n => n.dataset.item));
  const keys = [...new Set([...Object.keys(text('uk')), ...Object.keys(text('en'))])].filter(key => !itemIds.has(key.split('.')[0]));
  const nodes = new Map(keys.map(key => [key, doc.querySelector(`[data-i18n="${CSS.escape(key)}"]`) || doc.querySelector(`[data-i18n-href="${CSS.escape(key)}"]`)]));
  const all = [...doc.querySelectorAll('*')];
  const position = key => { const node = nodes.get(key); return node ? all.indexOf(node) : Infinity; };
  keys.sort((a, b) => position(a) - position(b));

  const metaCard = (name, label) => fieldCard('Назва вкладки та опис для пошуковиків', label, lang => state.data[lang][name] || '', (lang, value) => {
    state.data[lang][name] = value;
    if (lang === 'uk') mutateDoc(d => { if (name === 'title') d.title = value; else d.querySelector('meta[name="description"]')?.setAttribute('content', value); });
  }, `${name}`);
  const groups = new Map([['Назва вкладки та опис для пошуковиків', [metaCard('title', 'Назва вкладки браузера'), metaCard('description', 'Опис сторінки')]]]);
  keys.forEach(key => {
    const node = nodes.get(key);
    const group = node ? groupName(node) : 'Не використовується на сторінці';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(fieldCard(group, keyLabel(key), lang => text(lang)[key] ?? '', (lang, value) => {
      text(lang)[key] = value;
      if (lang === 'uk') mutateDoc(d => {
        d.querySelectorAll(`[data-i18n="${CSS.escape(key)}"]`).forEach(n => { n.innerHTML = value; });
        d.querySelectorAll(`[data-i18n-href="${CSS.escape(key)}"]`).forEach(n => n.setAttribute('href', value));
      });
    }, key));
  });
  groups.forEach((cards, name) => {
    elements.fields.append(el('section', { class: 'field-group' }, el('h3', { class: 'field-group-title', textContent: name }), ...cards));
  });
  applySearch();
}

function fieldCard(group, label, getValue, setValue, key) {
  const row = el('div', { class: 'bilingual-row' });
  const card = el('article', { class: 'field-card' });
  const updateSearch = () => { card.dataset.search = `${group} ${label} ${key} ${LANGUAGES.map(getValue).join(' ')}`.toLowerCase(); };
  LANGUAGES.forEach(lang => {
    const value = getValue(lang);
    const input = el('textarea', { value, rows: Math.min(10, Math.max(2, Math.ceil(value.length / 50) + 1)) });
    input.addEventListener('input', () => { setValue(lang, input.value); updateSearch(); refreshDirtyState(); });
    row.append(el('label', { class: 'lang-field' }, el('span', { class: 'lang-badge', textContent: lang === 'uk' ? 'UA' : 'EN' }), input));
  });
  card.append(el('div', { class: 'field-card-header' }, el('h3', { textContent: label }), el('code', { textContent: key })), row);
  updateSearch();
  return card;
}
function applySearch() {
  const query = elements.search.value.trim().toLowerCase();
  document.querySelectorAll('.field-card').forEach(card => { card.hidden = Boolean(query) && !card.dataset.search.includes(query); });
  document.querySelectorAll('.field-group').forEach(group => { group.hidden = ![...group.querySelectorAll('.field-card')].some(card => !card.hidden); });
}

/* ---------- contacts mode ---------- */
function renderContacts() {
  elements.kicker.textContent = 'Контакти';
  elements.title.textContent = 'Email та посилання';
  const doc = parseDoc();
  CONTACTS.forEach(contact => {
    const input = el('input', { value: contact.read(doc), type: contact.name === 'email' ? 'email' : 'url' });
    input.addEventListener('input', () => { mutateDoc(d => applyContact(d, contact.name, input.value.trim())); refreshDirtyState(); });
    elements.fields.append(el('article', { class: 'field-card' }, el('div', { class: 'field-card-header' }, el('h3', { textContent: contact.label })), input));
  });
}

/* ---------- HTML blocks mode ---------- */
function parseIndexBlocks() {
  const doc = parseDoc();
  const blocks = [];
  const header = doc.querySelector('body > header');
  const main = doc.querySelector('body > main');
  const footer = doc.querySelector('body > footer');
  if (header) blocks.push({ kind: 'header', label: 'Header', html: header.outerHTML });
  if (main) [...main.children].forEach((node, index) => {
    const id = node.id ? `#${node.id}` : [...node.classList].slice(0, 2).map(c => `.${c}`).join('');
    blocks.push({ kind: 'main', label: `Секція ${index + 1} ${id}`.trim(), html: node.outerHTML });
  });
  if (footer) blocks.push({ kind: 'footer', label: 'Footer', html: footer.outerHTML });
  state.blocks = blocks;
}
function rebuildIndexFromBlocks() {
  const parseNode = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  mutateDoc(doc => {
    const body = doc.body;
    const header = state.blocks.find(b => b.kind === 'header');
    const footer = state.blocks.find(b => b.kind === 'footer');
    if (header) body.querySelector(':scope > header')?.replaceWith(parseNode(header.html));
    body.querySelector(':scope > main')?.replaceChildren(...state.blocks.filter(b => b.kind === 'main').map(b => parseNode(b.html)));
    if (footer) body.querySelector(':scope > footer')?.replaceWith(parseNode(footer.html));
  });
}
function validateBlockHtml(block) {
  const template = document.createElement('template');
  template.innerHTML = block.html.trim();
  const children = [...template.content.children];
  if (children.length !== 1) return 'Блок повинен містити рівно один кореневий HTML-елемент.';
  const expected = block.kind === 'main' ? 'SECTION' : block.kind.toUpperCase();
  if (children[0].tagName !== expected) return `Очікується кореневий тег <${expected.toLowerCase()}>.`;
  return '';
}
function renderBlocks() {
  elements.kicker.textContent = 'INDEX.HTML';
  elements.title.textContent = 'HTML-блоки';
  parseIndexBlocks();
  state.blocks.forEach((block, index) => {
    const textarea = el('textarea', { value: block.html });
    const error = el('p', { class: 'block-error', hidden: true });
    const card = el('article', { class: 'block-card' });
    const moveBlock = delta => { const t = index + delta; [state.blocks[index], state.blocks[t]] = [state.blocks[t], state.blocks[index]]; rebuildIndexFromBlocks(); render(); };
    textarea.addEventListener('input', () => {
      block.html = textarea.value;
      const message = validateBlockHtml(block);
      card.classList.toggle('is-invalid', Boolean(message));
      error.hidden = !message; error.textContent = message;
      if (!message) { rebuildIndexFromBlocks(); refreshDirtyState(); }
    });
    const isMain = block.kind === 'main';
    card.append(el('div', { class: 'block-card-header' },
      el('div', {}, el('h3', { class: 'block-card-title', textContent: block.label }), el('div', { class: 'block-type', textContent: block.kind })),
      el('div', { class: 'block-card-actions' },
        button('↑', () => moveBlock(-1), { disabled: !isMain || state.blocks[index - 1]?.kind !== 'main' }),
        button('↓', () => moveBlock(1), { disabled: !isMain || state.blocks[index + 1]?.kind !== 'main' }),
        button('Дублювати', () => { state.blocks.splice(index + 1, 0, { ...block }); rebuildIndexFromBlocks(); render(); }, { disabled: !isMain }),
        button('Видалити', () => { if (confirm('Видалити цей блок зі сторінки?')) { state.blocks.splice(index, 1); rebuildIndexFromBlocks(); render(); } }, { disabled: !isMain }))),
      textarea, error);
    elements.fields.append(card);
  });
}
function addBlock() {
  if (!state.indexHtml) return;
  parseIndexBlocks();
  const number = state.blocks.filter(b => b.kind === 'main').length + 1;
  const footerIndex = state.blocks.findIndex(b => b.kind === 'footer');
  state.blocks.splice(footerIndex >= 0 ? footerIndex : state.blocks.length, 0, { kind: 'main', label: 'Нова секція', html: `<section class="section section-shell" id="new-section-${number}">\n  <div>\n    <p class="section-kicker">Новий блок</p>\n    <h2>Заголовок нового блоку</h2>\n    <p>Додайте свій HTML-контент.</p>\n  </div>\n</section>` });
  rebuildIndexFromBlocks(); render();
}

/* ---------- preview ---------- */
function openPreview(lang) {
  if (!state.indexHtml) return;
  const base = new URL('.', location.href).href;
  const uploads = Object.fromEntries(Object.entries(state.uploads).map(([path, file]) => [path, file.dataUrl]));
  const payload = JSON.stringify({ t: state.data[lang], u: uploads }).replace(/</g, '\\u003c');
  const inline = `<script>(function(){const P=${payload};const T=P.t;document.documentElement.lang=T.lang;document.title='Перегляд · '+T.title;
Object.entries(T.text).forEach(([k,v])=>{let n=document.querySelectorAll('[data-i18n="'+CSS.escape(k)+'"]');if(!n.length){try{n=[document.querySelector(k)].filter(Boolean)}catch(e){n=[]}}n.forEach(x=>{x.innerHTML=v})});
document.querySelectorAll('[data-i18n-href]').forEach(x=>{const v=T.text[x.dataset.i18nHref];if(v)x.setAttribute('href',v)});
document.querySelectorAll('img[src],a[href]').forEach(x=>{const a=x.tagName==='IMG'?'src':'href';const v=x.getAttribute(a);if(P.u[v])x.setAttribute(a,P.u[v])});
document.querySelectorAll('[data-lang]').forEach(b=>{b.classList.toggle('active',b.dataset.lang===T.lang);b.disabled=true;b.title='У перегляді мову змінюють кнопками в редакторі'});
document.querySelectorAll('[data-email]').forEach(a=>{let e='';try{e=atob(a.dataset.email).split('').reverse().join('')}catch(x){}if(!e)return;a.href='mailto:'+e;if(a.hasAttribute('data-contact-text'))a.textContent=e+' ↗'});
const y=document.getElementById('year');if(y)y.textContent=new Date().getFullYear();
const bar=document.createElement('div');bar.textContent='ПОПЕРЕДНІЙ ПЕРЕГЛЯД · ще не опубліковано';bar.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:99;padding:8px;text-align:center;background:#45e0c0;color:#04130f;font:800 12px/1.4 sans-serif;letter-spacing:.1em';document.body.append(bar);})();<\/script>`;
  const html = state.indexHtml
    .replace(/<head>/i, `<head><base href="${base}">`)
    .replace(/<script src="script\.js[^"]*"><\/script>/i, inline);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const win = window.open(url, '_blank');
  if (!win) setStatus('Браузер заблокував нову вкладку. Дозвольте спливаючі вікна для цього сайту.', 'error');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/* ---------- load / publish ---------- */
function loadState(uk, en, indexHtml) {
  state.data = { uk, en };
  state.originals = { uk: deepClone(uk), en: deepClone(en) };
  state.indexHtml = indexHtml;
  state.indexOriginal = indexHtml;
  state.uploads = {};
  if (!indexHtml.includes('data-item=')) setStatus('Увага: index.html має стару структуру без списків. Режим «Списки» може не працювати.', 'error');
  render();
}

function inferGitHubPagesRepository() {
  const host = location.hostname.toLowerCase();
  if (!host.endsWith('.github.io')) return;
  const owner = host.replace(/\.github\.io$/, '');
  const firstPath = location.pathname.split('/').filter(Boolean)[0] || '';
  if (!elements.owner.value) elements.owner.value = owner;
  if (!elements.repo.value) elements.repo.value = firstPath && firstPath !== 'editor.html' ? firstPath : `${owner}.github.io`;
}
function restoreSettings() {
  inferGitHubPagesRepository();
  ['owner', 'repo', 'branch', 'basePath'].forEach(field => {
    const saved = localStorage.getItem(`github-editor-${field}`);
    if (saved !== null && saved !== '') elements[field].value = saved;
  });
  if (!elements.owner.value) elements.owner.value = 'jobsearchdev';
  if (!elements.repo.value) elements.repo.value = 'index.html';
  const remembered = localStorage.getItem('github-editor-token');
  elements.token.value = remembered || sessionStorage.getItem('github-editor-token') || '';
  elements.remember.checked = Boolean(remembered);
}
function persistSettings(config) {
  ['owner', 'repo', 'branch', 'basePath'].forEach(field => localStorage.setItem(`github-editor-${field}`, config[field]));
  sessionStorage.setItem('github-editor-token', config.token);
  if (elements.remember.checked) localStorage.setItem('github-editor-token', config.token);
  else localStorage.removeItem('github-editor-token');
}

async function connectAndLoad() {
  const config = getConfig();
  if (isDirty() && !confirm('Є неопубліковані зміни. Перезавантажити файли з GitHub і втратити їх?')) return;
  try {
    validateConfig(config);
    elements.connect.disabled = true;
    setStatus('Перевіряю token і репозиторій…');
    const account = await githubRequest('https://api.github.com/user', {}, 'перевірити token', config);
    await githubRequest(repoApiBase(config), {}, 'відкрити репозиторій', config);
    setStatus('Завантажую файли сайту…');
    const [ukFile, enFile, indexFile] = await Promise.all([getFile('locales/uk.json', config), getFile('locales/en.json', config), getFile('index.html', config)]);
    const parse = (file, name) => { try { return JSON.parse(base64ToUtf8(file.content)); } catch (e) { throw new Error(`У ${name} некоректний JSON: ${e.message}`); } };
    state.connected = true;
    persistSettings(config);
    elements.connectionInfo.textContent = `${account.login} → ${config.owner}/${config.repo} · ${config.branch}`;
    setStatus('Підключено. Файли завантажено.', 'success');
    loadState(parse(ukFile, 'uk.json'), parse(enFile, 'en.json'), base64ToUtf8(indexFile.content));
  } catch (error) {
    state.connected = false;
    elements.connectionInfo.textContent = 'Не підключено';
    setStatus(error.message, 'error');
    refreshDirtyState();
  } finally {
    elements.connect.disabled = false;
  }
}

async function loadLocalFiles() {
  if (isDirty() && !confirm('Є неопубліковані зміни. Завантажити файли заново і втратити їх?')) return;
  try {
    setStatus('Завантажую локальні файли…');
    const responses = await Promise.all(['locales/uk.json', 'locales/en.json', 'index.html'].map(path => fetch(path, { cache: 'no-store' })));
    if (responses.some(r => !r.ok)) throw new Error('Не вдалося відкрити файли. Відкрийте редактор через сайт або локальний сервер.');
    const [uk, en, indexHtml] = await Promise.all([responses[0].json(), responses[1].json(), responses[2].text()]);
    loadState(uk, en, indexHtml);
    setStatus(state.connected ? 'Файли сайту завантажено. Публікація піде в підключений репозиторій.' : 'Файли завантажено. Для публікації підключіться до GitHub.', 'success');
  } catch (error) { setStatus(error.message, 'error'); }
}

function missingRequired() {
  const doc = parseDoc();
  const problems = [];
  LISTS.forEach(def => {
    (readItems(def, doc) || []).forEach((item, i) => def.fields.filter(f => !f.optional).forEach(f => LANGUAGES.forEach(lang => {
      if (!String(item[lang][f.name] || '').trim()) problems.push(`${def.title} №${i + 1}: «${f.label}» (${lang.toUpperCase()})`);
    })));
  });
  return problems;
}

// Дата «Інформацію оновлено» на сайті ставиться автоматично під час кожної публікації.
function stampUpdated() {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const iso = `${now.getFullYear()}-${mm}-${dd}`;
  if (!state.indexHtml.includes('data-updated') || state.indexHtml.includes(`datetime="${iso}"`)) return;
  mutateDoc(doc => doc.querySelectorAll('time[data-updated]').forEach(node => {
    node.setAttribute('datetime', iso);
    node.textContent = `${dd}.${mm}.${now.getFullYear()}`;
  }));
}

async function publishChanges() {
  const config = getConfig();
  try {
    validateConfig(config);
    if (!state.connected) throw new Error('Спочатку натисніть «Підключитися та завантажити».');
    const changedLangs = LANGUAGES.filter(languageDirty);
    const uploads = Object.keys(state.uploads);
    if (!changedLangs.length && !indexDirty() && !uploads.length) return setStatus('Немає змін для публікації.');
    stampUpdated();
    const problems = missingRequired();
    if (problems.length && !confirm(`Незаповнені поля (на сайті там буде порожньо):\n${problems.slice(0, 12).join('\n')}${problems.length > 12 ? `\n…ще ${problems.length - 12}` : ''}\n\nВсе одно опублікувати?`)) return;
    const labels = [...uploads.map(p => p.split('/').pop()), ...(indexDirty() ? ['index.html'] : []), ...changedLangs.map(l => `${l}.json`)];
    if (!confirm(`Опублікувати на GitHub:\n${labels.join('\n')}?`)) return;
    elements.publish.disabled = true;
    for (const path of uploads) {
      setStatus(`Завантажую ${path}…`);
      await putFile(path, state.uploads[path].base64, `Add ${path}`, config);
      delete state.uploads[path];
    }
    if (indexDirty()) {
      setStatus('Публікую index.html…');
      await putFile('index.html', utf8ToBase64(state.indexHtml), 'Update website page', config);
      state.indexOriginal = state.indexHtml;
    }
    for (const lang of changedLangs) {
      setStatus(`Публікую ${lang}.json…`);
      await putFile(`locales/${lang}.json`, utf8ToBase64(`${JSON.stringify(state.data[lang], null, 2)}\n`), `Update ${lang.toUpperCase()} website content`, config);
      state.originals[lang] = deepClone(state.data[lang]);
    }
    render();
    setStatus('Опубліковано. Сайт оновиться за 1–2 хвилини (оновіть сторінку з Cmd+Shift+R).', 'success');
  } catch (error) {
    setStatus(`${error.message} Нічого не втрачено: зміни залишились у редакторі, можна повторити.`, 'error');
  } finally {
    refreshDirtyState();
  }
}

function downloadFiles() {
  if (!state.indexHtml) return setStatus('Немає даних для збереження.', 'error');
  const save = (content, name, type) => {
    const link = el('a', { href: URL.createObjectURL(new Blob([content], { type })), download: name });
    link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  save(state.indexHtml, 'index.html', 'text/html');
  LANGUAGES.forEach(lang => save(`${JSON.stringify(state.data[lang], null, 2)}\n`, `${lang}.json`, 'application/json'));
  Object.entries(state.uploads).forEach(([path, file]) => { const link = el('a', { href: file.dataUrl, download: path.split('/').pop() }); link.click(); });
  setStatus('Файли збережено в «Завантаження». index.html — у корінь сайту, uk.json і en.json — у папку locales, картинки — у certificates.', 'success');
}

function resetChanges() {
  if (!state.indexOriginal || !isDirty()) return;
  if (!confirm('Скасувати всі неопубліковані зміни?')) return;
  loadState(state.originals.uk, state.originals.en, state.indexOriginal);
  setStatus('Зміни скасовано.');
}

async function copyDiagnostics() {
  if (!state.lastDiagnostics) return;
  try { await navigator.clipboard.writeText(state.lastDiagnostics); setStatus('Діагностику скопійовано.', 'success'); }
  catch { setStatus('Не вдалося скопіювати діагностику.', 'error'); console.info(state.lastDiagnostics); }
}

/* ---------- events ---------- */
elements.connect.addEventListener('click', connectAndLoad);
elements.publish.addEventListener('click', publishChanges);
elements.previewUk.addEventListener('click', () => openPreview('uk'));
elements.previewEn.addEventListener('click', () => openPreview('en'));
elements.loadLocal.addEventListener('click', loadLocalFiles);
elements.download.addEventListener('click', downloadFiles);
elements.reset.addEventListener('click', resetChanges);
elements.copyDiagnostics.addEventListener('click', copyDiagnostics);
elements.addBlock.addEventListener('click', addBlock);
elements.search.addEventListener('input', applySearch);
elements.remember.addEventListener('change', () => { if (!elements.remember.checked) localStorage.removeItem('github-editor-token'); });
document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => setEditorMode(b.dataset.mode)));
window.addEventListener('beforeunload', event => { if (isDirty()) { event.preventDefault(); event.returnValue = ''; } });

restoreSettings();
renderListPicker();
setEditorMode('lists');
