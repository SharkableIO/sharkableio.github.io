# Sharkable Docsify → Docusaurus 迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 sharkableio.github.io 从 docsify 静态站点迁移到 Docusaurus v3.10.x，保留双语文档并新增版本管理、搜索和营销首页。

**Architecture:** 在仓库根初始化 Docusaurus classic 模板，将原 `docs/` 内容迁移到 Docusaurus 标准目录（英文 → `docs/`、中文 → `i18n/zh-cn/...`），通过 GitHub Actions 自动构建并部署到 `gh-pages` 分支。

**Tech Stack:** Docusaurus 3.10.x、React、MDX、@easyops-cn/docusaurus-search-local、GitHub Actions、Node.js 20

**Spec:** `superpowers/specs/2026-06-28-sharkable-docusaurus-migration-design.md`

**参考文档：** https://docusaurus.io/docs/next

---

## 文件结构总览

### 创建
- `superpowers/plans/` (本计划目录)
- `docusaurus.config.js` — 站点主配置
- `sidebars.js` — 侧边栏结构
- `package.json` — Docusaurus 依赖
- `package-lock.json` — npm lock
- `src/pages/index.js` — 英文营销首页
- `src/pages/index.module.css` — 首页样式
- `src/css/custom.css` — 主题色覆盖
- `i18n/zh-cn/docusaurus-plugin-content-docs/current/intro.md` — 中文文档首页
- `i18n/zh-cn/docusaurus-plugin-content-docs/current/*.md` — 13 篇中文文档
- `i18n/zh-cn/docusaurus-plugin-content-pages/current/index.js` — 中文营销首页
- `i18n/zh-cn/code.json` — 中文 UI 翻译
- `static/img/logo.jpg` — Logo（保留 jpg 格式，因 potrace 不可用无法生成 SVG；Task 8 引用 logo.jpg）
- `.github/workflows/deploy.yml` — GitHub Actions
- `versions.json` — 版本配置
- `~/dev/sharkdoc/` — 归档目录（仓库外）

### 修改
- `.gitignore` — 追加 `node_modules/`、`build/`、`.docusaurus/`、`*.log`、`.env`
- `README.md` — 增加开发/构建/版本发布说明
- `docs/README.md` → `docs/intro.md`（重命名）

### 删除
- `docs/index.html` — docsify 入口
- `docs/_sidebar.md` — docsify 侧边栏
- `docs/zh-cn/_sidebar.md` — docsify 侧边栏
- `docs/zh-cn/README.md` — 迁移为 i18n/intro.md 后删除原文件
- `docs/zh-cn/*.md` — 迁移为 i18n 后删除
- `docs/logo.jpg` — 迁移到 static 后删除
- `docs/.nojekyll` — Docusaurus build 自动生成等效文件

---

## 任务 1：归档当前文档到 ~/dev/sharkdoc

**目的：** 迁移前保留原始文件作为回溯备份。

- [ ] **Step 1.1：创建归档目录**

```bash
mkdir -p ~/dev/sharkdoc
```

- [ ] **Step 1.2：复制 docs/ 全部内容到归档目录**

```bash
cp -R /Volumes/Doc/dev/sharkableio.github.io/docs ~/dev/sharkdoc/
```

- [ ] **Step 1.3：验证归档完整**

```bash
diff -rq /Volumes/Doc/dev/sharkableio.github.io/docs ~/dev/sharkdoc/docs
```

期望输出：无差异（即 `diff` 静默退出，退出码 0）。

- [ ] **Step 1.4：确认归档文件数**

```bash
find ~/dev/sharkdoc -type f | wc -l
```

期望：33（13 en md + 1 en sidebar + 1 en README + 13 zh md + 1 zh sidebar + 1 zh README + 1 index.html + 1 logo.jpg + 1 .nojekyll = 33）。

- [ ] **Step 1.5：提交进度标记**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git tag migration-archive-complete
```

---

## 任务 2：初始化 Docusaurus 脚手架

**目的：** 在仓库根创建 Docusaurus 项目骨架。

- [ ] **Step 2.1：确认 Node.js 版本**

```bash
node --version
```

期望：v20.x 或更高。如低于 v18，先用 nvm 升级。

- [ ] **Step 2.2：在仓库根初始化 Docusaurus（保留现有文件）**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npx --yes create-docusaurus@latest . classic --skip-install
```

