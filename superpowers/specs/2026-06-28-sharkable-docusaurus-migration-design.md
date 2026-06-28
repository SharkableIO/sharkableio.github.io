# Sharkable Docsify → Docusaurus 迁移设计

**日期**: 2026-06-28
**目标仓库**: `sharkableio.github.io`（GitHub User Pages 站点）
**负责人**: Sharkable 维护者（charleypeng）

## 背景

当前 sharkableio.github.io 是一个 docsify 驱动的产品文档站：

- 静态 HTML + Markdown，GitHub Pages 直接服务 `main` 分支的 `docs/` 目录
- docsify + 自定义 Material Design 样式（Vue 主题基础上扩展）
- 双语：英文 13 篇 + 中文 13 篇并行翻译，文件位于 `docs/` 和 `docs/zh-cn/`
- 站点根域 `https://sharkableio.github.io/`
- 当前框架版本 0.3.2（quickstart.md 中引用）

## 目标

迁移到 Docusaurus v3.10.x（latest stable，与 `/docs/next` 用法一致），获得：

1. 内置搜索（本地）
2. 文档版本管理（0.3.x / Next）
3. 原生 i18n（zh-cn locale）
4. 营销首页（Hero + Features）
5. GitHub Actions 自动构建部署到 `gh-pages` 分支

## 非目标（明确不做）

- 不改写文档正文内容（只迁移）
- 不启用 Algolia DocSearch（需中请账号）
- 不引入 MDX 增强组件
- 不修改 Sharkable 框架代码本身（仓库根目录是文档站，不含框架代码）
- 不替换 Logo 设计（仅换格式 jpg→svg）
- 不引入博客模块
- 不替换中文翻译内容

## 架构决策

| 决策项 | 选择 | 理由 |
|---|---|---|
| Docusaurus 版本 | v3.10.x（stable） | 与 `/docs/next` 用法一致；canary 不稳定 |
| 部署方式 | GitHub Actions 自动构建 → gh-pages 分支 | 用户选择；无需本地部署命令 |
| i18n 架构 | 原生 i18n + zh-cn locale | 用户选择；中文维护者可独立维护译稿 |
| 主题 | 默认 Infima + 仅调色（主色 `#0a6e75`） | 用户选择；最小维护成本 |
| URL 兼容 | `routeBasePath: '/'` + `slug: /` + trailing slash 配置 | 用户选择；新 URL 与旧路由对齐 |
| 首页风格 | 营销首页（src/pages/index.js）+ 文档 intro 分离 | 用户选择；产品展示更专业 |
| 搜索 | `@easyops-cn/docusaurus-search-local`（本地） | 用户选择；零配置 |
| 文档版本管理 | 启用；当前版本标签 `0.3.x (stable)` | 用户选择；为 0.4/0.5 迭代做准备 |

## 改造后目录结构

```
sharkableio.github.io/                                # 仓库根
├── docs/                                              # 英文文档源
│   ├── intro.md                                       # 迁移自 docs/README.md
│   ├── quickstart.md
│   ├── endpoint-grouping.md
│   ├── api-versioning.md
│   ├── openapi-metadata.md
│   ├── scalar-configuration.md
│   ├── exception-handler.md
│   ├── unified-result.md
│   ├── request-validation.md
│   ├── builtin-middleware.md
│   ├── audit-trail.md
│   ├── redacting-formatter.md
│   ├── idempotency.md
│   ├── multi-tenant.md
│   └── roadmap.md                                     # 14 篇英文文档（含 intro）
├── i18n/zh-cn/
│   ├── docusaurus-plugin-content-docs/
│   │   └── current/                                   # 中文文档源
│   │       ├── intro.md                               # 迁移自 docs/zh-cn/README.md
│   │       ├── quickstart.md
│   │       ├── ...                                    # 14 篇中文文档
│   │       └── roadmap.md
│   ├── docusaurus-plugin-content-pages/
│   │   └── current/
│   │       └── index.js                               # 中文营销首页
│   └── code.json                                      # UI 文案翻译
├── src/
│   ├── pages/
│   │   ├── index.js                                   # 英文营销首页
│   │   └── index.module.css                           # 首页样式
│   └── css/
│       └── custom.css                                 # 主题色覆盖
├── static/
│   └── img/
│       └── logo.svg                                   # 转换自 docs/logo.jpg
├── docusaurus.config.js                               # 站点主配置
├── sidebars.js                                        # 侧边栏配置
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml                                 # GitHub Actions
├── README.md                                          # 仓库说明（含发布版本步骤）
└── .gitignore                                         # 扩展（node_modules/build/.docusaurus）
```

