# Fourge CMS Template

This is the base template for all Fourge sites. Every new client site is created from this repo — it contains the CMS, renderer, and blank starter data.

## Quick start for a new site

1. Use **Site Factory → New Repository** inside any existing Fourge CMS to create a new repo from this template
2. Add 4 GitHub Actions secrets to the new repo (Settings → Secrets → Actions):
   - `FTP_SERVER`
   - `FTP_USERNAME`
   - `FTP_PASSWORD`
   - `FTP_SERVER_DIR`
3. Push any commit → site deploys automatically

## Live CMS data — do not edit `data/*.json` in this repo

The files under `data/` (posts, pages, users, SEO, site settings) are **owned by
the live CMS on the server**. The copies in this repo are stale snapshots kept
only because the FTP deploy tracks them; they are not the source of truth.

If a commit changes one of them, the deploy uploads it **over the live file**.
That happened on 2026-09-01: a refreshed `data/posts.json` snapshot erased a blog
post published the evening before (its article page survived; its feed entry and
`/blog` card did not). The deploy workflow now refuses any push that touches
`data/*.json`. Make content changes through the CMS instead.

Recovery tools in `admin/api.php` (both public, input-free, idempotent):
`posts_normalize` (absolute, canonical media URLs in the feed) and
`blog_reindex` (rebuilds feed entries for any `blog-<slug>.html` the feed is
missing and regenerates `/blog`). Call with a JSON POST body
`{"action":"blog_reindex"}`.

## File structure

```
admin/index.html        CMS admin panel
block-renderer.jsx      Universal page renderer — all block types
preview.html            Live preview for the block editor
posts.jsx               Blog data loader
blog-post.jsx           Individual blog post renderer
interior-shell.jsx      Nav/footer shim for blog post pages
interior.css            Starter site stylesheet
data/site.json          Business info, colors, GitHub config
data/pages.json         All page content as blocks
data/posts.json         Blog posts
data/seo.json           Per-page SEO & AEO data
data/injections.json    Plugin code snippets
index.html              Home page shell
About.html              About page shell
Services.html           Services page shell
Locations.html          Locations page shell
FAQ.html                FAQ page shell
Contact.html            Contact page shell
Blog.html               Blog page shell
.github/workflows/      GitHub Actions deploy workflow
```

## Updating the CMS

To push a CMS update to all future sites, edit this repo. All sites created after the update automatically get the new version. Existing sites need a manual pull.

## First login

Default password: `admin123` — change it in Settings after first login.
