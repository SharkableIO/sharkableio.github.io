# AGENTS.md

## Project

Sharkable documentation site — Docusaurus 3.10.1, classic preset, React 19, Node ≥ 20.

- Docs are the root route (`routeBasePath: '/'`), no blog.
- `onBrokenLinks: 'throw'` — every link must resolve at build time.

## Commands

```bash
npm run start          # dev server at localhost:3000, hot-reload on docs/ and i18n/
npm run build          # production build to build/
npm run serve          # serve build/ locally
npm run clear          # clear Docusaurus cache
npm run docusaurus docs:version X.Y   # cut a new docs version
npm run write-translations            # extract i18n strings
```

## i18n

Two locales: `en` (default) and `zh-cn`.

- English docs: `docs/`
- Chinese docs: `i18n/zh-cn/docusaurus-plugin-content-docs/current/`
- UI strings: `i18n/zh-cn/code.json`

When adding or editing docs, mirror changes in both locales. The Chinese `current/` directory mirrors the English `docs/` structure.

## Versioning

Current stable is `0.3.x`. Versioned snapshots live under `versioned_docs/version-0.3.x/` and `versioned_sidebars/`. Live (next-version) docs are in `docs/`. When cutting a new version, run `npm run docusaurus docs:version X.Y` and commit all generated files.

## Search

Uses `@easyops-cn/docusaurus-search-local` with `language: ['en', 'zh']`. No external search service needed.

## Deployment

GitHub Actions on push to `main` (`.github/workflows/deploy.yml`): installs deps, builds, deploys `build/` to `gh-pages` branch via `peaceiris/actions-gh-pages@v4`.

## Prism

Additional languages loaded: `csharp`, `bash`, `json`, `yaml` — this site documents a .NET framework, so C# code blocks are the norm.