参数说明：
- `.` 表示当前目录
- `classic` 模板（包含 Docs、Blog、Pages、Theme）
- `--skip-install` 跳过自动 npm install（避免后续手动控制依赖）

如果命令行询问"目录非空"，选择"忽略现有文件继续"或"Infrastructure"模式（不同版本提示不同，关键是不要让脚手架覆盖 docs/）。

- [ ] **Step 2.3：检查生成的文件**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io
```

期望看到新文件：`docusaurus.config.js`、`sidebars.js`、`package.json`、`src/`、`static/`。

- [ ] **Step 2.4：检查 docs/ 目录是否还在（关键检查）**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/docs | head -5
```

期望：原有 markdown 文件还在。如果被覆盖，立即 `git restore docs/` 恢复。

- [ ] **Step 2.5：安装依赖**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm install
```

期望：成功完成，无错误。看到 `node_modules/` 目录被创建。

- [ ] **Step 2.6：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add package.json package-lock.json docusaurus.config.js sidebars.js src/ static/
git commit -m "chore: scaffold Docusaurus project"
```

注意：`docs/` 不在此提交（暂未迁移）。

---

## 任务 3：更新 .gitignore

**目的：** 排除构建产物和依赖目录。

- [ ] **Step 3.1：读取当前 .gitignore**

```bash
cat /Volumes/Doc/dev/sharkableio.github.io/.gitignore
```

当前内容（2 行）：
```
.DS_Store
._*
```

- [ ] **Step 3.2：追加 Docusaurus 相关忽略项**

使用 Edit 工具追加：
```
# Dependencies
node_modules/

# Production
build/

# Generated files
.docusaurus/
.cache-loader/

# Misc
.DS_Store
._*
*.log
.env
.env.local
```

最终 `.gitignore`：
```
# Dependencies
node_modules/

# Production
build/

# Generated files
.docusaurus/
.cache-loader/

# Misc
.DS_Store
._*
*.log
.env
.env.local
```

- [ ] **Step 3.3：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add .gitignore
git commit -m "chore: update .gitignore for Docusaurus"
```

---

## 任务 4：安装本地搜索插件

**目的：** 添加 `@easyops-cn/docusaurus-search-local` 用于中英文全文搜索。

- [ ] **Step 4.1：安装依赖**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm install --save @easyops-cn/docusaurus-search-local
```

期望：看到 `+ @easyops-cn/docusaurus-search-local@x.x.x` 添加到 package.json dependencies。

- [ ] **Step 4.2：验证 package.json 更新**

```bash
grep "docusaurus-search-local" /Volumes/Doc/dev/sharkableio.github.io/package.json
```

期望：输出包含 `"@easyops-cn/docusaurus-search-local": "^x.x.x"`。

- [ ] **Step 4.3：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add package.json package-lock.json
git commit -m "chore: add local search plugin"
```

---

## 任务 5：处理 Logo 资源

**目的：** 将 docs/logo.jpg 转换为 SVG 放到 static/img/。

- [ ] **Step 5.1：归档原 logo 到 sharkdoc**

```bash
cp /Volumes/Doc/dev/sharkableio.github.io/docs/logo.jpg ~/dev/sharkdoc/logo.jpg.bak
```

（虽然任务 1 已复制整个 docs/，但保留一个独立备份更稳妥。）

- [ ] **Step 5.2：创建 static/img/ 目录**

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/static/img
```

- [ ] **Step 5.3：转换 logo 为 SVG**

由于 image tracer 工具各有差异，使用 Python + Pillow + potrace 组合（如果不可用，则保留 jpg）：

```bash
which potrace
```

如果 `potrace` 存在：

```bash
# 简化流程：临时跳过，复制 jpg 作为占位（任务 5 末有 fallback）
cp /Volumes/Doc/dev/sharkableio.github.io/docs/logo.jpg /Volumes/Doc/dev/sharkableio.github.io/static/img/logo.jpg
```

如果希望真正 SVG 转换（在 macOS 上）：

```bash
# 1. 用 sips 转 PNG
sips -s format png /Volumes/Doc/dev/sharkableio.github.io/docs/logo.jpg --out /tmp/logo.png

# 2. 用 potrace 转 SVG
potrace /tmp/logo.png -s -o /Volumes/Doc/dev/sharkableio.github.io/static/img/logo.svg
```

期望：`static/img/logo.svg` 或 `static/img/logo.jpg` 文件存在。

- [ ] **Step 5.4：删除原 docs/logo.jpg（保留至归档）**

