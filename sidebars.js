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
      items: ['request-validation', 'builtin-middleware', 'rate-limiting', 'graceful-shutdown', 'config-validation'],
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