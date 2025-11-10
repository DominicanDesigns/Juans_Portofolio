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
            status.textContent = 'Please fill the required fields.';
          }
          return;
        }

        const to = 'DominicanDesigns@outlook.com';
        const subject = encodeURIComponent('Contact from website — ' + (fname + (lname ? ' ' + lname : '')));
        const body = encodeURIComponent(`Name: ${fname} ${lname}\nEmail: ${email}\n\nMessage:\n${message}`);

        if (status) {
          status.classList.remove('hidden');
          status.style.color = '#0a8a3a';
          status.textContent = 'Opening your mail client...';
        }

        // Use mailto to open user's mail app with prefilled content (works as fallback without server)
        setTimeout(() => {
          window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
          if (status) {
            status.textContent = 'If your mail client didn\'t open, please send an email to ' + to;
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
  // Then initialize fallback chat UI / safe API
      // contact form handler (if present)
      initContactForm();
  initChatUI();
});