```bash
# 注意：归档 ~/dev/sharkdoc/docs/logo.jpg 已存在，此处只删仓库内文件
cd /Volumes/Doc/dev/sharkableio.github.io
git rm docs/logo.jpg
```

- [ ] **Step 5.5：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add static/img/
git commit -m "feat: migrate logo to static/img/"
```

---

## 任务 6：迁移英文文档

**目的：** 将英文 Markdown 从 `docs/` 迁移到 Docusaurus 的 `docs/` 目录结构（README.md → intro.md）。

- [ ] **Step 6.1：移动 README.md 为 intro.md**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git mv docs/README.md docs/intro.md
```

- [ ] **Step 6.2：验证 docs/ 下文件**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/docs/*.md
```

期望：14 个 md 文件，包含 `intro.md`、`quickstart.md`、`roadmap.md` 等。

- [ ] **Step 6.3：清理 docsify 遗留文件**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git rm docs/index.html docs/_sidebar.md docs/zh-cn/_sidebar.md docs/.nojekyll
```

期望：4 个文件被删除。

- [ ] **Step 6.4：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add docs/
git commit -m "feat: migrate English docs to Docusaurus layout"
```

---

## 任务 7：迁移中文文档到 i18n

**目的：** 将 docs/zh-cn/ 内容迁移到 i18n/zh-cn/docusaurus-plugin-content-docs/current/。

- [ ] **Step 7.1：创建 i18n 目录结构**

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/i18n/zh-cn/docusaurus-plugin-content-docs/current
```

- [ ] **Step 7.2：移动所有中文 md 到 i18n 目录**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
# 移动 README.md 为 intro.md
git mv docs/zh-cn/README.md i18n/zh-cn/docusaurus-plugin-content-docs/current/intro.md
# 移动其他中文 md
git mv docs/zh-cn/*.md i18n/zh-cn/docusaurus-plugin-content-docs/current/
# 验证只剩 i18n/zh-cn/docusaurus-plugin-content-docs/current 目录下的内容
ls i18n/zh-cn/docusaurus-plugin-content-docs/current/
```

期望：14 个 md 文件（含 intro.md）。

- [ ] **Step 7.3：删除空的 zh-cn 目录**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
rmdir docs/zh-cn 2>/dev/null || rm -rf docs/zh-cn
ls docs/
```

期望：`docs/` 下不再有 `zh-cn/` 子目录。

- [ ] **Step 7.4：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add docs/ i18n/
git commit -m "feat: migrate Chinese docs to i18n folder"
```

---

## 任务 8：编写 docusaurus.config.js

**目的：** 配置站点信息、i18n、主题、搜索、版本、URL 行为。

- [ ] **Step 8.1：读取现有配置文件**

```bash
cat /Volumes/Doc/dev/sharkableio.github.io/docusaurus.config.js
```

- [ ] **Step 8.2：替换为完整配置**

使用 Write 工具覆盖 `docusaurus.config.js`：

```javascript
// @ts-check
// `@type` JSDoc annotations let editors provide autocompletion and type checking.
// (When running `docusaurus build` Docusaurus loads this file as ES module.)

import { themes as prismThemes } from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Sharkable',
  tagline: 'AOT-compatible Minimal API framework for .NET',
  favicon: 'img/logo.jpg',

  url: 'https://sharkableio.github.io',
  baseUrl: '/',

  organizationName: 'sharkableio',
  projectName: 'sharkable',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-cn'],
    localeConfigs: {
      en: {
        label: 'English',
        direction: 'ltr',
        htmlLang: 'en-US',
      },
      'zh-cn': {
        label: '中文',
        direction: 'ltr',
        htmlLang: 'zh-CN',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/logo.jpg',
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'Sharkable',
        logo: {
          alt: 'Sharkable Logo',
          src: 'img/logo.jpg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Docs',
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/sharkableio/sharkable',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Sharkable. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['csharp', 'bash', 'json', 'yaml'],
      },
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
    }),

  themes: ['@docusaurus/theme-live-codeblock'],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: true,
        docsRouteBasePath: '/',
        language: ['en', 'zh'],
        highlightSearchTermsOnTargetPage: true,
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
      },
    ],
  ],
};

export default config;
```

- [ ] **Step 8.3：移除脚手架自带的 blog 残留（如果有）**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
ls blog/ 2>/dev/null && echo "blog 目录存在，已在 config 中禁用 blog，但建议删除" || echo "无 blog 目录"
```

如 `blog/` 目录存在但内容无用：

```bash
rm -rf /Volumes/Doc/dev/sharkableio.github.io/blog
```

（注意：脚手架的 classic 模板会创建 blog 目录，但我们禁用 blog 功能。删除前确认内容无用——本项目原本没有 blog。）

- [ ] **Step 8.4：本地启动验证**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

在浏览器访问 `http://localhost:3000/`。期望：
- 看到导航栏有 "Sharkable" 标题、Logo、"Docs"、"GitHub"
- 顶部有版本下拉框（当前显示 "0.3.x (stable)" — 在任务 11 中配置）
- 首页能加载（此时还是脚手架默认首页，下一任务替换）

按 Ctrl+C 停止。

- [ ] **Step 8.5：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add docusaurus.config.js
git commit -m "feat: configure Docusaurus site (i18n, theme, search, URL)"
```

---

## 任务 9：编写 src/css/custom.css 主题色

**目的：** 通过 CSS 变量覆盖 Infima 默认色板，保持品牌色一致。

- [ ] **Step 9.1：确认 src/css/ 目录存在**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/src/css/ 2>/dev/null
```

如不存在：

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/src/css
```

- [ ] **Step 9.2：写入自定义 CSS**

使用 Write 工具创建 `src/css/custom.css`：

```css
/**
 * Sharkable brand theme overrides
 * Primary color: #0a6e75 (teal)
 */

