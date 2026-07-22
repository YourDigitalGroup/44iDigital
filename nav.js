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

// ── Cookie consent widget ───────────────────────────────────────────────────
// Gates one third-party script (processwebsitedata) behind consent. Default
// is opt-out, not opt-in: on a first visit the visitor has a 5-second window
// to decline, and if they don't (or they click Accept), the script loads.
// A compact card in the bottom-left (out of Willow's way in the bottom-right)
// rather than a full-width bar, and a small round tab persists after any
// decision so consent can always be revisited — clicking it reopens the same
// card, no timer this time since it's a deliberate revisit, not a first
// encounter. Switching from Accept to Decline after the script already ran
// this pageview can only stop it from loading on future visits — a page
// already holding an executing script can't have that undone client-side.
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
  function getStored() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  }
  function saveConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); } catch (e) {}
  }

  var stored = getStored();
  if (stored === 'accepted') loadGatedScript();

  function init() {
    var card = null, tab = null, timer = null;

    function buildTab() {
      tab = document.createElement('button');
      tab.type = 'button';
      tab.setAttribute('aria-label', 'Cookie preferences');
      tab.title = 'Cookie preferences';
      tab.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147482999;'
        + 'width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;padding:0;'
        + 'background:#2c4863;box-shadow:0 4px 14px rgba(0,0,0,.2);'
        + 'display:flex;align-items:center;justify-content:center;'
        + 'opacity:0;transform:scale(.7);transition:opacity .25s ease,transform .25s ease;';
      tab.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
        + '<path d="M21 12.5c-1.3 0-2.5-1-2.5-2.5 0-.4.1-.8.2-1.1-.3.1-.6.1-.9.1-1.4 0-2.5-1.1-2.5-2.5 0-.6.2-1.1.5-1.5-.3 0-.6.1-.9.1A2.5 2.5 0 0112.4 3c.1 0 .1 0 .2 0A9 9 0 1021 12.5z"/>'
        + '<circle cx="8.5" cy="11.5" r=".8" fill="#fff"/><circle cx="12" cy="15.5" r=".8" fill="#fff"/><circle cx="15" cy="10.5" r=".8" fill="#fff"/>'
        + '</svg>';
      tab.addEventListener('click', function () { openCard(true); });
      document.body.appendChild(tab);
    }
    function showTab() {
      if (!tab) buildTab();
      requestAnimationFrame(function () { tab.style.opacity = '1'; tab.style.transform = 'none'; });
    }

    function closeCard() {
      if (!card) return;
      card.style.opacity = '0';
      card.style.transform = 'translateY(8px) scale(.98)';
      setTimeout(function () { if (card) { card.remove(); card = null; } }, 220);
      showTab();
    }

    function openCard(isRevisit) {
      if (card) return;
      if (tab) { tab.style.opacity = '0'; tab.style.transform = 'scale(.7)'; }
      card = document.createElement('div');
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'Cookie preferences');
      card.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483000;width:300px;max-width:calc(100vw - 32px);'
        + 'background:rgba(44,72,99,.96);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);'
        + 'color:#fff;font-family:Manrope,system-ui,sans-serif;border-radius:14px;'
        + 'padding:16px 18px;box-shadow:0 10px 32px rgba(0,0,0,.22);'
        + 'opacity:0;transform:translateY(8px) scale(.98);transition:opacity .25s ease,transform .25s ease;';
      card.innerHTML =
        '<button type="button" data-consent="close" aria-label="Close" style="position:absolute;top:10px;right:10px;'
        + 'background:none;border:none;color:rgba(255,255,255,.55);font-size:15px;line-height:1;cursor:pointer;padding:4px">&times;</button>'
        + '<p style="margin:0 0 12px;padding-right:16px;font-size:12.5px;line-height:1.5;color:rgba(255,255,255,.88)">'
        + 'We use cookies to improve your experience and understand site usage. '
        + (isRevisit ? 'Update your preference below.' : 'Choose below, or we&rsquo;ll assume that&rsquo;s okay in a few seconds.')
        + '</p>'
        + '<div style="display:flex;gap:8px">'
        + '<button type="button" data-consent="decline" style="flex:1;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.4);'
        + 'border-radius:999px;padding:8px 10px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer">Decline</button>'
        + '<button type="button" data-consent="accept" style="flex:1;background:#629ad0;color:#fff;border:none;'
        + 'border-radius:999px;padding:8px 10px;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">Accept</button>'
        + '</div>';
      document.body.appendChild(card);
      requestAnimationFrame(function () { card.style.opacity = '1'; card.style.transform = 'none'; });

      if (!isRevisit) {
        timer = setTimeout(function () {   // no response in time -> implicit accept
          saveConsent('accepted');
          loadGatedScript();
          closeCard();
        }, GATE_MS);
      }

      card.querySelector('[data-consent="accept"]').addEventListener('click', function () {
        clearTimeout(timer);
        saveConsent('accepted');
        loadGatedScript();
        closeCard();
      });
      card.querySelector('[data-consent="decline"]').addEventListener('click', function () {
        clearTimeout(timer);
        saveConsent('declined');
        closeCard();
      });
      card.querySelector('[data-consent="close"]').addEventListener('click', closeCard);
    }

    if (stored === null) openCard(false);
    else showTab();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
