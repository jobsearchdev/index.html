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

  Object.entries(selected.text).forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.innerHTML = value;
  });

  document.querySelectorAll('[data-lang]').forEach((button) => {
    const active = button.dataset.lang === selected.lang;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  document.getElementById('year').textContent = new Date().getFullYear();
  localStorage.setItem(LANGUAGE_STORAGE_KEY, selected.lang);
}

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => {
    setLanguage(button.dataset.lang);
  });
});

setLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE);