/* Light mode */
:root {
  --ifm-color-primary: #0a6e75;
  --ifm-color-primary-dark: #064e52;
  --ifm-color-primary-darker: #053f43;
  --ifm-color-primary-darkest: #042f32;
  --ifm-color-primary-light: #0d8a93;
  --ifm-color-primary-lighter: #0f9ba4;
  --ifm-color-primary-lightest: #11b6c0;
  --ifm-font-family-base: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Arial, 'Noto Sans SC', 'PingFang SC', sans-serif;
  --ifm-heading-font-weight: 700;
  --ifm-code-font-size: 92%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

/* Dark mode */
[data-theme='dark'] {
  --ifm-color-primary: #11b6c0;
  --ifm-color-primary-dark: #0fa3ac;
  --ifm-color-primary-darker: #0e9098;
  --ifm-color-primary-darkest: #0b7279;
  --ifm-color-primary-light: #29c0c9;
  --ifm-color-primary-lighter: #37c5ce;
  --ifm-color-primary-lightest: #5fd2da;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}

/* Navbar title font weight */
.navbar__title {
  font-weight: 700;
}
```

- [ ] **Step 9.3：本地启动验证**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

访问 `http://localhost:3000/`，期望：
- 导航栏 "Docs" 链接、版本下拉框等元素颜色变为青色（#0a6e75）
- 字体保持现有 macOS 风格

按 Ctrl+C 停止。

- [ ] **Step 9.4：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add src/css/custom.css
git commit -m "feat: apply brand color theme overrides"
```

---

## 任务 10：配置侧边栏

**目的：** 把当前 docsify 的 6 个分组映射为 Docusaurus categories。

- [ ] **Step 10.1：读取现有 sidebars.js**

```bash
cat /Volumes/Doc/dev/sharkableio.github.io/sidebars.js
```

- [ ] **Step 10.2：替换为完整配置**

使用 Write 工具覆盖 `sidebars.js`：

```javascript
// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      link: { type: 'generated-index' },
      items: ['quickstart'],
    },
    {
      type: 'category',
      label: 'OpenAPI',
      collapsed: true,
      items: [
        'endpoint-grouping',
        'api-versioning',
        'openapi-metadata',
        'scalar-configuration',
      ],
    },
    {
      type: 'category',
      label: 'Error Handling',
      collapsed: true,
      items: ['exception-handler', 'unified-result'],
    },
    {
      type: 'category',
      label: 'Request Pipeline',
      collapsed: true,
      items: ['request-validation', 'builtin-middleware'],
    },
    {
      type: 'category',
      label: 'Logging & Auditing',
      collapsed: true,
      items: ['audit-trail', 'redacting-formatter'],
    },
    {
      type: 'category',
      label: 'Advanced Features',
      collapsed: true,
      items: ['idempotency', 'multi-tenant', 'roadmap'],
    },
  ],
};