## 侧边栏结构

按当前 docsify `_sidebar.md` 6 个分组映射为 Docusaurus categories。intro.md 作为侧边栏首项（与原"Home"位置对应）。

```js
// sidebars.js
{
  docs: [
    'intro',
    {
      type: 'category',
      label: '入门指南 / Getting Started',
      collapsed: false,
      items: ['quickstart'],
    },
    {
      type: 'category',
      label: 'OpenAPI',
      items: [
        'endpoint-grouping',
        'api-versioning',
        'openapi-metadata',
        'scalar-configuration',
      ],
    },
    {
      type: 'category',
      label: '错误处理 / Error Handling',
      items: ['exception-handler', 'unified-result'],
    },
    {
      type: 'category',
      label: '请求管道 / Request Pipeline',
      items: ['request-validation', 'builtin-middleware'],
    },
    {
      type: 'category',
      label: '日志与审计 / Logging & Auditing',
      items: ['audit-trail', 'redacting-formatter'],
    },
    {
      type: 'category',
      label: '高级功能 / Advanced Features',
      items: ['idempotency', 'multi-tenant'],
    },
  ],
}
```

中文 i18n 下侧边栏可使用同样结构（Docusaurus i18n 复用 sidebar 文件），分组 label 由 `i18n/zh-cn/code.json` 中的 `sidebar.category.{label}` 翻译键覆盖。

## 主题配置

`src/css/custom.css` 通过 CSS 变量覆盖 Infima 默认色板：

```css
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
}
```

## 文档版本管理

启用 Docusaurus 内置版本插件：

- 初始状态：仅 1 个 "current" 版本，标签命名为 `0.3.x (stable)`
- 切版本流程（写入 README 供维护者参考）：
  ```bash
  # 当 Sharkable 0.4 发布时
  npm run docusaurus docs:version 0.4
  ```
  命令会：
  1. 把当前 docs 快照成 `versioned_docs/version-0.4/`
  2. 创建 `versioned_sidebars/version-0.4.json`
  3. 当前 docs 继续演进，成为 "Next" 版本
- 维护者后续可手动编辑 `versions.json` 调整版本标签

## 营销首页结构

`src/pages/index.js`：

- `<Hero>`：标题 "Sharkable"、副标题 "AOT-compatible Minimal API framework for .NET"、两个按钮（"快速开始" → `/docs/quickstart`、"GitHub" → 仓库地址）
- `<Features>`：6 个特性卡片（基于 docs/README.md 中的 Features 列表）
- 顶部 `<HomepageHeader>` 含 Logo

中文版（`i18n/zh-cn/docusaurus-plugin-content-pages/current/index.js`）镜像结构，标题/文案翻译为中文。

## GitHub Actions 部署

