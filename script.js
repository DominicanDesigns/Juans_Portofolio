/* Improved script: rain + accessible dropdowns + centralized chat/Tawk loader */
// ---------- Rain effect (efficient DOM + debounce) ----------
function createRain() {
  const container = document.querySelector('.rain-container');
  if (!container) return;
  // clear existing
  container.textContent = '';

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  // scale based on viewport but cap for performance devices
  const density = Math.max(8, Math.round(window.innerWidth / 24));
  const count = Math.min(120, density);

  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'rain-letter';
    el.textContent = chars.charAt(Math.floor(Math.random() * chars.length));

    const left = Math.random() * 100;
    const size = Math.floor(Math.random() * 18) + 10;
    const duration = (Math.random() * 4 + 2).toFixed(2);
    const delay = (Math.random() * 6).toFixed(2);

    el.style.left = `${left}%`;
    el.style.fontSize = `${size}px`;
    el.style.animationDuration = `${duration}s`;
    el.style.animationDelay = `${delay}s`;

    frag.appendChild(el);
  }
  container.appendChild(frag);
}

let _resizeTimer = null;
function initRain() {
  createRain();
  window.addEventListener('resize', () => {
    clearTimeout(_resizeTimer);
    _resizeTimer = setTimeout(createRain, 240);
  });
}


// ---------- Accessible dropdown handling ----------
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.dropbtn');
    const menu = dd.querySelector('.dropdown-content');
    if (!btn || !menu) return;

    // ensure initial aria state
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', menu.id || '');

    function open() {
      dd.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      dd.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dd.classList.contains('open')) close(); else open();
    });

    // keyboard support
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); btn.focus(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); open(); const first = menu.querySelector('a, button, [tabindex]:not([tabindex="-1"])'); if (first) first.focus(); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (dd.classList.contains('open')) close(); else open(); }
    });

    // handle Esc inside the menu
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); btn.focus(); }
    });

    // close on outside click
    document.addEventListener('click', (ev) => {
      if (!dd.contains(ev.target)) close();
    });
  });
}


// ---------- Centralized Tawk loader + minimal chat fallback ----------
const TAWK_SRC = 'https://embed.tawk.to/6617e510a0c6737bd12ac230/1hr6ldik8';
function loadTawkOnce() {
  if (window.__tawkLoaded) return;
  if (window.Tawk_API || document.querySelector('script[src*="tawk.to"]')) {
    window.__tawkLoaded = true;
    return;
  }
  const s = document.createElement('script');
  s.async = true;
  s.src = TAWK_SRC;
  s.charset = 'UTF-8';
  s.setAttribute('crossorigin', '*');
  document.head.appendChild(s);
  window.__tawkLoaded = true;
}

