/* ══════════════════════════════════════════════════════════════════════════
   WILLOW — 44i Digital Partner Program chat guide
   ──────────────────────────────────────────────────────────────────────────
   A self-contained, dependency-free "form that looks like a chat bot".
   Willow walks visitors through the partner-qualification tree, collects
   contact details, and submits everything through the Fourge CMS form
   endpoint (admin/api.php → send_form), which:
     • stores the conversation in Forms → Entries (data/entries.json)
     • emails the submission to the site's notify address
     • pushes the visitor into GoHighLevel as a lead (when GHL is configured
       in Settings — token + Location ID)

   EMBED — paste one of these with the CMS embed-code feature
   (Site → Plugins for every page, or an embed/code block on a single page):

     Floating chat bubble (bottom-right, recommended for all pages):
       <script src="/willow.js" defer></script>

     Inline (renders in place inside the page):
       <div data-willow-inline></div>
       <script src="/willow.js" defer></script>

   AVATAR — upload Willow's headshot through CMS → Media as  willow.jpg
   (site root). Until the photo exists the widget shows a built-in monogram
   avatar, so nothing breaks.

   CUSTOMIZE — either edit the CONFIG block below, or define overrides
   BEFORE the script tag:
       <script>window.WILLOW_CONFIG={accent:'#629ad0'};</script>
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__WILLOW_LOADED__) return;   // ignore a second include on the same page
  window.__WILLOW_LOADED__ = true;

  /* ────────────────────────────────────────────────────────────────────────
     CONFIG + QUESTION TREE  (edit freely — this is the whole conversation)
     Node types:
       say    — Willow talks, then moves to `next`
       choice — one-tap answer buttons; each option has its own `next`
       multi  — pick-all-that-apply chips + a Continue button; single `next`
       text / email / phone — free-typed answer (validated), then `next`
       submit — sends everything to the CMS, then shows `messages`
       end    — closing messages (+ optional link buttons); nothing is sent
     `saveAs` is the label used in the email / entry / GHL note.
     `{outcome}` and `{firstName}` inside messages are replaced live.
     ──────────────────────────────────────────────────────────────────────── */
  var DEFAULTS = {
    name: 'Willow',
    tagline: 'Partner Program Guide · 44i Digital',
    avatar: 'willow.jpg',                    // site-root relative or full URL
    api: '/admin/api.php',                   // Fourge CMS endpoint
    formId: 'willow-partner-bot',            // groups entries under Forms
    subject: 'New Willow Chat Lead',         // email subject prefix
    phone: '605-271-7321',   // 44i Digital direct — NOT the 44i.com consumer line (605-334-4464), which only appears in the DTC redirect below
    accent: '#629ad0',                       // 44i Digital brand primary (blue)
    dark: '#2c4863',                         // 44i Digital brand secondary (navy)
    mode: 'auto',                            // 'bubble' | 'inline' | 'auto'
    teaser: 'Hi! Exploring a 44i partnership? I can help.',
    recaptchaSiteKey: '',                    // set only if site enforces reCAPTCHA v3
    start: 'hello',
    tree: {
      hello: { type: 'say', messages: [
        "Hi there — I'm Willow 👋",
        "I help agencies, broadcasters, publishers and other media organizations explore the 44i Digital Partner Program. A few quick questions and I'll point you to the right next step."
      ], next: 'q1' },

      q1: { type: 'choice', saveAs: 'Organization type',
        message: 'What best describes your organization?',
        options: [
          { label: 'Advertising / Marketing Agency', next: 'q2' },
          { label: 'Radio / TV Group', next: 'q2' },
          { label: 'Newspaper / Media Publisher', next: 'q2' },
          { label: 'Outdoor Advertising Company', next: 'q2' },
          { label: 'Other Business Serving Advertisers', next: 'q2' },
          { label: 'I need marketing for my own business', next: 'dtc' }
        ] },

      /* Direct-to-consumer redirect — 44i Digital is partner-only */
      dtc: { type: 'end', messages: [
        "Thanks for letting me know! 44i Digital works exclusively through partner organizations — agencies, media groups and publishers.",
        "For websites or digital marketing for your own business, our sister company 44i would love to help:"
      ], links: [
        { label: 'Visit 44i.com', url: 'https://www.44i.com' },
        { label: 'Call 605-334-4464', url: 'tel:16053344464' }
      ] },

      q2: { type: 'choice', saveAs: 'Primary goal',
        message: 'What are you hoping to accomplish?',
        options: [
          { label: 'Launch a digital program', next: 'q2a', outcome: 'Launch a Complete Digital Program' },
          { label: 'Expand our current offering', next: 'q2b', outcome: 'Expand Your Capabilities' },
          { label: 'Replace our current fulfillment partner', next: 'q2c', outcome: 'Evaluate a New Fulfillment Partnership' },
          { label: 'Improve support, margins or scalability', next: 'q2d', outcome: 'Explore the 44i Partner Program' },
          { label: 'Explore whether 44i is a fit', next: 'q2e', outcome: 'Explore the 44i Partner Program' }
        ] },

      q2a: { type: 'multi', saveAs: 'What has prevented you from launching?',
        message: 'What has prevented you from launching? Pick all that apply.',
        options: ['No fulfillment resources', 'Sales team needs training', 'Need products / pricing / proposals', 'Need a complete program'],
        next: 'q3' },
      q2b: { type: 'multi', saveAs: 'Capabilities to add',
        message: 'Which capabilities do you want to add? Pick all that apply.',
        options: ['Website + search solutions', 'Social + content marketing', 'Paid search + paid social', 'Programmatic + streaming', 'Broader digital suite'],
        next: 'q3' },
      q2c: { type: 'multi', saveAs: 'Reason for considering a change',
        message: 'Why are you considering a change? Pick all that apply.',
        options: ['Poor communication', 'Inconsistent fulfillment', 'Low margins', 'Limited capabilities', 'Not flexible'],
        next: 'q3' },
      q2d: { type: 'multi', saveAs: 'Where improvement is needed most',
        message: 'Where do you need the most improvement? Pick all that apply.',
        options: ['Sales support + training', 'Campaign fulfillment', 'Partner communication', 'Reporting + client materials', 'Profitability + scale'],
        next: 'q3' },
      q2e: { type: 'multi', saveAs: 'Wants to learn about',
        message: 'What would you most like to learn about? Pick all that apply.',
        options: ['How the partnership works', 'Available products', 'Training + sales support', 'Pricing + margins', 'Onboarding'],
        next: 'q3' },

      q3: { type: 'choice', saveAs: 'Digital program maturity',
        message: 'How established is your digital program today?',
        options: [
          { label: "We haven't launched one yet", next: 'q4' },
          { label: 'We offer a few digital products', next: 'q4' },
          { label: 'We have an established program', next: 'q4' },
          { label: 'We manage a large digital operation', next: 'q4' }
        ] },

      q4: { type: 'choice', saveAs: 'Sellers / account executives',
        message: 'Approximately how many sellers or account executives would participate?',
        options: [
          { label: '1–5', next: 'q5' },
          { label: '6–15', next: 'q5' },
          { label: '16–50', next: 'q5' },
          { label: '50+', next: 'q5' },
          { label: 'Not sure yet', next: 'q5' }
        ] },

      q5: { type: 'choice', saveAs: 'Timeline',
        message: 'When are you hoping to move forward?',
        options: [
          { label: 'As soon as possible', next: 'contactIntro' },
          { label: 'Within 1–3 months', next: 'contactIntro' },
          { label: 'Within 3–6 months', next: 'contactIntro' },
          { label: "We're researching for now", next: 'contactIntro' }
        ] },

      contactIntro: { type: 'say', messages: [
        "Perfect — based on what you've shared, your best next step is: {outcome}.",
        'Let me grab a few quick details so our partner team can schedule a conversation with you.'
      ], next: 'cName' },

      cName:    { type: 'text',  saveAs: 'Name',    message: "What's your name?", placeholder: 'First and last name', next: 'cCompany' },
      cCompany: { type: 'text',  saveAs: 'Company', message: 'And your company or organization?', placeholder: 'Company name', next: 'cEmail' },
      cEmail:   { type: 'email', saveAs: 'Email',   message: 'What email should we use to reach you?', placeholder: 'you@company.com', next: 'cPhone' },
      cPhone:   { type: 'phone', saveAs: 'Phone',   message: 'And the best phone number? Partner conversations usually start with a quick call.', placeholder: '(555) 555-5555', next: 'cQuestions' },

      /* Open-ended: whatever the visitor types lands in the email, the entry,
         and the GHL note. `skipLabel` renders a quick-reply chip so answering
         is optional. */
      cQuestions: { type: 'text', saveAs: 'Questions for the team',
        message: "Last one, {firstName} — is there anything you'd like to ask about the program, our products, or how the partnership works? Type anything; I'll make sure the team covers it in your conversation.",
        placeholder: 'Ask me anything…',
        skipLabel: 'No questions right now',
        next: 'finish' },

      finish: { type: 'submit', messages: [
        'Thank you, {firstName}! ✅',
        "I've passed everything along to our partner team.",
        'Want to lock in a time right now? Grab a spot on our calendar — or if you prefer, the team will reach out shortly to schedule your partner conversation.'
      ], links: [
        { label: 'Schedule your partner conversation', url: 'https://api.leadconnectorhq.com/widget/bookings/44idigitalcalendar' },
        { label: 'Call 605-271-7321', url: 'tel:16052717321' }
      ] }
    }
  };

  var C = merge(DEFAULTS, window.WILLOW_CONFIG || {});

  function merge(base, over) {
    var out = {};
    for (var k in base) out[k] = base[k];
    for (var j in over) {
      if (j === 'tree' && over.tree) { out.tree = {}; for (var t in base.tree) out.tree[t] = base.tree[t]; for (var u in over.tree) out.tree[u] = over.tree[u]; }
      else out[j] = over[j];
    }
    return out;
  }

  /* ── state ─────────────────────────────────────────────────────────────── */
  // sessionStorage can throw (private mode, sandboxed/opaque origins) — never
  // let that break the widget.
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  var STORE_KEY = 'willow-chat-v1';
  var state = { node: null, answers: [], outcome: '', log: [], done: false, open: false };
  try {
    var saved = ssGet(STORE_KEY);
    if (saved) { var s = JSON.parse(saved); if (s && s.log) state = s; }
  } catch (e) { /* corrupted state — start fresh */ }

  function persist() { ssSet(STORE_KEY, JSON.stringify(state)); }

  function firstName() {
    for (var i = 0; i < state.answers.length; i++)
      if (state.answers[i][0] === 'Name') return String(state.answers[i][1]).split(/\s+/)[0];
    return 'there';
  }
  function fill(msg) {
    return String(msg)
      .replace(/\{outcome\}/g, state.outcome || 'the 44i Partner Program')
      .replace(/\{firstName\}/g, firstName())
      .replace(/\{phone\}/g, C.phone);
  }

  /* ── styles ────────────────────────────────────────────────────────────── */
  // Manrope is 44idigital.com's site font — used when the page loads it,
  // with system fallbacks everywhere else.
  var FONT = "'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif";
  var CSS = ''
    + ':root{--wlw-accent:' + C.accent + ';--wlw-dark:' + C.dark + '}'
    + '.wlw-hidden{display:none !important}'
    + 'html.wlw-noscroll,html.wlw-noscroll body{overflow:hidden !important}'
    + '.wlw-launch{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:64px;height:64px;border-radius:50%;border:none;cursor:pointer;padding:0;background:var(--wlw-dark);box-shadow:0 8px 28px rgba(44,72,99,.35);transition:transform .15s ease}'
    + '.wlw-launch:hover{transform:scale(1.06)}'
    + '.wlw-launch img,.wlw-launch svg{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;border:3px solid var(--wlw-accent);box-sizing:border-box}'
    + '.wlw-launch .wlw-dot{position:absolute;right:2px;top:2px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff}'
    + '.wlw-teaser{position:fixed;right:96px;bottom:34px;z-index:2147483000;background:#fff;color:#2c4863;font:500 13.5px/1.45 ' + FONT + ';padding:12px 14px;border-radius:14px 14px 4px 14px;box-shadow:0 10px 30px rgba(44,72,99,.22);max-width:240px;cursor:pointer}'
    + '.wlw-teaser b{color:var(--wlw-accent)}'
    + '.wlw-teaser .wlw-x{position:absolute;top:-8px;left:-8px;width:20px;height:20px;border-radius:50%;background:#334;color:#fff;border:none;font-size:11px;line-height:20px;text-align:center;cursor:pointer;padding:0}'
    /* color + color-scheme are pinned so a dark-themed host page can never
       restyle the chat's text or form controls into invisibility */
    + '.wlw-panel{position:fixed;right:20px;bottom:96px;z-index:2147483001;width:390px;max-width:calc(100vw - 24px);height:640px;max-height:calc(100vh - 120px);display:flex;flex-direction:column;background:#f6f6f8;color:#2c4863;color-scheme:light;border-radius:18px;overflow:hidden;box-shadow:0 24px 70px rgba(44,72,99,.35);font-family:' + FONT + ';opacity:0;transform:translateY(14px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .2s ease}'
    + '.wlw-panel.wlw-open{opacity:1;transform:none;pointer-events:auto}'
    + '.wlw-inline .wlw-panel{position:static;width:100%;max-width:520px;height:640px;margin:0 auto;opacity:1;transform:none;pointer-events:auto;box-shadow:0 12px 44px rgba(44,72,99,.18)}'
    /* Mobile = a texting app: the panel takes the whole screen and slides up
       from the bottom like a native messages view. */
    + '@media(max-width:640px){'
    +   '.wlw-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh;border-radius:0;transform:translateY(100%);transition:transform .28s cubic-bezier(.4,0,.2,1),opacity .2s ease}'
    +   '.wlw-panel.wlw-open{transform:none}'
    +   '.wlw-panel.wlw-open~.wlw-launch,.wlw-panel.wlw-open~.wlw-teaser{display:none}'
    + '}'
    /* Fullscreen promotion for the INLINE embed on mobile (added on first tap) */
    + '.wlw-fs .wlw-panel{position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;border-radius:0;z-index:2147483001;transform:none;transition:none}'
    + '.wlw-head{display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--wlw-dark);color:#fff;flex:0 0 auto}'
    + '.wlw-head .wlw-av{position:relative;width:44px;height:44px;flex:0 0 44px}'
    + '.wlw-head .wlw-av img,.wlw-head .wlw-av svg{width:44px;height:44px;border-radius:50%;object-fit:cover;display:block;border:2px solid var(--wlw-accent);box-sizing:border-box}'
    + '.wlw-head .wlw-av .wlw-dot{position:absolute;right:0;bottom:0;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid var(--wlw-dark)}'
    + '.wlw-head .wlw-who{min-width:0;flex:1}'
    + '.wlw-head .wlw-name{font-size:16px;font-weight:700;line-height:1.2}'
    + '.wlw-head .wlw-sub{font-size:11.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'
    + '.wlw-head button{background:none;border:none;color:#fff;opacity:.7;cursor:pointer;font-size:16px;padding:6px;line-height:1}'
    + '.wlw-head button:hover{opacity:1}'
    + '.wlw-body{flex:1 1 auto;overflow-y:auto;padding:18px 14px 8px;scroll-behavior:smooth;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}'
    + '.wlw-row{display:flex;gap:8px;margin:0 0 12px;align-items:flex-end;animation:wlwIn .25s ease}'
    + '@keyframes wlwIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'
    + '.wlw-row .wlw-mav{width:28px;height:28px;flex:0 0 28px}'
    + '.wlw-row .wlw-mav img,.wlw-row .wlw-mav svg{width:28px;height:28px;border-radius:50%;object-fit:cover;display:block}'
    + '.wlw-msg{max-width:80%;padding:10px 14px;border-radius:18px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}'
    + '.wlw-bot .wlw-msg{background:#fff;color:#2c4863;border-bottom-left-radius:4px;box-shadow:0 1px 3px rgba(44,72,99,.08)}'
    + '.wlw-user{justify-content:flex-end}'
    + '.wlw-user .wlw-msg{background:var(--wlw-accent);color:#fff;border-bottom-right-radius:4px}'
    + '.wlw-typing{display:inline-flex;gap:5px;padding:14px 16px}'
    + '.wlw-typing i{width:8px;height:8px;border-radius:50%;background:#8499ab;animation:wlwB 1.2s infinite}'
    + '.wlw-typing i:nth-child(2){animation-delay:.2s}.wlw-typing i:nth-child(3){animation-delay:.4s}'
    + '@keyframes wlwB{0%,60%,100%{transform:none;opacity:.4}30%{transform:translateY(-5px);opacity:1}}'
    + '.wlw-opts{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 14px 36px}'
    + '.wlw-opt{background:#fff;border:1.5px solid var(--wlw-accent);color:var(--wlw-accent);border-radius:999px;padding:9px 16px;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .12s,color .12s;font-family:inherit}'
    + '.wlw-opt:hover{background:var(--wlw-accent);color:#fff}'
    + '.wlw-opt.wlw-on{background:var(--wlw-accent);color:#fff}'
    + '.wlw-opt.wlw-go{background:var(--wlw-dark);border-color:var(--wlw-dark);color:#fff}'
    + '.wlw-opt.wlw-go:disabled{opacity:.45;cursor:not-allowed}'
    + '.wlw-links{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 14px 36px}'
    + '.wlw-link{display:inline-block;background:var(--wlw-accent);color:#fff !important;text-decoration:none;border-radius:10px;padding:11px 18px;font-size:14px;font-weight:700}'
    + '.wlw-link.wlw-alt{background:#fff;color:var(--wlw-accent) !important;border:1.5px solid var(--wlw-accent)}'
    /* Message-style composer: pill input + round send button, like a texting app */
    + '.wlw-foot{flex:0 0 auto;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));background:#fff;border-top:1px solid #e6e8ec}'
    + '.wlw-inrow{display:flex;gap:8px;align-items:center}'
    + '.wlw-inrow input{flex:1;border:1.5px solid #d5dae3;border-radius:999px;padding:11px 18px;font-size:16px;font-family:inherit;outline:none;min-width:0;background:#f6f6f8;color:#2c4863;caret-color:#2c4863}'
    + '.wlw-inrow input::placeholder{color:#8499ab;opacity:1}'
    + '.wlw-inrow input:focus{border-color:var(--wlw-accent);background:#fff}'
    + '.wlw-inrow button{flex:0 0 42px;width:42px;height:42px;background:var(--wlw-accent);color:#fff;border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:transform .12s ease}'
    + '.wlw-inrow button:hover{transform:scale(1.08)}'
    + '.wlw-inrow button:disabled{opacity:.5;cursor:not-allowed}'
    + '.wlw-inrow button svg{width:18px;height:18px;display:block}'
    + '.wlw-err .wlw-msg{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}';

  /* ── avatar (photo with monogram fallback) ─────────────────────────────── */
  var MONO = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 44 44"><circle cx="22" cy="22" r="22" fill="' + C.accent + '"/><text x="22" y="29" font-family="Arial,Helvetica,sans-serif" font-size="19" font-weight="700" fill="#ffffff" text-anchor="middle">W</text></svg>';
  // Probe the headshot once; if it's missing, every later avatar renders the
  // monogram directly instead of re-requesting a 404 per message.
  var avatarOk = null;
  (function () {
    var probe = new Image();
    probe.onload = function () { avatarOk = true; };
    probe.onerror = function () { avatarOk = false; };
    probe.src = C.avatar;
  })();
  function avatarHtml() {
    if (avatarOk === false) return MONO;
    return '<img src="' + escAttr(C.avatar) + '" alt="' + escAttr(C.name) + '" onerror="this.outerHTML=this.parentNode.getAttribute(\'data-mono\')">';
  }
  function escAttr(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  /* ── DOM scaffold ──────────────────────────────────────────────────────── */
  var inlineHost = document.querySelector('[data-willow-inline]');
  var scriptEl = document.currentScript;
  var mode = C.mode !== 'auto' ? C.mode
    : (inlineHost || (scriptEl && scriptEl.getAttribute('data-willow-mode') === 'inline')) ? 'inline' : 'bubble';

  // Phone-sized viewport → the chat behaves like a native texting app:
  // full screen, page scroll locked behind it.
  var mqMobile = window.matchMedia ? window.matchMedia('(max-width:640px)') : { matches: false };
  function lockScroll(on) { try { document.documentElement.classList.toggle('wlw-noscroll', on); } catch (e) {} }

  var style = document.createElement('style');
  style.id = 'willow-css';
  style.textContent = CSS;
  document.head.appendChild(style);

  var root = document.createElement('div');
  root.id = 'willow-root';
  if (mode === 'inline') { root.className = 'wlw-inline'; (inlineHost || document.body).appendChild(root); }
  else document.body.appendChild(root);

  var panel = document.createElement('div');
  panel.className = 'wlw-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', C.name + ' chat');
  panel.innerHTML =
      '<div class="wlw-head">'
    +   '<div class="wlw-av" data-mono=\'' + MONO + '\'>' + avatarHtml() + '<span class="wlw-dot"></span></div>'
    +   '<div class="wlw-who"><div class="wlw-name">' + escAttr(C.name) + '</div><div class="wlw-sub">' + escAttr(C.tagline) + '</div></div>'
    +   '<button type="button" class="wlw-restart" title="Start over" aria-label="Start over">&#8635;</button>'
    +   (mode === 'inline' ? '<button type="button" class="wlw-min wlw-hidden" title="Minimize" aria-label="Minimize chat" style="font-size:20px">&#8964;</button>' : '')
    +   (mode === 'bubble' ? '<button type="button" class="wlw-close" title="Close" aria-label="Close chat">&#10005;</button>' : '')
    + '</div>'
    + '<div class="wlw-body" aria-live="polite"></div>'
    + '<div class="wlw-foot wlw-hidden"><div class="wlw-inrow"><input type="text" autocomplete="off">'
    +   '<button type="button" aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg></button>'
    + '</div></div>';
  root.appendChild(panel);

  var body = panel.querySelector('.wlw-body');
  var foot = panel.querySelector('.wlw-foot');
  var input = foot.querySelector('input');
  var sendBtn = foot.querySelector('button');

  var launch = null, teaser = null;
  if (mode === 'bubble') {
    launch = document.createElement('button');
    launch.type = 'button';
    launch.className = 'wlw-launch';
    launch.setAttribute('aria-label', 'Chat with ' + C.name);
    launch.setAttribute('data-mono', MONO);
    launch.innerHTML = avatarHtml() + '<span class="wlw-dot"></span>';
    root.appendChild(launch);
    launch.addEventListener('click', function () { setOpen(!state.open); });
    panel.querySelector('.wlw-close').addEventListener('click', function () { setOpen(false); });

    if (C.teaser && !state.log.length && !ssGet('willow-teaser-x')) {
      setTimeout(function () {
        if (state.open) return;
        teaser = document.createElement('div');
        teaser.className = 'wlw-teaser';
        teaser.innerHTML = '<button class="wlw-x" aria-label="Dismiss">&#10005;</button>' + escAttr(C.teaser).replace(escAttr(C.name), '<b>' + escAttr(C.name) + '</b>');
        root.appendChild(teaser);
        teaser.querySelector('.wlw-x').addEventListener('click', function (e) { e.stopPropagation(); killTeaser(); });
        teaser.addEventListener('click', function () { setOpen(true); });
      }, 2500);
    }
  }
  function killTeaser() {
    if (teaser) { teaser.remove(); teaser = null; }
    ssSet('willow-teaser-x', '1');
  }
  function setOpen(open) {
    state.open = open;
    panel.classList.toggle('wlw-open', open);
    lockScroll(open && mqMobile.matches);
    if (open) {
      killTeaser();
      if (!started) startConversation();
      scrollEnd();
    }
    persist();
  }

  // Inline embeds on mobile: the first tap into the chat promotes it to a
  // full-screen texting view; the ⌄ button in the header drops it back inline.
  if (mode === 'inline') {
    var minBtn = panel.querySelector('.wlw-min');
    var setFs = function (on) {
      root.classList.toggle('wlw-fs', on);
      lockScroll(on);
      if (minBtn) minBtn.classList.toggle('wlw-hidden', !on);
      scrollEnd();
    };
    panel.addEventListener('click', function (e) {
      if (!mqMobile.matches || root.classList.contains('wlw-fs')) return;
      if (e.target.closest && e.target.closest('.wlw-min')) return;
      setFs(true);
    });
    input.addEventListener('focus', function () {
      if (mqMobile.matches && !root.classList.contains('wlw-fs')) setFs(true);
    });
    if (minBtn) minBtn.addEventListener('click', function (e) { e.stopPropagation(); setFs(false); });
  }

  panel.querySelector('.wlw-restart').addEventListener('click', function () {
    state = { node: null, answers: [], outcome: '', log: [], done: false, open: (mode === 'inline') ? true : state.open };
    persist();
    body.innerHTML = '';
    hideInput();
    started = false;
    startConversation();
  });

  /* ── message rendering ─────────────────────────────────────────────────── */
  // Pin the newest message to the bottom. The second pass (after a frame)
  // matters: revealing the composer shrinks the message area AFTER the last
  // message already scrolled, which used to leave it hidden behind the input.
  function scrollEnd() {
    body.scrollTop = body.scrollHeight;
    requestAnimationFrame(function () { body.scrollTop = body.scrollHeight; });
  }

  function addBot(text, opts) {
    var row = document.createElement('div');
    row.className = 'wlw-row wlw-bot' + ((opts && opts.error) ? ' wlw-err' : '');
    var av = document.createElement('div');
    av.className = 'wlw-mav';
    av.setAttribute('data-mono', MONO);
    av.innerHTML = avatarHtml();
    var m = document.createElement('div');
    m.className = 'wlw-msg';
    m.textContent = text;
    row.appendChild(av); row.appendChild(m);
    body.appendChild(row);
    scrollEnd();
  }
  function addUser(text) {
    var row = document.createElement('div');
    row.className = 'wlw-row wlw-user';
    var m = document.createElement('div');
    m.className = 'wlw-msg';
    m.textContent = text;
    row.appendChild(m);
    body.appendChild(row);
    scrollEnd();
  }
  function addLinks(links) {
    var wrap = document.createElement('div');
    wrap.className = 'wlw-links';
    links.forEach(function (l, i) {
      var a = document.createElement('a');
      a.className = 'wlw-link' + (i > 0 ? ' wlw-alt' : '');
      a.href = l.url;
      if (/^https?:/i.test(l.url)) { a.target = '_blank'; a.rel = 'noopener'; }
      a.textContent = l.label;
      wrap.appendChild(a);
    });
    body.appendChild(wrap);
    scrollEnd();
  }

  var typingEl = null;
  function showTyping() {
    hideTyping();
    typingEl = document.createElement('div');
    typingEl.className = 'wlw-row wlw-bot';
    typingEl.innerHTML = '<div class="wlw-mav" data-mono=\'' + MONO + '\'>' + avatarHtml() + '</div><div class="wlw-msg wlw-typing"><i></i><i></i><i></i></div>';
    body.appendChild(typingEl);
    scrollEnd();
  }
  function hideTyping() { if (typingEl) { typingEl.remove(); typingEl = null; } }

  // Willow "types" each message: brief typing dots, then the bubble.
  function botSay(messages, done, instant) {
    var list = (Array.isArray(messages) ? messages : [messages]).map(fill);
    if (instant) { list.forEach(function (t) { addBot(t); logPush('bot', t); }); if (done) done(); return; }
    var i = 0;
    (function nextMsg() {
      if (i >= list.length) { if (done) done(); return; }
      showTyping();
      var t = list[i];
      // "Willow is typing…" — dots linger proportionally to message length
      // (with a touch of jitter) so replies feel humanly typed, capped so
      // long messages never drag.
      var delay = Math.min(600 + t.length * 11 + Math.random() * 300, 2000);
      setTimeout(function () {
        hideTyping();
        addBot(t);
        logPush('bot', t);
        i++;
        nextMsg();
      }, delay);
    })();
  }

  function logPush(who, text, extra) {
    var item = { who: who, text: text };
    if (extra) for (var k in extra) item[k] = extra[k];
    state.log.push(item);
    persist();
  }

  /* ── input bar (free-text steps) ───────────────────────────────────────── */
  var inputHandler = null;
  function showInput(node) {
    foot.classList.remove('wlw-hidden');
    input.value = '';
    input.placeholder = node.placeholder || 'Type your answer…';
    input.type = node.type === 'email' ? 'email' : (node.type === 'phone' ? 'tel' : 'text');
    // Optional questions render a skip chip alongside the open input.
    var skipWrap = null;
    if (node.skipLabel) {
      skipWrap = document.createElement('div');
      skipWrap.className = 'wlw-opts';
      var sb = document.createElement('button');
      sb.type = 'button';
      sb.className = 'wlw-opt';
      sb.textContent = node.skipLabel;
      sb.addEventListener('click', function () {
        skipWrap.remove();
        hideInput();
        addUser(node.skipLabel); logPush('user', node.skipLabel);
        saveAnswer(node.saveAs, node.skipLabel);
        go(node.next);
      });
      skipWrap.appendChild(sb);
      body.appendChild(skipWrap);
      scrollEnd();
    }
    inputHandler = function () {
      var v = input.value.trim();
      if (!v) return;
      var err = validate(node.type, v);
      if (err) {
        addUser(v); logPush('user', v);
        input.value = '';
        botSay(err);
        return;
      }
      if (skipWrap) skipWrap.remove();
      hideInput();
      addUser(v); logPush('user', v);
      saveAnswer(node.saveAs, v);
      go(node.next);
    };
    scrollEnd();   // the composer just appeared and shrank the message area
    setTimeout(function () { input.focus(); }, 150);
  }
  function hideInput() { foot.classList.add('wlw-hidden'); inputHandler = null; }
  // Mobile keyboards resize the panel on focus — re-pin after they settle.
  input.addEventListener('focus', function () { setTimeout(scrollEnd, 250); });
  sendBtn.addEventListener('click', function () { if (inputHandler) inputHandler(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && inputHandler) { e.preventDefault(); inputHandler(); } });

  function validate(type, v) {
    if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return "Hmm, that doesn't look like a valid email — mind double-checking it?";
    if (type === 'phone' && (v.replace(/\D/g, '').length < 7 || v.replace(/\D/g, '').length > 15))
      return "That phone number doesn't look quite right — could you re-enter it?";
    return '';
  }

  function saveAnswer(label, value) {
    if (!label) return;
    for (var i = 0; i < state.answers.length; i++)
      if (state.answers[i][0] === label) { state.answers[i][1] = value; persist(); return; }
    state.answers.push([label, value]);
    persist();
  }

  /* ── the state machine ─────────────────────────────────────────────────── */
  function go(nodeId, instant) {
    var node = C.tree[nodeId];
    if (!node) { console.warn('Willow: unknown node "' + nodeId + '"'); return; }
    state.node = nodeId;
    persist();

    if (node.type === 'say') {
      botSay(node.messages, function () { go(node.next); }, instant);
      return;
    }

    if (node.type === 'choice') {
      botSay(node.message, function () { renderChoices(node); }, instant);
      return;
    }

    if (node.type === 'multi') {
      botSay(node.message, function () { renderMulti(node); }, instant);
      return;
    }

    if (node.type === 'text' || node.type === 'email' || node.type === 'phone') {
      botSay(node.message, function () { showInput(node); }, instant);
      return;
    }

    if (node.type === 'submit') {
      submitLead(node);
      return;
    }

    if (node.type === 'end') {
      botSay(node.messages, function () {
        if (node.links) { addLinks(node.links); logPush('bot', '', { links: node.links }); }
        state.done = true;
        persist();
      }, instant);
      return;
    }
  }

  function renderChoices(node) {
    var wrap = document.createElement('div');
    wrap.className = 'wlw-opts';
    node.options.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wlw-opt';
      b.textContent = o.label;
      b.addEventListener('click', function () {
        wrap.remove();
        addUser(o.label); logPush('user', o.label);
        saveAnswer(node.saveAs, o.label);
        if (o.outcome) { state.outcome = o.outcome; saveAnswer('Recommended path', o.outcome); persist(); }
        go(o.next);
      });
      wrap.appendChild(b);
    });
    body.appendChild(wrap);
    scrollEnd();
  }

  function renderMulti(node) {
    var wrap = document.createElement('div');
    wrap.className = 'wlw-opts';
    var picked = [];
    var goBtn = document.createElement('button');
    node.options.forEach(function (label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'wlw-opt';
      b.textContent = label;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        var i = picked.indexOf(label);
        if (i >= 0) picked.splice(i, 1); else picked.push(label);
        b.classList.toggle('wlw-on', i < 0);
        b.setAttribute('aria-pressed', i < 0 ? 'true' : 'false');
        goBtn.disabled = !picked.length;
      });
      wrap.appendChild(b);
    });
    goBtn.type = 'button';
    goBtn.className = 'wlw-opt wlw-go';
    goBtn.textContent = 'Continue →';
    goBtn.disabled = true;
    goBtn.addEventListener('click', function () {
      if (!picked.length) return;
      var v = picked.join(', ');
      wrap.remove();
      addUser(v); logPush('user', v);
      saveAnswer(node.saveAs, v);
      go(node.next);
    });
    wrap.appendChild(goBtn);
    body.appendChild(wrap);
    scrollEnd();
  }

  /* ── submission → Fourge CMS (entry + email + GoHighLevel) ─────────────── */
  function collectFields() {
    // Contact info first so GHL's name/email/phone detection sees them early,
    // then the qualification answers in the order they were given.
    var order = ['Name', 'Company', 'Email', 'Phone'];
    var fields = {};
    order.forEach(function (k) {
      state.answers.forEach(function (a) { if (a[0] === k) fields[k] = a[1]; });
    });
    state.answers.forEach(function (a) { if (order.indexOf(a[0]) < 0) fields[a[0]] = a[1]; });
    return fields;
  }

  function recaptchaToken(cb) {
    if (!C.recaptchaSiteKey) { cb(''); return; }
    var run = function () {
      try {
        window.grecaptcha.ready(function () {
          window.grecaptcha.execute(C.recaptchaSiteKey, { action: 'submit' }).then(cb, function () { cb(''); });
        });
      } catch (e) { cb(''); }
    };
    if (window.grecaptcha) { run(); return; }
    var s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js?render=' + encodeURIComponent(C.recaptchaSiteKey);
    s.onload = run;
    s.onerror = function () { cb(''); };
    document.head.appendChild(s);
  }

  // Closing beat after a successful submit: thanks + the booking-calendar
  // link buttons, so the visitor can schedule on the spot.
  function finishUp(node) {
    botSay(node.messages, function () {
      if (node.links) { addLinks(node.links); logPush('bot', '', { links: node.links }); }
    });
  }

  function submitLead(node) {
    if (state.done) { finishUp(node); return; }
    showTyping();
    recaptchaToken(function (token) {
      var payload = {
        action: 'send_form',
        formId: C.formId,
        fields: collectFields(),
        subject: C.subject + (state.outcome ? ' — ' + state.outcome : ''),
        siteUrl: location.href,
        recaptcha: token
      };
      var req = (window.fetch)
        ? fetch(C.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && !d.error, err: d.error }; }); })
        : Promise.reject(new Error('unsupported browser'));
      req.then(function (res) {
        hideTyping();
        if (!res.ok) throw new Error(res.err || 'send failed');
        state.done = true;
        persist();
        finishUp(node);
      }).catch(function () {
        hideTyping();
        addBot("I'm so sorry — something went wrong sending your details. Please try again, or call us directly at " + C.phone + '.');
        var wrap = document.createElement('div');
        wrap.className = 'wlw-opts';
        var retry = document.createElement('button');
        retry.type = 'button';
        retry.className = 'wlw-opt';
        retry.textContent = 'Try again';
        retry.addEventListener('click', function () { wrap.remove(); submitLead(node); });
        wrap.appendChild(retry);
        body.appendChild(wrap);
        scrollEnd();
      });
    });
  }

  /* ── boot / restore ────────────────────────────────────────────────────── */
  var started = false;
  function startConversation() {
    if (started) return;
    started = true;
    if (state.log.length) { restore(); return; }
    go(C.start);
  }

  function restore() {
    state.log.forEach(function (item) {
      if (item.who === 'user') addUser(item.text);
      else if (item.links) addLinks(item.links);
      else addBot(item.text);
    });
    // Re-arm the pending step (its prompt is already in the transcript).
    var node = state.node ? C.tree[state.node] : null;
    if (!node || state.done) return;
    if (node.type === 'choice') renderChoices(node);
    else if (node.type === 'multi') renderMulti(node);
    else if (node.type === 'text' || node.type === 'email' || node.type === 'phone') showInput(node);
    else if (node.type === 'say') go(node.next);
    else if (node.type === 'submit') submitLead(node);
    scrollEnd();
  }

  if (mode === 'inline') { state.open = true; startConversation(); }
  else if (state.open) setOpen(true);
})();
