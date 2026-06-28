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
      label: 'Security',
      collapsed: true,
      items: ['api-key-auth', 'jwt-auth', 'cors', 'rate-limiting'],
    },
    {
      type: 'category',
      label: 'Request Pipeline',
      collapsed: true,
      items: ['request-validation', 'output-caching', 'graceful-shutdown', 'config-validation', 'health-checks'],
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
