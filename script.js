const translations = {
  uk: {
    lang: 'uk',
    title: 'Technical Engineer',
    description: 'Technical Engineer, Drone Systems, Embedded Systems, Electronics, Technical Project Manager та R&D.',
    labels: {
      '.brand': 'На початок сторінки',
      '.nav': 'Основна навігація',
      '.quick-facts': 'Короткі відомості',
      '.language-switch': 'Перемикач мови'
    },
    text: {
      '.brand strong': '',
      '.nav a:nth-child(1)': 'Профіль',
      '.nav a:nth-child(2)': 'Навички',
      '.nav a:nth-child(3)': 'Досвід',
      '.nav a:nth-child(4)': 'Лабораторії',
      '.site-header > .button': 'Написати',
      '.hero h1': 'Інженерний підхід.<br><span>Практичний результат.</span>',
      '.lead': 'Поєдную програмну інженерію, серверну інфраструктуру, електроніку, автоматизацію та управління технічними командами.',
      '.hero-actions .button:nth-child(1)': 'Зв’язатися',
      '.hero-actions .button:nth-child(2)': 'Переглянути досвід',
      '.quick-facts div:nth-child(1) span': 'років у tech',
      '.quick-facts div:nth-child(2) span': 'ключових напрямів',
      '.quick-facts div:nth-child(3) strong': 'Кривий Ріг',
      '.quick-facts div:nth-child(3) span': 'Україна · remote',
      '.status': '<span></span> Відкритий до пропозицій',
      '.hero-panel h2': 'Поточний фокус',
      '.focus-list li:nth-child(1)': 'Drone systems та FPV',
      '.focus-list li:nth-child(2)': 'Embedded / electronics',
      '.focus-list li:nth-child(3)': 'Linux / infrastructure',
      '.focus-list li:nth-child(4)': 'Automation / AI',
      '.focus-list li:nth-child(5)': 'Technical project management',
      '.focus-list li:nth-child(6)': 'R&D та прототипування',
      '#about .section-kicker': '01 / Профіль',
      '#about h2': 'Від системного адміністратора до технічного лідера',
      '#about .prose p:nth-child(1)': 'Практичний технічний спеціаліст із досвідом в ІТ, інфраструктурі, веброзробці, автоматизації, керуванні командами та R&D-напрямках.',
      '#about .prose p:nth-child(2)': 'Пройшов шлях від системного адміністратора і веброзробника до керівника технічного відділу, COO та Project Manager. Розвиваюсь у Drone Technologies, Embedded Systems, Electronics & Robotics, Computer Vision, Cyber Security, Automation & AI.',
      '#skills .section-kicker': '02 / Компетенції',
      '#skills h2': 'Технічний стек',
      '#skills .section-heading > p': 'Практичні інструменти для прототипування, інфраструктури та запуску проєктів.',
      '.skill-card:nth-child(1) p': 'FPV збірка, ремонт і діагностика, Betaflight, ELRS, RadioMaster, прошивка, калібрування, тестування.',
      '.skill-card:nth-child(2) p': 'Arduino, ESP32, Raspberry Pi, STM32 / AVR, UART, SPI, I2C, GPIO.',
      '.skill-card:nth-child(3) p': 'THT пайка, базова SMD, мультиметр, Li-Ion packs, spot welding, ремонт ПК.',
      '.skill-card:nth-child(4) p': 'Python, C++, Kotlin, MySQL, HTML/CSS, Telegram Bot API.',
      '.skill-card:nth-child(5) p': 'Ubuntu, Debian, Windows, Proxmox VE, Docker, VPN, backup, networking, GitHub.',
      '.skill-card:nth-child(6) p': 'PM, COO, Team Lead, n8n, hiring, documentation, WordPress, Joomla, OpenCart, MODX, Bitrix.',
      '#experience .section-kicker': '03 / Кар’єра',
      '#experience h2': 'Досвід роботи',
      '#experience .section-heading > p': 'Управління командами, інженерна практика, автоматизація та вебпродукти.',
      '.timeline article:nth-child(1) .time': '2026 — дотепер',
      '.timeline article:nth-child(1) p': 'Управління командою розробників, планування, контроль виконання, пріоритизація та комунікація між учасниками проєктів.',
      '.timeline article:nth-child(2) p': 'Управління технічним відділом, оптимізація процесів, побудова інфраструктури та автоматизація через n8n.',
      '.timeline article:nth-child(3) p': 'Побудова внутрішніх процесів, координація відділів, технічне управління, парсинг та автоматизація операційних задач.',
      '.timeline article:nth-child(4) p': 'Android/Kotlin розробка, аналітика мобільних додатків та Telegram CRM контент-менеджмент.',
      '.timeline article:nth-child(5) p': 'Управління командою, найм, розподіл задач, контроль розробки, SEO, PPC та email-маркетинг.',
      '.timeline article:nth-child(6) p': 'GrilleGuard, PartsQ, Пром-Океан, UkraїnkaFest, «Аніма»: розробка CMS-сайтів, SEO, PPC, Analytics/GTM, A/B тестування й технічна підтримка.',
      '.timeline article:nth-child(7) h3': 'Інженерна та операційна практика',
      '.timeline article:nth-child(7) p': 'Системне адміністрування у КНЕУ, монтаж мереж у Київстар, слюсарно-ремонтні роботи на ПГЗК та операційний досвід у McDonald’s.',
      '#labs .section-kicker': '04 / Практика',
      '#labs h2': 'Особисті лабораторії',
      '#labs .section-heading > p': 'Середовище для постійного навчання, тестів і прототипування.',
      '.lab-grid article:nth-child(1) p': 'Збірка FPV-дронів, прошивка, налаштування та діагностика.',
      '.lab-grid article:nth-child(2) p': 'Powerbanks, battery packs, тестування Li-Ion та spot welding.',
      '.lab-grid article:nth-child(3) p': 'Arduino, ESP32, STM32, Raspberry Pi, інтерфейси та прототипи.',
      '.lab-grid article:nth-child(4) p': 'Proxmox, Linux-інфраструктура, Telegram bots, backup та домашня сонячна електростанція.',
      '.info-grid article:nth-child(1) .section-kicker': '05 / Навчання',
      '.info-grid article:nth-child(1) h2': 'Розвиток',
      '.info-grid article:nth-child(2) .section-kicker': '06 / Освіта',
      '.info-grid article:nth-child(2) h2': 'База',
      '.info-grid article:nth-child(2) li:nth-child(1)': 'Новобузький педагогічний коледж — Інформатика / Початкові класи',
      '.info-grid article:nth-child(2) li:nth-child(2)': 'Криворізький коледж економіки та управління — Фінанси підприємства',
      '.info-grid article:nth-child(2) h3': 'Мови',
      '.info-grid article:nth-child(2) p': 'Українська — рідна · Російська — вільна · Англійська — A1 → B2',
      '.contact .section-kicker': 'Контакт',
      '.contact h2': 'Готовий посилити технічну команду',
      '.contact > p:not(.section-kicker)': 'Віддалена робота · ФОП 2 група · довгострокові проєкти',
      'footer p': '© <span id="year"></span> Євгеній Кофан',
      'footer a': 'На початок ↑'
    }
  },
  en: {
    lang: 'en',
    title: 'Evhenii Kofan — Technical Engineer',
    description: 'Evhenii Kofan — Technical Engineer, Drone Systems, Embedded Systems, Electronics, Technical Project Manager and R&D specialist.',
    labels: {
      '.brand': 'Back to the top',
      '.nav': 'Main navigation',
      '.quick-facts': 'Quick facts',
      '.language-switch': 'Language switcher'
    },
    text: {
      '.brand strong': 'Evhenii Kofan',
      '.nav a:nth-child(1)': 'Profile',
      '.nav a:nth-child(2)': 'Skills',
      '.nav a:nth-child(3)': 'Experience',
      '.nav a:nth-child(4)': 'Laboratories',
      '.site-header > .button': 'Contact',
      '.hero h1': 'Engineering mindset.<br><span>Practical results.</span>',
      '.lead': 'I combine software engineering, server infrastructure, electronics, automation, and technical team management.',
      '.hero-actions .button:nth-child(1)': 'Get in touch',
      '.hero-actions .button:nth-child(2)': 'View experience',
      '.quick-facts div:nth-child(1) span': 'years in tech',
      '.quick-facts div:nth-child(2) span': 'key areas',
      '.quick-facts div:nth-child(3) strong': 'Kryvyi Rih',
      '.quick-facts div:nth-child(3) span': 'Ukraine · remote',
      '.status': '<span></span> Open to opportunities',
      '.hero-panel h2': 'Current focus',
      '.focus-list li:nth-child(1)': 'Drone systems and FPV',
      '.focus-list li:nth-child(2)': 'Embedded / electronics',
      '.focus-list li:nth-child(3)': 'Linux / infrastructure',
      '.focus-list li:nth-child(4)': 'Automation / AI',
      '.focus-list li:nth-child(5)': 'Technical project management',
      '.focus-list li:nth-child(6)': 'R&D and prototyping',
      '#about .section-kicker': '01 / Profile',
      '#about h2': 'From system administrator to technical leader',
      '#about .prose p:nth-child(1)': 'A hands-on technical specialist with experience in IT, infrastructure, web development, automation, team management, and R&D.',
      '#about .prose p:nth-child(2)': 'Progressed from system administrator and web developer to Head of Technical Department, COO, and Project Manager. Currently developing expertise in Drone Technologies, Embedded Systems, Electronics & Robotics, Computer Vision, Cyber Security, Automation & AI.',
      '#skills .section-kicker': '02 / Expertise',
      '#skills h2': 'Technical stack',
      '#skills .section-heading > p': 'Practical tools for prototyping, infrastructure, and project delivery.',
      '.skill-card:nth-child(1) p': 'FPV assembly, repair and diagnostics, Betaflight, ELRS, RadioMaster, firmware flashing, calibration, and testing.',
      '.skill-card:nth-child(2) p': 'Arduino, ESP32, Raspberry Pi, STM32 / AVR, UART, SPI, I2C, GPIO.',
      '.skill-card:nth-child(3) p': 'THT soldering, basic SMD, multimeter use, Li-Ion packs, spot welding, and PC repair.',
      '.skill-card:nth-child(4) p': 'Python, C++, Kotlin, MySQL, HTML/CSS, Telegram Bot API.',
      '.skill-card:nth-child(5) p': 'Ubuntu, Debian, Windows, Proxmox VE, Docker, VPN, backups, networking, GitHub.',
      '.skill-card:nth-child(6) p': 'PM, COO, Team Lead, n8n, hiring, documentation, WordPress, Joomla, OpenCart, MODX, Bitrix.',
      '#experience .section-kicker': '03 / Career',
      '#experience h2': 'Work experience',
      '#experience .section-heading > p': 'Team leadership, engineering practice, automation, and web products.',
      '.timeline article:nth-child(1) .time': '2026 — present',
      '.timeline article:nth-child(1) p': 'Managing a development team, planning, delivery control, prioritization, and communication between project participants.',
      '.timeline article:nth-child(2) p': 'Managing the technical department, optimizing processes, building infrastructure, and automating workflows with n8n.',
      '.timeline article:nth-child(3) p': 'Building internal processes, coordinating departments, providing technical management, data parsing, and automating operational tasks.',
      '.timeline article:nth-child(4) p': 'Android/Kotlin development, mobile app analytics, and Telegram CRM content management.',
      '.timeline article:nth-child(5) p': 'Team management, recruitment, task allocation, development control, SEO, PPC, and email marketing.',
      '.timeline article:nth-child(6) p': 'GrilleGuard, PartsQ, Prom-Okean, UkraїnkaFest, and Anima: CMS website development, SEO, PPC, Analytics/GTM, A/B testing, and technical support.',
      '.timeline article:nth-child(7) h3': 'Engineering and operational experience',
      '.timeline article:nth-child(7) p': 'System administration at KNEU, network installation at Kyivstar, mechanical repair work at PGZK, and operational experience at McDonald’s.',
      '#labs .section-kicker': '04 / Practice',
      '#labs h2': 'Personal laboratories',
      '#labs .section-heading > p': 'An environment for continuous learning, testing, and prototyping.',
      '.lab-grid article:nth-child(1) p': 'FPV drone assembly, firmware flashing, configuration, and diagnostics.',
      '.lab-grid article:nth-child(2) p': 'Power banks, battery packs, Li-Ion testing, and spot welding.',
      '.lab-grid article:nth-child(3) p': 'Arduino, ESP32, STM32, Raspberry Pi, interfaces, and prototypes.',
      '.lab-grid article:nth-child(4) p': 'Proxmox, Linux infrastructure, Telegram bots, backups, and a home solar power system.',
      '.info-grid article:nth-child(1) .section-kicker': '05 / Learning',
      '.info-grid article:nth-child(1) h2': 'Development',
      '.info-grid article:nth-child(2) .section-kicker': '06 / Education',
      '.info-grid article:nth-child(2) h2': 'Background',
      '.info-grid article:nth-child(2) li:nth-child(1)': 'Novyi Buh Pedagogical College — Computer Science / Primary Education',
      '.info-grid article:nth-child(2) li:nth-child(2)': 'Kryvyi Rih College of Economics and Management — Business Finance',
      '.info-grid article:nth-child(2) h3': 'Languages',
      '.info-grid article:nth-child(2) p': 'Ukrainian — native · Russian — fluent · English — A1 → B2',
      '.contact .section-kicker': 'Contact',
      '.contact h2': 'Ready to strengthen a technical team',
      '.contact > p:not(.section-kicker)': 'Remote work · Ukrainian sole proprietor, Group 2 · long-term projects',
      'footer p': '© <span id="year"></span> Evhenii Kofan',
      'footer a': 'Back to top ↑'
    }
  }
};

function setLanguage(language) {
  const selected = translations[language] || translations.uk;
  document.documentElement.lang = selected.lang;
  document.title = selected.title;
  document.querySelector('meta[name="description"]').setAttribute('content', selected.description);

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
  localStorage.setItem('site-language', selected.lang);
}

document.querySelectorAll('[data-lang]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.lang));
});

setLanguage(localStorage.getItem('site-language') || 'uk');
