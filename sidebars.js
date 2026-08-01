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
      items: ['quickstart', 'templates'],
    },
    {
      type: 'category',
      label: 'Lifecycle',
      collapsed: true,
      link: { type: 'generated-index' },
      items: ['service-registration', 'lifecycle-hooks'],
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
      items: ['exception-handler', 'problem-details', 'error-localization', 'unified-result'],
    },
    {
      type: 'category',
      label: 'Security',
      collapsed: true,
      items: ['api-key-auth', 'jwt-auth', 'security-headers', 'authorization-interceptor', 'cors', 'rate-limiting'],
    },
    {
      type: 'category',
      label: 'Quality',
      collapsed: true,
      items: ['framework-metrics', 'route-analyzer', 'distributed-tracing', 'profiler'],
    },
    {
      type: 'category',
      label: 'Request Pipeline',
      collapsed: true,
      items: ['request-validation', 'request-timeout', 'output-caching', 'response-cache-profile', 'etag', 'response-compression', 'graceful-shutdown', 'config-validation', 'health-checks'],
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
      items: ['plugins', 'testing', 'idempotency', 'multi-tenant', 'autocrud', 'distributed-transactions', 'server-sent-events', 'roadmap'],
    },
  ],
};

export default sidebars;