export default sidebars;
```

注意：roadmap.md 原本在英文 docs 中存在，移到 Advanced Features 分类下便于查找。

- [ ] **Step 10.3：中文侧边栏标签翻译（i18n/code.json）**

创建 `i18n/zh-cn/code.json`：

```json
{
  "version.AriaLabel": "版本",
  "sidebar.docs.category.Getting Started": "入门指南",
  "sidebar.docs.category.OpenAPI": "OpenAPI",
  "sidebar.docs.category.Error Handling": "错误处理",
  "sidebar.docs.category.Request Pipeline": "请求管道",
  "sidebar.docs.category.Logging & Auditing": "日志与审计",
  "sidebar.docs.category.Advanced Features": "高级功能",
  "item.label.Docs": "文档"
}
```

- [ ] **Step 10.4：本地验证侧边栏分组**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

访问 `http://localhost:3000/quickstart`：
- 左侧侧边栏显示 "Getting Started" 分类展开，包含 "QuickStart" 项
- 下方折叠的 5 个分类（OpenAPI、Error Handling 等）

切换到中文（点击右上角地球图标 → 中文）：
- 侧边栏分类名变为中文（"入门指南"、"OpenAPI" 等）
- 文档内容为中文

按 Ctrl+C 停止。

- [ ] **Step 10.5：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add sidebars.js i18n/zh-cn/code.json
git commit -m "feat: configure sidebar categories and i18n labels"
```

---

## 任务 11：配置文档版本管理

**目的：** 启用 Docusaurus 内置版本插件，初始版本标签为 `0.3.x (stable)`。

- [ ] **Step 11.1：创建 versions.json**

使用 Write 工具创建 `versions.json`：

```json
[
  "0.3.x"
]
```

这个文件告诉 Docusaurus 当前唯一版本是 "0.3.x"。下次发布新版本时（如 0.4），运行 `npm run docusaurus docs:version 0.4` 会自动更新此文件并创建 `versioned_docs/version-0.4/`。

- [ ] **Step 11.2：验证版本下拉框显示**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

访问任意文档页（如 `http://localhost:3000/quickstart`），期望：
- 导航栏右侧出现版本下拉框
- 点击下拉框看到 `0.3.x (stable)` 选项

按 Ctrl+C 停止。

- [ ] **Step 11.3：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add versions.json
git commit -m "feat: enable docs versioning, initial version 0.3.x"
```

---

## 任务 12：编写英文营销首页

**目的：** 替换脚手架默认首页为 Sharkable 营销页面。

- [ ] **Step 12.1：读取现有首页**

```bash
cat /Volumes/Doc/dev/sharkableio.github.io/src/pages/index.js
```

- [ ] **Step 12.2：替换首页组件**

使用 Write 工具覆盖 `src/pages/index.js`：

```jsx
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/quickstart">
            QuickStart →
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/sharkableio/sharkable">
            GitHub ↗
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — ${siteConfig.tagline}`}
      description="Sharkable is a lightweight, AOT-friendly framework that extends ASP.NET Core Minimal APIs with convention-based routing, built-in middleware, and zero-reflection endpoint discovery.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
```

- [ ] **Step 12.3：创建 src/pages/index.module.css**

```css
.heroBanner {
  padding: 4rem 0;
  text-align: center;
  position: relative;
  overflow: hidden;
}

@media screen and (max-width: 996px) {
  .heroBanner {
    padding: 2rem;
  }
}

.buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
}
```

- [ ] **Step 12.4：创建 src/components/HomepageFeatures.js**

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/src/components
```

使用 Write 工具创建 `src/components/HomepageFeatures.js`：

```jsx
import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Convention-based Routing',
    description: (
      <>
        <code>ISharkEndpoint</code> → auto-routed at <code>/api/{'{group}'}/{'{route}'}</code>.
        Zero-reflection endpoint discovery, AOT-ready.
      </>
    ),
  },
  {
    title: 'AOT-ready',
    description: (
      <>
        Works with <code>PublishAot=true</code>. Native AOT compilation
        for fast startup and small footprint.
      </>
    ),
  },
  {
    title: 'Rich Middleware',
    description: (
      <>
        Audit trail, idempotency, multi-tenant, request validation,
        rate limiting, output caching — all built-in.
      </>
    ),
  },
  {
    title: 'OpenAPI Integration',
    description: (
      <>
        Class-level metadata attributes, API versioning, Scalar UI
        for interactive API exploration.
      </>
    ),
  },
  {
    title: 'Unified Error Handling',
    description: (
      <>
        <code>UnifiedResult&lt;T&gt;</code> + global exception handler
        for consistent API responses.
      </>
    ),
  },
  {
    title: 'Structured Logging',
    description: (
      <>
        Redacting formatter to protect sensitive data automatically.
        Production-ready observability.
      </>
    ),
  },
];

