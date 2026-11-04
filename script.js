const DEFAULT_LANGUAGE = 'uk';
const LANGUAGE_STORAGE_KEY = 'site-language';
const translationsCache = new Map();

async function loadTranslations(language) {
  if (translationsCache.has(language)) {
    return translationsCache.get(language);
  }

  const response = await fetch(`locales/${language}.json`);

  if (!response.ok) {
    throw new Error(`Unable to load language file: ${language}`);
  }

  const translations = await response.json();
  translationsCache.set(language, translations);
  return translations;
}

async function setLanguage(language) {
  const requestedLanguage = ['uk', 'en'].includes(language)
    ? language
    : DEFAULT_LANGUAGE;

  let selected;

  try {
    selected = await loadTranslations(requestedLanguage);
  } catch (error) {
    console.error(error);

    if (requestedLanguage !== DEFAULT_LANGUAGE) {
      selected = await loadTranslations(DEFAULT_LANGUAGE);
    } else {
      return;
    }
  }

  document.documentElement.lang = selected.lang;
  document.title = selected.title;
  document
    .querySelector('meta[name="description"]')
    .setAttribute('content', selected.description);

  Object.entries(selected.labels).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.setAttribute('aria-label', value);
  });

  Object.entries(selected.text).forEach(([key, value]) => {
    let nodes = document.querySelectorAll(`[data-i18n="${CSS.escape(key)}"]`);
    if (!nodes.length) {
      try { nodes = [document.querySelector(key)].filter(Boolean); } catch { nodes = []; }
    }
    nodes.forEach((node) => { node.innerHTML = value; });
  });

  // Посилання, що залежать від мови (наприклад, файл CV): data-i18n-href="ключ".
  document.querySelectorAll('[data-i18n-href]').forEach((link) => {
    const href = selected.text[link.dataset.i18nHref];
    if (href) link.setAttribute('href', href);
  });

  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === selected.lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, selected.lang); } catch {}
}

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang);
  });
});

// Email на сторінці закодовано від ботів-збирачів; розкодовуємо для відвідувачів.
document.querySelectorAll('[data-email]').forEach((link) => {
  let email = '';
  try { email = atob(link.dataset.email).split('').reverse().join(''); } catch { return; }
  if (!email) return;
  link.setAttribute('href', `mailto:${email}`);
  if (link.hasAttribute('data-contact-text')) link.textContent = `${email} ↗`;
});

// Кнопка «Показати всі сертифікати»: спершу видно 8 карток.
document.querySelector('.cert-more')?.addEventListener('click', (event) => {
  document.querySelector('.cert-grid')?.classList.remove('is-collapsed');
  event.currentTarget.remove();
});

let savedLanguage = null;
try { savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY); } catch {}
setLanguage(savedLanguage || DEFAULT_LANGUAGE);
