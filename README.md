# Sharkable Doc Site

Documentation site for Sharkable, built with [Docusaurus](https://docusaurus.io/).

🌐 Live site: <https://sharkableio.github.io/>

## Local development

```bash
npm install
npm run start
```

Open <http://localhost:3000/> in your browser. Edits to Markdown under `docs/`
or `i18n/zh-cn/` hot-reload automatically.

## Build

```bash
npm run build
```

Output goes to `build/` directory.

## Deployment

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`).
Pushing to `main` triggers a build and publishes `build/` to the `gh-pages`
branch.

### One-time setup

The repo's GitHub Pages source must be switched from
`Branch: main / Folder: /docs` to `Branch: gh-pages / Folder: / (root)`.

Go to **Settings → Pages** in the GitHub repo UI and change the source.

## Versioning

This site uses Docusaurus docs versioning. The current stable version is
`0.3.x`. To cut a new version when Sharkable releases (e.g. 0.4):

```bash
npm run docusaurus docs:version 0.4
```

This snapshots current docs into `versioned_docs/version-0.4/` and the live
docs continue as the next version. Commit the generated files.

## Translations

Chinese translations live under `i18n/zh-cn/`. To add or update translations,
edit files in `i18n/zh-cn/docusaurus-plugin-content-docs/current/` and UI
strings in `i18n/zh-cn/code.json`.

## Project layout

```
docs/                          # English docs (source)
i18n/zh-cn/                    # Chinese docs and translations
src/pages/                     # Marketing homepage
src/components/                # React components
static/img/                    # Static assets (logo)
docusaurus.config.js           # Site configuration
sidebars.js                    # Docs sidebar structure
versions.json                  # Docs version list
```

## License

See [LICENSE](LICENSE).