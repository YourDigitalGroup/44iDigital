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

// ── Remove stray legacy widgets baked into published pages ──────────────────
// Two things can end up sitting in a published page as plain static markup,
// independent of any JS that runs afterward: old LeadConnector <chat-widget>
// embeds (custom code pasted more than once over time), and our own retired
// cookie-consent button/card — removed from this file, but a page publish
// had already snapshotted its rendered output directly into the page HTML,
// so deleting the code here doesn't remove a copy already baked into a page.
// Strip both the moment they appear — already in the DOM on load, or
// inserted later by an async script — rather than track down every page.
(function () {
  var SELECTOR = 'chat-widget, [aria-label="Cookie preferences"]';
  function purge(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll(SELECTOR).forEach(function (el) { el.remove(); });
  }
  purge(document);
  if (!('MutationObserver' in window)) return;
  new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches(SELECTOR)) node.remove();
        else purge(node);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });
})();
