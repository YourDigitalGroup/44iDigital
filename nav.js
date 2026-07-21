// nav.js — burger toggle for tablet/mobile nav
(function () {
  const burgers = document.querySelectorAll('[data-nav-burger]');
  if (!burgers.length) return;
  function closeAll() {
    document.querySelectorAll('nav.top.nav-open').forEach(n => n.classList.remove('nav-open'));
    burgers.forEach(b => b.setAttribute('aria-expanded', 'false'));
  }
  burgers.forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const n = b.closest('nav.top');
      if (!n) return;
      const open = !n.classList.contains('nav-open');
      n.classList.toggle('nav-open', open);
      b.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav.top')) closeAll();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
  // Close drawer when a link in it is tapped
  document.querySelectorAll('nav.top ul a, nav.top .dropdown-inner a').forEach(a => {
    a.addEventListener('click', () => {
      if (a.closest('nav.top.nav-open')) setTimeout(closeAll, 50);
    });
  });
})();

// Reveal sticky illustrations on scroll (persona pages)
(function () {
  const arts = document.querySelectorAll('.legacy-art.scroll-art');
  if (!arts.length || !('IntersectionObserver' in window)) {
    arts.forEach(a => a.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  arts.forEach(a => io.observe(a));
})();


// FAQ accordion (.faq-q buttons) — one open at a time per group
(function () {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const group = btn.closest('.faqs') && btn.closest('.faq-item') && btn.closest('.faq-item').parentElement;
      if (group) {
        group.querySelectorAll(':scope > .faq-item > .faq-q[aria-expanded="true"]').forEach(b => {
          if (b !== btn) b.setAttribute('aria-expanded', 'false');
        });
      }
      btn.setAttribute('aria-expanded', String(!expanded));
      const sign = btn.querySelector('.faq-sign');
      if (sign) sign.textContent = expanded ? '+' : '−';
    });
  });
})();

// ── Cookie consent banner ──────────────────────────────────────────────────
// Gates one third-party script (processwebsitedata) behind consent. Default
// is opt-out, not opt-in: the visitor has a 5-second window to decline, and
// if they don't (or they click Accept), the script loads. A stored decision
// is remembered so the banner never reappears once answered.
(function () {
  var CONSENT_KEY = '44i_cookie_consent';   // localStorage value: 'accepted' | 'declined'
  var GATE_MS = 5000;
  var GATED_SRC = 'https://data.processwebsitedata.com/cscripts/CKS1vytzZR-dd6078b8.js';

  function loadGatedScript() {
    if (document.querySelector('script[src="' + GATED_SRC + '"]')) return; // never inject twice
    var s = document.createElement('script');
    s.src = GATED_SRC;
    document.body.appendChild(s);
  }

  var stored = null;
  try { stored = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  if (stored === 'accepted') { loadGatedScript(); return; }
  if (stored === 'declined') { return; }

  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  function buildBanner() {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;'
      + 'background:#2c4863;color:#fff;font-family:Manrope,system-ui,sans-serif;'
      + 'padding:18px 24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;'
      + 'gap:16px 24px;box-shadow:0 -8px 24px rgba(0,0,0,.18);'
      + 'transform:translateY(100%);transition:transform .35s ease;';
    bar.innerHTML =
      '<p style="margin:0;font-size:14px;line-height:1.5;color:rgba(255,255,255,.9);max-width:640px;flex:1 1 320px">'
      + 'We use cookies to improve your experience and understand how our site is used. '
      + 'You can accept or decline &mdash; if you don&rsquo;t choose within a few seconds, we&rsquo;ll assume that&rsquo;s okay.'
      + '</p>'
      + '<div style="display:flex;gap:10px;flex:0 0 auto">'
      + '<button type="button" data-consent="decline" style="background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.5);'
      + 'border-radius:999px;padding:10px 20px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer">Decline</button>'
      + '<button type="button" data-consent="accept" style="background:#629ad0;color:#fff;border:none;'
      + 'border-radius:999px;padding:10px 22px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer">Accept</button>'
      + '</div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.style.transform = 'none'; });

    function dismiss() {
      bar.style.transform = 'translateY(100%)';
      setTimeout(function () { bar.remove(); }, 400);
    }

    var timer = setTimeout(function () {   // no response in time -> implicit accept
      saveConsent('accepted');
      loadGatedScript();
      dismiss();
    }, GATE_MS);

    bar.querySelector('[data-consent="accept"]').addEventListener('click', function () {
      clearTimeout(timer);
      saveConsent('accepted');
      loadGatedScript();
      dismiss();
    });
    bar.querySelector('[data-consent="decline"]').addEventListener('click', function () {
      clearTimeout(timer);
      saveConsent('declined');
      dismiss();
    });
  }

  if (document.body) buildBanner();
  else document.addEventListener('DOMContentLoaded', buildBanner);
})();