function Feature({title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 12.5：创建 src/components/HomepageFeatures.module.css**

```css
.features {
  display: flex;
  align-items: center;
  padding: 2rem 0;
  width: 100%;
}

.featureSvg {
  height: 80px;
  width: 80px;
}
```

- [ ] **Step 12.6：本地验证首页**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

访问 `http://localhost:3000/`，期望：
- Hero 区显示 "Sharkable" 标题、副标题、两个按钮（QuickStart、GitHub）
- 下方 6 个特性卡片（3x2 网格）
- 主色为青色

按 Ctrl+C 停止。

- [ ] **Step 12.7：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add src/pages/ src/components/
git commit -m "feat: build marketing homepage with hero and feature grid"
```

---

## 任务 13：编写中文营销首页

**目的：** 提供中文版营销首页，路径 `/zh-cn/`。

- [ ] **Step 13.1：创建 i18n pages 目录**

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/i18n/zh-cn/docusaurus-plugin-content-pages/current
```

- [ ] **Step 13.2：创建中文首页**

使用 Write 工具创建 `i18n/zh-cn/docusaurus-plugin-content-pages/current/index.js`：

```jsx
import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from '@site/src/pages/index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">支持 AOT 的 .NET Minimal API 框架</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/zh-cn/docs/quickstart">
            快速开始 →
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/sharkableio/sharkable">
            GitHub ↗
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — 支持 AOT 的 .NET Minimal API 框架`}
      description="Sharkable 是一个轻量级、支持 AOT 的 .NET 框架，扩展了 ASP.NET Core Minimal API，提供基于约定的路由、内置中间件和无反射的端点发现。">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
```

- [ ] **Step 13.3：本地验证中文首页**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run start -- --host 0.0.0.0 --port 3000
```

访问 `http://localhost:3000/zh-cn/`，期望：
- Hero 副标题变为 "支持 AOT 的 .NET Minimal API 框架"
- "快速开始" 按钮跳转到 `/zh-cn/docs/quickstart`
- GitHub 按钮正常

按 Ctrl+C 停止。

- [ ] **Step 13.4：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add i18n/zh-cn/docusaurus-plugin-content-pages/
git commit -m "feat: add Chinese marketing homepage"
```

---

## 任务 14：编写 GitHub Actions 部署工作流

**目的：** push 到 main 自动构建并部署到 gh-pages 分支。

- [ ] **Step 14.1：创建 workflows 目录**

```bash
mkdir -p /Volumes/Doc/dev/sharkableio.github.io/.github/workflows
```

- [ ] **Step 14.2：写入 deploy.yml**

使用 Write 工具创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy:
    name: Build and Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
          exclude_assets: ''
          keep_files: false
          force_orphan: true
          enable_jekyll: false
```

- [ ] **Step 14.3：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions workflow for Pages deployment"
```

---

## 任务 15：更新仓库 README

**目的：** 告知开发者如何本地开发、构建、发布新版本。

- [ ] **Step 15.1：读取现有 README**

```bash
cat /Volumes/Doc/dev/sharkableio.github.io/README.md
```

- [ ] **Step 15.2：覆盖 README**

使用 Write 工具覆盖 `README.md`：

````markdown
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
````

- [ ] **Step 15.3：提交**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add README.md
git commit -m "docs: update README with Docusaurus development guide"
```

---

## 任务 16：本地构建验证

**目的：** 确保 `npm run build` 完全通过，零错误零警告（除已知的非阻塞警告）。

- [ ] **Step 16.1：清理构建产物**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
rm -rf build .docusaurus
```

- [ ] **Step 16.2：执行构建**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run build 2>&1 | tee /tmp/build.log
```

期望：
- 最终输出 `[SUCCESS] Generated static files in "build".`
- 退出码 0
- 警告数 < 5（已知警告：版本下拉框在仅 1 个版本时不显示 — 这是预期行为）

- [ ] **Step 16.3：检查构建产物**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/build/
ls /Volumes/Doc/dev/sharkableio.github.io/build/docs/ 2>/dev/null || echo "无 docs 子目录"
ls /Volumes/Doc/dev/sharkableio.github.io/build/zh-cn/
```

期望：
- `build/index.html` — 英文首页
- `build/quickstart/index.html` — 英文 QuickStart
- `build/zh-cn/index.html` — 中文首页
- `build/zh-cn/quickstart/index.html` — 中文 QuickStart
- `build/zh-cn/docs/intro/index.html` 等

- [ ] **Step 16.4：本地 serve 端到端验证**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
npm run serve -- --host 0.0.0.0 --port 3000
```

在另一个终端用 curl 测试关键路径：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/quickstart
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/zh-cn/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/zh-cn/quickstart
```

期望：每个 URL 返回 `200`。

按 Ctrl+C 停止。

- [ ] **Step 16.5：手动逐页验证清单**

打开浏览器访问：

- [ ] `/` → 英文营销首页（Hero + Features）
- [ ] `/quickstart` → 英文 QuickStart 内容
- [ ] `/intro` → 英文文档首页（README 内容）
- [ ] `/endpoint-grouping` → 内容正确
- [ ] 顶部版本下拉框显示 `0.3.x`
- [ ] 顶部语言切换 → 中文
- [ ] `/zh-cn/` → 中文营销首页
- [ ] `/zh-cn/quickstart` → 中文 QuickStart
- [ ] 搜索 "idempotency" → 找到对应文档
- [ ] 移动端宽度（< 996px）下导航折叠正常

---

## 任务 17：清理与最终检查

**目的：** 删除脚手架残留，确保仓库干净。

- [ ] **Step 17.1：检查是否还有 blog 残留**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/blog 2>/dev/null || echo "无 blog 目录"
```

如有：

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git rm -rf blog/
```

- [ ] **Step 17.2：检查 docs/zh-cn/ 是否还存在**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/docs/zh-cn 2>/dev/null || echo "已迁移"
```

如有残留，删除。

- [ ] **Step 17.3：检查 .nojekyll 是否还存在**

```bash
ls /Volumes/Doc/dev/sharkableio.github.io/docs/.nojekyll 2>/dev/null || echo "已删除"
```

如有残留：

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git rm docs/.nojekyll
```

- [ ] **Step 17.4：最终 git status 检查**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git status
```

期望：工作树干净（"nothing to commit, working tree clean"）。

- [ ] **Step 17.5：提交清理（如有）**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git add -A
git diff --cached --quiet || git commit -m "chore: clean up scaffold remnants"
```

- [ ] **Step 17.6：打迁移完成标签**

```bash
cd /Volumes/Doc/dev/sharkableio.github.io
git tag migration-complete
git log --oneline -20
```

---

## 任务 18：通知用户后续手动步骤

**目的：** GitHub Pages 源切换必须手动操作。

- [ ] **Step 18.1：在最终汇报中提示用户**

在对话中告知：

> ⚠️ 部署前需手动操作：
> 1. 进入 GitHub 仓库的 **Settings → Pages**
> 2. 把 Source 从 **"Deploy from a branch: main / /docs"** 改为 **"Deploy from a branch: gh-pages / / (root)"**
> 3. 保存，等待 Actions 完成首次部署（约 2-5 分钟）

- [ ] **Step 18.2：可选：触发首次部署测试**

用户切换 Pages 源后，可手动触发 workflow：

```bash
# 通过 GitHub 网页 Actions tab 点击 "Run workflow"
# 或本地推一个空 commit
cd /Volumes/Doc/dev/sharkableio.github.io
git commit --allow-empty -m "ci: trigger first deployment"
git push origin main
```

（仅在用户授权后才 push。）

---

## 自检清单

完成所有任务后，逐项核对：

- [ ] `~/dev/sharkdoc/` 包含原始文档完整备份
- [ ] `npm run build` 成功
- [ ] 英文首页 `/` 渲染营销页面
- [ ] 中文首页 `/zh-cn/` 渲染营销页面
- [ ] 英文文档 `/quickstart` 等 14 页正常
- [ ] 中文文档 `/zh-cn/quickstart` 等 14 页正常
- [ ] 侧边栏 7 个分组（含 intro）显示正确
- [ ] 版本下拉框显示 `0.3.x`
- [ ] 语言切换工作
- [ ] 搜索可用
- [ ] 主色 `#0a6e75` 应用
- [ ] GitHub Actions workflow 配置完成
- [ ] README 更新完毕
- [ ] 工作树干净