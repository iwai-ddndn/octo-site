# UniEnter detail editorial content

2026-10-16: UniEnter's case study copy and media live in `src/unienter-detail.mjs` and are applied only inside `workPage`, after CMS publication validation. microCMS continues to control publication, title, category, listing, ordering and cover. No unpublished work is added. The homepage and works listing retain CMS data.

The existing CMS connection has GET-only credentials held in GitHub Actions. No new permissions or credentials were introduced. The current plain-text/gallery schema has no video field. Detail copy, subtitle, outbound URL and gallery are intentionally overridden for this one page; future detail edits should update this module until an explicit CMS schema migration replaces it. Existing CMS draft/example copy remains in CMS but is not rendered on this detail page.

- Official screenshot: actual https://unienter.oc-to.com/ at 1440 × 1000, captured 2026-10-16 after animations completed.
- Video: `marketing/teaser/export/UniEnter-teaser-16x9.mp4`, latest Claude Code teaser listed in the 2026-10-15 Drive asset inventory; 1920 × 1080, 19.6s, 60fps, audio. SHA256 `4c01438da9c1bb904c14a382180c5b83f99e145f15f40ae75fdc122d9689434a`.
- Poster: `marketing/teaser/export/images/UniEnter-thumbnail-16x9.png`.
- Original assets are untouched. Copies are served with the existing Pages site. Video has native controls, playsinline, metadata-only preload and no autoplay.
- Product claims checked against the live website, release v0.3.7, and the existing application's architecture notes. Supported-service examples deliberately do not promise all apps or all versions.

Publish with the existing `publish-cms.yml` workflow (`publish=true`), which fetches live published CMS entries and preserves its release safety checks.