function initChatUI() {
  // Provide a safe chatBackend API so pages/scripts can use it whether Tawk is present or not
  window.chatBackend = window.chatBackend || {};

  // If Tawk is present we'll keep minimal placeholders; otherwise create a lightweight widget
  const hasTawk = !!(window.Tawk_API || document.querySelector('script[src*="tawk.to"]'));
  if (hasTawk) {
    window.chatBackend.sendMessage = window.chatBackend.sendMessage || function (text) { console.info('Tawk present — sendMessage:', text); };
    window.chatBackend.onMessage = window.chatBackend.onMessage || function (cb) { console.info('Tawk present — onMessage registered'); };
    return;
  }

  // Minimal chat widget (lightweight fallback)
  if (!document.getElementById('chat-open')) {
    const openBtn = document.createElement('button');
    openBtn.id = 'chat-open';
    openBtn.className = 'chat-open-btn';
    openBtn.textContent = 'Chat';
    openBtn.type = 'button';
    document.body.appendChild(openBtn);
  }

  if (!document.getElementById('chat-widget')) {
    const widget = document.createElement('div');
    widget.id = 'chat-widget';
    widget.className = 'chat-widget hidden';
    widget.innerHTML = `
      <div class="chat-header">
        <span>Chat</span>
        <button id="chat-close" aria-label="Close chat" style="border:none;background:transparent;cursor:pointer">✕</button>
      </div>
      <div id="chat-messages" class="chat-messages" aria-live="polite"></div>
      <form id="chat-form" class="chat-form">
        <input id="chat-input" placeholder="Type a message..." autocomplete="off" />
        <button type="submit">Send</button>
      </form>
    `;
    document.body.appendChild(widget);
  }

  const btn = document.getElementById('chat-open');
  const closeBtn = document.getElementById('chat-close');
  const messagesEl = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');

  btn && btn.addEventListener('click', () => document.getElementById('chat-widget').classList.toggle('hidden'));
  closeBtn && closeBtn.addEventListener('click', () => document.getElementById('chat-widget').classList.add('hidden'));

  function appendMessage({ name = 'Guest', text = '', self = false, ts }) {
    if (!messagesEl) return;
    const wrap = document.createElement('div');
    wrap.className = 'chat-message' + (self ? ' me' : '');
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${name} · ${new Date(ts || Date.now()).toLocaleTimeString()}`;
    const txt = document.createElement('div');
    txt.className = 'text';
    txt.textContent = text;
    wrap.appendChild(meta);
    wrap.appendChild(txt);
    messagesEl.appendChild(wrap);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  window.chatBackend.sendMessage = window.chatBackend.sendMessage || function (text) { appendMessage({ name: 'You', text, self: true }); };
  window.chatBackend.onMessage = window.chatBackend.onMessage || function (cb) { /* optional */ };
  window.__appendChatMessage = appendMessage;

  if (form && input) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      try {
        if (window.chatBackend && typeof window.chatBackend.sendMessage === 'function') {
          window.chatBackend.sendMessage(text);
        }
        if (window.__appendChatMessage) {
          window.__appendChatMessage({ name: 'You', text, self: true });
        }
      } catch (err) { console.error(err); }
      input.value = '';
      input.focus();
    });
  }
}

// ---------- Lightweight i18n (client-only) ----------
const _i18n = {
  en: {
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.contact': 'Contact',
    'hero.title': 'Design, Build & Launch modern websites',
    'hero.lead': 'I build fast, accessible and responsive sites that help businesses convert visitors into customers. I handle design, development, deployment and the initial support.',
    'cta.hire': 'Hire me — Get a quote',
    'cta.services': 'See services',
    'services.heading': 'Services',
    'services.lead': 'Simple, transparent services tailored to launch your idea.',
    'service.web.title': 'Websites',
    'service.web.desc': 'Responsive builds, content entry and basic SEO. Fast delivery and training.',
    'service.apps.title': 'Apps',
    'service.apps.desc': 'Mobile and web apps, testing and store guidance for production-ready releases.',
    'service.maint.title': 'Maintenance',
    'service.maint.desc': 'Updates, backups and security monitoring with monthly reports.',
    'portfolio.heading': 'Selected work',
    'portfolio.lead': 'A few examples of projects and themes I build.',
    'portfolio.apps': 'Apps — Product launch',
  'portfolio.website': 'Website — Small business',
  'portfolio.maintenance': 'Maintenance — Ongoing plan',
  'portfolio.domain': 'Domain registration',
    'contact.getintouch': 'Get in touch',
    'contact.lead': "I'd love to hear about your project, question, or feedback. Send a message below and I'll reply as soon as I can.",
    'form.firstname': 'First name',
    'form.lastname': 'Last name',
    'form.email': 'Email',
    'form.message': 'Message',
    'form.send': 'Send message',
    'form.status': '',
    'form.placeholder.firstname': 'Your first name',
    'form.placeholder.lastname': 'Your last name',
    'form.placeholder.email': 'you@example.com',
    'form.placeholder.message': 'Tell me about your project...',
    'apps.title': 'Apps Details',
    'apps.paragraph': 'When you purchase an app or product from me, I manage the end-to-end process so you get a polished, tested product ready for users. I cover planning, design, development, testing, deployment and initial support — all tailored to your project\'s needs.',
    'apps.after': 'What I normally do after a purchase',
    'website.title': 'Website Details',
    'website.paragraph': 'When you purchase a website from me, I take care of the full process so you can focus on your business. I handle planning, design, development, launch and the initial support after delivery.',
    'website.after': 'What I normally do after a purchase',
    'maint.title': 'Maintenance Details',
    'maint.paragraph': 'Purchasing a maintenance plan means I take ongoing responsibility for keeping your site healthy, secure and up-to-date.',
    'maint.after': 'What I normally do after a maintenance purchase',
    'pricing.heading': 'Our Services & Pricing',
    'pricing.title': 'Services & Pricing',
    'pricing.lead': 'Simple, transparent pricing. Choose a service or contact me for a custom quote.',
    'plan.web': 'Website',
    'plan.web.f1': 'Responsive design',
    'plan.web.f2': 'SEO basics & performance checks',
    'plan.web.f3': '2 rounds of revisions',
    'plan.apps': 'Apps',
    'plan.apps.f1': 'Mobile & web-ready builds',
    'plan.apps.f2': 'Basic testing across devices',
    'plan.apps.f3': 'App store guidance',
    'plan.maint': 'Maintenance',
    'plan.maint.f1': 'Updates & backups',
    'plan.maint.f2': 'Security monitoring',
    'plan.maint.f3': 'Monthly report',
    'plan.domain': 'Domain registration',
    'plan.domain.price': 'Contact for pricing',
    'plan.domain.f1': 'One-off registration & transfer assistance',
    'plan.domain.f2': 'Domain privacy and DNS setup',
    // status messages
    'status.fill_required': 'Please fill the required fields.',
    'status.opening_mail': 'Opening your mail client...',
    'status.mail_fail': 'If your mail client didn\'t open, please send an email to',
  },
  es: {
    'nav.home': 'Inicio',
    'nav.services': 'Servicios',
    'nav.contact': 'Contacto',
    'hero.title': 'Diseña, construye y lanza sitios modernos',
    'hero.lead': 'Construyo sitios rápidos, accesibles y responsivos que ayudan a convertir visitantes en clientes. Manejo diseño, desarrollo, despliegue y soporte inicial.',
    'cta.hire': 'Contrátame — Solicitar presupuesto',
    'cta.services': 'Ver servicios',
    'services.heading': 'Servicios',
    'services.lead': 'Servicios simples y transparentes para lanzar tu idea.',
    'service.web.title': 'Sitios web',
    'service.web.desc': 'Construcciones responsivas, entrada de contenido y SEO básico. Entrega rápida y formación.',
    'service.apps.title': 'Aplicaciones',
    'service.apps.desc': 'Aplicaciones móviles y web, testing y guía para publicación en tiendas.',
    'service.maint.title': 'Mantenimiento',
    'service.maint.desc': 'Actualizaciones, copias de seguridad y monitoreo de seguridad con informes mensuales.',
    'portfolio.heading': 'Trabajo seleccionado',
    'portfolio.lead': 'Algunos ejemplos de proyectos y temas que construyo.',
    'portfolio.apps': 'Aplicaciones — Lanzamiento de producto',
  'portfolio.website': 'Sitio web — Pequeño negocio',
  'portfolio.maintenance': 'Mantenimiento — Plan continuo',
  'portfolio.domain': 'Registro de dominios',
    'contact.getintouch': 'Contacta',
    'contact.lead': 'Me encantaría saber sobre tu proyecto, pregunta o comentario. Envía un mensaje abajo y responderé lo antes posible.',
    'form.firstname': 'Nombre',
    'form.lastname': 'Apellido',
    'form.email': 'Correo electrónico',
    'form.message': 'Mensaje',
    'form.send': 'Enviar mensaje',
    'form.status': '',
    'form.placeholder.firstname': 'Tu nombre',
    'form.placeholder.lastname': 'Tu apellido',
    'form.placeholder.email': 'tu@ejemplo.com',
    'form.placeholder.message': 'Cuéntame sobre tu proyecto...',
    'apps.title': 'Detalles de Apps',
    'apps.paragraph': 'Cuando compras una app o producto conmigo, gestiono el proceso de principio a fin para que obtengas un producto pulido y probado listo para los usuarios. Cubro planificación, diseño, desarrollo, pruebas, despliegue y soporte inicial — todo adaptado a las necesidades de tu proyecto.',
    'apps.after': 'Qué normalmente hago después de una compra',
    'website.title': 'Detalles del Sitio Web',
    'website.paragraph': 'Cuando compras un sitio web conmigo, me encargo del proceso completo para que puedas concentrarte en tu negocio. Manejo planificación, diseño, desarrollo, lanzamiento y el soporte inicial tras la entrega.',
    'website.after': 'Qué normalmente hago después de una compra',
    'maint.title': 'Detalles de Mantenimiento',
    'maint.paragraph': 'Comprar un plan de mantenimiento significa que me encargo de mantener tu sitio sano, seguro y actualizado.',
    'maint.after': 'Qué normalmente hago después de una compra de mantenimiento',
    'pricing.heading': 'Nuestros Servicios y Precios',
    'pricing.title': 'Servicios y Precios',
    'pricing.lead': 'Precios simples y transparentes. Elige un servicio o contáctame para una cotización personalizada.',
    'plan.web': 'Sitio web',
    'plan.web.f1': 'Diseño responsivo',
    'plan.web.f2': 'SEO básico y comprobaciones de rendimiento',
    'plan.web.f3': '2 rondas de revisiones',
    'plan.apps': 'Apps',
    'plan.apps.f1': 'Construcciones móviles y web',
    'plan.apps.f2': 'Pruebas básicas en dispositivos',
    'plan.apps.f3': 'Guía para tiendas de apps',
    'plan.maint': 'Mantenimiento',
    'plan.maint.f1': 'Actualizaciones y copias de seguridad',
    'plan.maint.f2': 'Monitoreo de seguridad',
    'plan.maint.f3': 'Informe mensual',
  'plan.domain': 'Registro de dominios',
  'plan.domain.price': 'Contacta para precio',
  'plan.domain.f1': 'Registro único y asistencia de transferencia',
  'plan.domain.f2': 'Privacidad de dominio y configuración DNS',
    'status.fill_required': 'Por favor completa los campos obligatorios.',
    'status.opening_mail': 'Abriendo tu cliente de correo...',
    'status.mail_fail': 'Si tu cliente de correo no se abrió, por favor envía un email a',
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.services': 'Services',
    'nav.contact': 'Contact',
    'hero.title': 'Concevez, développez et lancez des sites modernes',
    'hero.lead': 'Je crée des sites rapides, accessibles et responsifs qui aident à convertir les visiteurs en clients. Je m’occupe du design, du développement, du déploiement et du support initial.',
    'cta.hire': 'Engagez-moi — Obtenir un devis',
    'cta.services': 'Voir les services',
    'services.heading': 'Services',
    'services.lead': 'Services simples et transparents pour lancer votre idée.',
    'service.web.title': 'Sites web',
    'service.web.desc': 'Sites responsifs, saisie de contenu et SEO de base. Livraison rapide et formation.',
    'service.apps.title': 'Apps',
    'service.apps.desc': 'Applications mobiles et web, tests et conseils pour la publication en production.',
    'service.maint.title': 'Maintenance',
    'service.maint.desc': 'Mises à jour, sauvegardes et surveillance de sécurité avec rapports mensuels.',
    'portfolio.heading': 'Travaux sélectionnés',
    'portfolio.lead': 'Quelques exemples de projets et thèmes que je construis.',
    'portfolio.apps': 'Apps — Lancement de produit',
  'portfolio.website': 'Site web — Petite entreprise',
  'portfolio.maintenance': 'Maintenance — Plan continu',
  'portfolio.domain': 'Enregistrement de domaine',
    'contact.getintouch': 'Contactez-moi',
    'contact.lead': "J'aimerais connaître votre projet, question ou retour. Envoyez un message ci-dessous et je répondrai dès que possible.",
    'form.firstname': 'Prénom',
    'form.lastname': 'Nom',
    'form.email': 'E-mail',
    'form.message': 'Message',
    'form.send': 'Envoyer le message',
    'form.status': '',
    'form.placeholder.firstname': 'Votre prénom',
    'form.placeholder.lastname': 'Votre nom',
    'form.placeholder.email': 'vous@exemple.com',
    'form.placeholder.message': 'Parlez-moi de votre projet...',
    'apps.title': 'Détails Apps',
    'apps.paragraph': "Lorsque vous achetez une application ou un produit chez moi, je gère le processus de bout en bout pour que vous obteniez un produit soigné et testé prêt pour les utilisateurs.",
    'apps.after': 'Ce que je fais normalement après un achat',
    'website.title': 'Détails du site web',
    'website.paragraph': 'Lorsque vous achetez un site web chez moi, je m’occupe du processus complet pour que vous puissiez vous concentrer sur votre activité.',
    'website.after': 'Ce que je fais normalement après un achat',
    'maint.title': 'Détails de maintenance',
    'maint.paragraph': 'L’achat d’un plan de maintenance signifie que je prends en charge le maintien de la santé, la sécurité et la mise à jour de votre site.',
    'maint.after': 'Ce que je fais normalement après un achat de maintenance',
    'pricing.heading': 'Nos services & tarifs',
    'pricing.title': 'Services & tarifs',
    'pricing.lead': 'Tarifs simples et transparents. Choisissez un service ou contactez-moi pour un devis personnalisé.',
    'plan.web': 'Site web',
    'plan.web.f1': 'Design responsive',
    'plan.web.f2': 'SEO de base & contrôles de performance',
    'plan.web.f3': '2 tours de révisions',
    'plan.apps': 'Apps',
    'plan.apps.f1': 'Builds mobiles & web',
    'plan.apps.f2': 'Tests basiques sur appareils',
    'plan.apps.f3': 'Conseils pour les stores d\'apps',
    'plan.maint': 'Maintenance',
    'plan.maint.f1': 'Mises à jour & sauvegardes',
    'plan.maint.f2': 'Surveillance de sécurité',
    'plan.maint.f3': 'Rapport mensuel',
  'plan.domain': 'Enregistrement de domaine',
  'plan.domain.price': 'Contactez pour le prix',
  'plan.domain.f1': "Enregistrement ponctuel & assistance au transfert",
  'plan.domain.f2': "Confidentialité du domaine et configuration DNS",
    'status.fill_required': 'Veuillez remplir les champs requis.',
    'status.opening_mail': 'Ouverture de votre client mail...',
    'status.mail_fail': 'Si votre client mail ne s\'est pas ouvert, envoyez un email à',
  }
};

let _currentLang = null;
function _t(key) {
  const lang = _currentLang || localStorage.getItem('site_lang') || (navigator.language || 'en').split('-')[0];
  if (_i18n[lang] && _i18n[lang][key] !== undefined) return _i18n[lang][key];
  if (_i18n['en'] && _i18n['en'][key] !== undefined) return _i18n['en'][key];
  return '';
}

function applyTranslations(lang) {
  try {
    _currentLang = lang;
    const nodes = document.querySelectorAll('[data-i18n]');
    nodes.forEach(n => {
      const key = n.getAttribute('data-i18n');
      const txt = _t(key);
      if (!txt) return;
      const tag = n.tagName.toLowerCase();
      if ((tag === 'input' || tag === 'textarea') && n.placeholder !== undefined) {
        n.placeholder = txt;
        return;
      }
      n.textContent = txt;
    });

    // placeholders using special attribute
    const elems = document.querySelectorAll('[data-i18n-placeholder]');
    elems.forEach(e => {
      const key = e.getAttribute('data-i18n-placeholder');
      const txt = _t(key);
      if (txt) e.placeholder = txt;
    });

    // set select(s) (any selector marked with data-lang-select)
    const selects = document.querySelectorAll('[data-lang-select]');
    selects.forEach(s => { try { s.value = lang; } catch (e) {} });
    localStorage.setItem('site_lang', lang);
  } catch (err) { console.error('i18n error', err); }
}

function initI18n() {
  const saved = localStorage.getItem('site_lang') || ((navigator.language || 'en').startsWith('es') ? 'es' : 'en');
  applyTranslations(saved);

  // Attach listeners to any language select in the page (data-lang-select)
  const selects = document.querySelectorAll('[data-lang-select]');
  selects.forEach(s => {
    s.addEventListener('change', (e) => {
      const val = e.target.value || 'en';
      applyTranslations(val);
    });
  });
}

// ---------- Contact form / mailto handler (uses translations above) ----------
function initContactForm() {
      const form = document.getElementById('contact-form');
      if (!form) return;
      const status = document.getElementById('form-status');

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fname = (form.firstname && form.firstname.value || '').trim();
        const lname = (form.lastname && form.lastname.value || '').trim();
        const email = (form.email && form.email.value || '').trim();
        const message = (form.subject && form.subject.value || '').trim();

        // simple validation
        if (!fname || !email || !message) {
          if (status) {
            status.classList.remove('hidden');
            status.style.color = '#b02a2a';
            status.textContent = _t('status.fill_required') || 'Please fill the required fields.';
          }
          return;
        }

        const to = 'DominicanDesigns@outlook.com';
        const subject = encodeURIComponent('Contact from website — ' + (fname + (lname ? ' ' + lname : '')));
        const body = encodeURIComponent(`Name: ${fname} ${lname}\nEmail: ${email}\n\nMessage:\n${message}`);

        if (status) {
          status.classList.remove('hidden');
          status.style.color = '#0a8a3a';
          status.textContent = _t('status.opening_mail') || 'Opening your mail client...';
        }

        // Use mailto to open user's mail app with prefilled content (works as fallback without server)
        setTimeout(() => {
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
          if (status) {
            status.textContent = (_t('status.mail_fail') || 'If your mail client didn\'t open, please send an email to') + ' ' + to;
          }
        }, 250);

        form.reset();
      });
    }

// ---------- Init on DOM ready ----------
window.addEventListener('DOMContentLoaded', () => {
  initRain();
  initDropdowns();
  // Load Tawk once (keeps previous behaviour of embedding Tawk by default)
  loadTawkOnce();
  // initialize i18n before other UI that may rely on text
  initI18n();
  // Then initialize fallback chat UI / safe API
      // contact form handler (if present)
      initContactForm();
  initChatUI();
});
