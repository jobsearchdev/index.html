/* Шаблони списків сайту. Використовуються редактором (editor.js).
   Кожен пункт списку має data-item="<id>", а його тексти — data-i18n="<id>.<поле>".
   Тексти обох мов зберігаються в locales/uk.json і locales/en.json (розділ "text"). */
(function (root) {
  const esc = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const plain = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
  const pad = n => String(n).padStart(2, '0');
  const t = (item, field) => item.uk[field] ?? '';
  const k = (item, field) => `${item.id}.${field}`;

  // Посилання на GitHub підписується «Відкрити на GitHub», будь-яке інше — «Відкрити сайт».
  const projectLink = (url, ctx) => {
    if (!url) return '';
    const key = /github\.com/i.test(url) ? 'projects.link' : 'projects.siteLink';
    const fallback = key === 'projects.link' ? 'Відкрити на GitHub ↗' : 'Відкрити сайт ↗';
    return `<a class="project-link" href="${esc(url)}" target="_blank" rel="noopener" data-i18n="${key}">${ctx.uk(key) || fallback}</a>`;
  };

  const LISTS = [
    {
      key: 'experience', title: 'Досвід роботи', container: '.timeline', prefix: 'exp',
      fields: [
        { name: 'time', label: 'Період', example: '2024 — дотепер / 2024 — present' },
        { name: 'role', label: 'Посада' },
        { name: 'company', label: 'Компанія', optional: true },
        { name: 'desc', label: 'Опис', multiline: true }
      ],
      attrs: [],
      render: item => `<article data-item="${item.id}"><div class="time" data-i18n="${k(item, 'time')}">${t(item, 'time')}</div><div><h3><span class="role" data-i18n="${k(item, 'role')}">${t(item, 'role')}</span>${t(item, 'company') ? ` <span class="company">· <span data-i18n="${k(item, 'company')}">${t(item, 'company')}</span></span>` : ''}</h3><p data-i18n="${k(item, 'desc')}">${t(item, 'desc')}</p></div></article>`
    },
    {
      key: 'projects', title: 'Проєкти', container: '.project-grid', prefix: 'project',
      fields: [
        { name: 'tag', label: 'Теги (дрібний рядок над назвою)' },
        { name: 'title', label: 'Назва' },
        { name: 'desc', label: 'Опис', multiline: true }
      ],
      attrs: [{ name: 'url', label: 'Посилання (GitHub тощо). Порожнє — кнопки не буде (для проєктів під NDA)', type: 'url', optional: true }],
      render: (item, ctx) => `<article class="project-card" data-item="${item.id}" data-url="${esc(item.attrs.url)}"><p class="project-tag" data-i18n="${k(item, 'tag')}">${t(item, 'tag')}</p><h3 data-i18n="${k(item, 'title')}">${t(item, 'title')}</h3><p class="project-desc" data-i18n="${k(item, 'desc')}">${t(item, 'desc')}</p>${projectLink(item.attrs.url, ctx)}</article>`
    },
    {
      key: 'certificates', title: 'Сертифікати', container: '.cert-grid', prefix: 'cert',
      fields: [
        { name: 'title', label: 'Назва курсу' },
        { name: 'meta', label: 'Хто видав · номер · дата', example: 'Nanit Robot · №45390 · 03.09.2026' },
        { name: 'note', label: 'Короткий опис', optional: true, multiline: true }
      ],
      attrs: [
        { name: 'image', label: 'Зображення сертифіката', type: 'image', optional: true },
        { name: 'thumb', label: 'Текст замість картинки (якщо її нема)', type: 'text', optional: true },
        { name: 'verify', label: 'Посилання для перевірки', type: 'url', optional: true }
      ],
      render: (item, ctx) => {
        const a = item.attrs;
        const thumb = a.image
          ? `<a class="cert-thumb" href="${esc(a.image)}" target="_blank" rel="noopener"><img src="${esc(a.image)}" alt="Сертифікат: ${esc(plain(t(item, 'title')))}" loading="lazy"></a>`
          : `<div class="cert-thumb cert-thumb-text"><span>${esc(a.thumb || 'CERTIFICATE')}</span></div>`;
        return `<article class="cert-card" data-item="${item.id}" data-image="${esc(a.image)}" data-thumb="${esc(a.thumb)}" data-verify="${esc(a.verify)}">${thumb}<h4 data-i18n="${k(item, 'title')}">${t(item, 'title')}</h4><p class="cert-meta" data-i18n="${k(item, 'meta')}">${t(item, 'meta')}</p>${t(item, 'note') ? `<p class="cert-note" data-i18n="${k(item, 'note')}">${t(item, 'note')}</p>` : ''}${a.verify ? `<a class="cert-verify" href="${esc(a.verify)}" target="_blank" rel="noopener" data-i18n="certs.verify">${ctx.uk('certs.verify') || 'Перевірити ↗'}</a>` : ''}</article>`;
      }
    },
    {
      key: 'skills', title: 'Навички (картки)', container: '.cards', prefix: 'skill',
      fields: [{ name: 'title', label: 'Назва' }, { name: 'desc', label: 'Опис', multiline: true }],
      attrs: [],
      render: (item, ctx, index) => `<article class="skill-card" data-item="${item.id}"><span>${pad(index + 1)}</span><h3 data-i18n="${k(item, 'title')}">${t(item, 'title')}</h3><p data-i18n="${k(item, 'desc')}">${t(item, 'desc')}</p></article>`
    },
    {
      key: 'focus', title: 'Поточний фокус', container: '.focus-list', prefix: 'focus',
      fields: [{ name: 'text', label: 'Пункт' }], attrs: [],
      render: item => `<li data-item="${item.id}" data-i18n="${k(item, 'text')}">${t(item, 'text')}</li>`
    },
    {
      key: 'labs', title: 'Лабораторії', container: '.lab-grid', prefix: 'lab',
      fields: [{ name: 'title', label: 'Назва' }, { name: 'desc', label: 'Опис', multiline: true }],
      attrs: [{ name: 'icon', label: 'Значок (2–4 літери)', type: 'text' }],
      render: item => `<article data-item="${item.id}" data-icon="${esc(item.attrs.icon)}"><div class="lab-icon">${esc(item.attrs.icon)}</div><h3 data-i18n="${k(item, 'title')}">${t(item, 'title')}</h3><p data-i18n="${k(item, 'desc')}">${t(item, 'desc')}</p></article>`
    },
    {
      key: 'learning', title: 'Навчання (список)', container: '.learning-block ul', prefix: 'learn',
      fields: [{ name: 'text', label: 'Пункт' }], attrs: [],
      render: item => `<li data-item="${item.id}" data-i18n="${k(item, 'text')}">${t(item, 'text')}</li>`
    },
    {
      key: 'education', title: 'Освіта', container: '.education-block ul', prefix: 'edu',
      fields: [{ name: 'text', label: 'Заклад, спеціальність, роки', multiline: true }], attrs: [],
      render: item => `<li data-item="${item.id}" data-i18n="${k(item, 'text')}">${t(item, 'text')}</li>`
    }
  ];

  const CONTACTS = [
    { name: 'email', label: 'Email (на сторінці зберігається закодованим, щоб його не збирали боти)', read: doc => { const node = doc.querySelector('[data-contact="email"]'); return node?.dataset.email ? decodeEmail(node.dataset.email) : (node?.getAttribute('href') || '').replace(/^mailto:/, ''); } },
    { name: 'phone', label: 'Телефон (на сторінці зберігається закодованим)', read: doc => { const node = doc.querySelector('[data-contact="phone"]'); return node?.dataset.phone ? decodeEmail(node.dataset.phone) : ''; } },
    { name: 'telegram', label: 'Telegram (посилання, напр. https://t.me/імʼя)', read: doc => doc.querySelector('[data-contact="telegram"]')?.getAttribute('href') || '' },
    { name: 'linkedin', label: 'LinkedIn (посилання)', read: doc => doc.querySelector('[data-contact="linkedin"]')?.getAttribute('href') || '' },
    { name: 'github', label: 'GitHub (посилання)', read: doc => doc.querySelector('[data-contact="github"]')?.getAttribute('href') || '' }
  ];

  // Email не зберігається у відкритому вигляді: рядок перевернуто й закодовано в base64.
  const encodeEmail = value => btoa(String(value).split('').reverse().join(''));
  const decodeEmail = value => { try { return atob(String(value)).split('').reverse().join(''); } catch { return ''; } };

  function applyContact(doc, name, value) {
    doc.querySelectorAll(`[data-contact="${name}"]`).forEach(el => {
      if (name === 'email' || name === 'phone') {
        el.setAttribute('href', '#contact');
        el.setAttribute(name === 'email' ? 'data-email' : 'data-phone', encodeEmail(value));
        if (el.hasAttribute('data-contact-text')) el.textContent = name === 'email' ? 'Email ↗' : 'Phone ↗';
      } else {
        el.setAttribute('href', value);
      }
    });
  }

  const api = { LISTS, CONTACTS, applyContact, encodeEmail, decodeEmail, esc, plain };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SITE_LISTS = api;
})(typeof window !== 'undefined' ? window : globalThis);