`.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

触发条件：push 到 main 分支或手动触发。

## URL 映射

旧 URL → 新 URL：

| 旧 | 新 |
|---|---|
| `/` | `/`（营销首页） |
| `/README.md` | `/docs/intro`（文档首页） |
| `/quickstart.md` | `/docs/quickstart` |
| `/zh-cn/README.md` | `/zh-cn/docs/intro` |
| `/zh-cn/quickstart.md` | `/zh-cn/docs/quickstart` |
| `/logo.jpg` | `/img/logo.svg` |

通过以下配置实现：

```js
// docusaurus.config.js
{
  trailingSlash: false,
  themeConfig: {
    docs: {
      routeBasePath: '/',
      sidebar: { hideable: true },
    },
  },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-cn'],
    localeConfigs: {
      en: { label: 'English', direction: 'ltr', htmlLang: 'en-US' },
      'zh-cn': { label: '中文', direction: 'ltr', htmlLang: 'zh-CN' },
    },
  },
}
```

外部链接可能因为 `.md` 后缀变化断链——通过 `static/_redirects` 或 README 中的变更说明告知读者更新书签。

## 归档流程

迁移前先把当前所有 Markdown 和重要文件**完整**复制到 `~/dev/sharkdoc/`：

```
~/dev/sharkdoc/
├── index.html              # docsify 入口
├── _sidebar.md             # 英文侧边栏
├── README.md               # 英文首页
├── logo.jpg                # Logo 资源
├── .nojekyll
└── ...                     # 其余 md + zh-cn/ 子目录镜像
```

保留原始目录结构，便于回溯对比。

## 执行步骤

1. **归档**：复制 `docs/` 全部内容到 `~/dev/sharkdoc/`
2. **初始化**：在仓库根运行 `npx create-docusaurus@latest . classic --typescript false`
3. **清理旧产物**：删除 `docs/index.html`、`docs/_sidebar.md`、`docs/zh-cn/_sidebar.md`、`.nojekyll`、`docs/logo.jpg`
4. **迁移英文文档**：
   - `docs/README.md` → `docs/intro.md`（slug `/docs/intro`）
   - 其余 13 个英文 md 文件保留在 `docs/` 下，文件名不变
5. **迁移中文文档**：
   - `docs/zh-cn/README.md` → `i18n/zh-cn/docusaurus-plugin-content-docs/current/intro.md`
   - 其余 13 个中文 md 文件移动到 `i18n/zh-cn/docusaurus-plugin-content-docs/current/`
   - 删除 `docs/zh-cn/` 空目录
6. **资产处理**：
   - `docs/logo.jpg` 转 SVG 放到 `static/img/logo.svg`（保留 jpg 备份到 `~/dev/sharkdoc`）
7. **配置 `docusaurus.config.js`**：
   - 站点信息（title、tagline、url、baseUrl）
   - 主题色 Logo
   - i18n 配置
   - routeBasePath
   - 本地搜索插件
   - 版本插件配置
8. **配置 `sidebars.js`**：按 6 个 category 分组
9. **营销首页**：实现英文 + 中文两个 `index.js`
10. **CSS 调色**：写 `src/css/custom.css`
11. **GitHub Actions**：写 `.github/workflows/deploy.yml`
12. **更新 `package.json`**：补充版本管理依赖（`@docusaurus/plugin-content-docs` 已含 versioning）
13. **更新 `.gitignore`**：添加 `node_modules/`、`build/`、`.docusaurus/`、`*.log`
14. **更新 `README.md`**：补充本地开发、构建、版本发布说明
15. **验证**：
    - `npm run start` 本地预览
    - `npm run build` 确保无报错
    - 逐页核对英文 + 中文侧边栏、链接、版本下拉框、搜索、首页

## 验证标准

迁移完成的判定：

1. `npm run build` 成功，零错误零警告
2. `npm run serve` 后访问 `http://localhost:3000/`，逐项检查：
   - [ ] 首页显示 Sharkable 标题 + Features 卡片 + 按钮
   - [ ] 顶部导航栏有 "Docs"、"GitHub" 链接
   - [ ] "Docs" 链接进入文档页，侧边栏显示 6 个分类
   - [ ] 每个分类下的文档能正常打开
   - [ ] 代码块语法高亮正常
   - [ ] 切换到 zh-cn 后导航栏文案翻译为中文
   - [ ] 中文侧边栏 6 个分类对应翻译正确
   - [ ] 搜索框输入 "idempotency" 能搜到对应文档（中英都搜到）
   - [ ] 文档顶部版本下拉框显示 `0.3.x (stable)`
   - [ ] 移动端宽度下导航折叠正常
3. 所有文档链接（站内）无 404
4. 旧 URL `/README.md`、`/quickstart.md` 等不再服务（旧 GitHub Pages 设置切换后才生效）

## 风险与边界

- **GitHub Pages 源切换**：仓库 Settings → Pages 必须从 "Branch: main / Folder: /docs" 手动改为 "Branch: gh-pages / Folder: / (root)"。CI 不能改这个设置，需要在合并后由维护者手动操作一次，并在 README 写明
- **旧 `.md` URL 断链**：外部链接若带 `.md` 后缀会失效；通过 README 变更说明告知
- **logo.jpg → svg 转换**：转换质量需人工确认，若效果差可保留 jpg + 在 custom.css 中加 `<img>` fallback
- **首次部署延迟**：GitHub Pages 设置切换后首次部署约 1-2 分钟生效
- **依赖安装时长**：`npm ci` 首次约 60-90 秒，缓存命中后约 20 秒

## 后续维护说明（写入 README）

发布新版本步骤：

```bash
# 1. 升级框架版本号并更新文档
# 2. 提交后：
npm run docusaurus docs:version 0.4
# 3. 提交 versioned_docs/、versioned_sidebars/、versions.json
# 4. 当前 docs 继续演进，成为 "Next" 版本
```

## 引用

- Docusaurus 官方文档：https://docusaurus.io/docs/next
- 版本管理文档：https://docusaurus.io/docs/next/versioning
- i18n 文档：https://docusaurus.io/docs/next/i18n/tutorial
- 部署到 GitHub Pages：https://docusaurus.io/docs/next/deployment#deploying-to-github-pages