# Willow — 44i Digital Partner Program chat bot

Willow is a smart-form chat bot (`willow.js`, site root). She walks visitors
through the partner-qualification tree — organization type → goals → follow-up
→ program maturity → seller count → timeline — then collects **name, company,
email and phone**, asks an open-ended "anything you'd like to ask about the
program?" (free text, with a skip chip), and submits everything through the CMS.

It's a plain form under the hood: no AI, no external services, no dependencies.
Every conversation path is defined in the question tree inside `willow.js`.

## What happens on submit

Willow posts to `admin/api.php` → `send_form`, the same pipeline as every CMS
form, so each completed conversation is:

1. **Recorded** — stored in `data/entries.json`; shows in the admin under
   **Forms → willow-partner-bot** entries.
2. **Emailed** — the full Q&A transcript goes to the site's notify address
   (SMTP or Mailgun, whichever is configured in Settings).
3. **Pushed to GoHighLevel** — the visitor is upserted as a contact/lead with
   tags `Website Lead` + the form name, and the full transcript attached as a
   note. Requires GHL to be enabled in **Settings** (Private Integration Token
   + Location ID) — already supported by the CMS, nothing new to configure.

The email subject includes the recommended path, e.g.
`New Willow Chat Lead — Evaluate a New Fulfillment Partnership`.

Visitors who answer "I need marketing for my own business" are redirected to
44i.com / 605-334-4464 (partner-only program) and **nothing is sent** — no
contact info is collected on that branch.

## Embedding

Use the CMS embed-code feature. For **every page at once**, add a plugin
(Site → Plugins → new snippet, location: body, pages: all) containing:

```html
<script src="/willow.js" defer></script>
```

That shows the floating bubble (bottom-right) with Willow's headshot, a
one-time teaser message, and the chat panel.

For an **inline** chat embedded in the flow of a single page (e.g. a
"Become a Partner" page), paste this where the bot should appear:

```html
<div data-willow-inline></div>
<script src="/willow.js" defer></script>
```

The script auto-detects the inline div; including it twice on a page is safe
(second include is ignored). `willow-demo.html` is a noindex preview page.

## Willow's headshot

Upload the headshot via **CMS → Media** as `willow.jpg` (it lands at the site
root, which is where the widget looks). Until the file exists, Willow shows a
built-in teal "W" monogram — nothing breaks. To use a different path, set
`avatar` in the config override (below).

## Customizing

Option A — edit the `DEFAULTS` block at the top of `willow.js` (name, tagline,
colors, phone, teaser text, and the entire question `tree`).

Option B — override per page without touching the file, **before** the script
tag:

```html
<script>
  window.WILLOW_CONFIG = {
    accent: '#629ad0',          // brand primary — chips, user bubbles, send
    dark:   '#2c4863',          // brand secondary — header + launcher
    teaser: 'Questions about partnering with 44i?',
    avatar: 'images/willow.jpg' // if you keep media in a folder
  };
</script>
<script src="/willow.js" defer></script>
```

Defaults match 44idigital.com's palette (`#629ad0` / `#2c4863`) and use the
site's Manrope font when the page loads it.

### Editing the question tree

The tree is a map of nodes in `willow.js` (`DEFAULTS.tree`), heavily commented
in the file. Node types:

| type | behavior |
|---|---|
| `say` | Willow speaks `messages`, then goes to `next` |
| `choice` | one-tap buttons; each option carries its own `next` (this is the branching) |
| `multi` | pick-all-that-apply chips + Continue; one shared `next` |
| `text` / `email` / `phone` | typed answer with validation, then `next`; add `skipLabel` to make it optional (renders a skip chip beside the input) |
| `submit` | sends everything to the CMS, then speaks `messages` and shows optional `links` buttons (used for the GHL booking calendar — `https://api.leadconnectorhq.com/widget/bookings/44idigitalcalendar` — so the visitor can schedule on the spot) |
| `end` | closing messages + optional link buttons; sends nothing |

`saveAs` on a node is the label used in the email/entry/GHL note. An option's
`outcome` sets the "Recommended path" (used in the `{outcome}` message
placeholder and the email subject). `{firstName}` and `{phone}` are also
substituted in messages.

## Behavior notes

- Progress persists in `sessionStorage`, so navigating between pages mid-chat
  keeps the conversation; it resets when the browser tab closes.
- Answers are validated (email format, phone length) conversationally.
- If the site enforces reCAPTCHA v3 on forms, set
  `WILLOW_CONFIG.recaptchaSiteKey` so submissions pass verification.
- If the submit fails (network, server), Willow apologizes, offers a retry
  button, and gives the phone number as a fallback.
- Willow shows animated typing dots before each reply, paced to message
  length, so the conversation feels naturally typed.
- Mobile (≤ 640px) feels like a texting app: opening the bubble slides the
  chat up full-screen and locks page scroll; tapping into an inline embed
  promotes it to full-screen too (the ⌄ header button drops it back inline).
