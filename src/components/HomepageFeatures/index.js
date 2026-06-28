import React from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: translate({
      id: 'homepage.feature.routing.title',
      message: 'Convention-based Routing',
    }),
    description: (
      <Translate
        id="homepage.feature.routing.description"
        values={{apiPath: '/api/{group}/{route}'}}>
        {`<code>ISharkEndpoint</code> → auto-routed at <code>\${apiPath}</code>.
        Zero-reflection endpoint discovery, AOT-ready.`}
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.feature.aot.title',
      message: 'AOT-ready',
    }),
    description: (
      <Translate
        id="homepage.feature.aot.description">
        {`Works with <code>PublishAot=true</code>. Native AOT compilation
        for fast startup and small footprint.`}
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.feature.middleware.title',
      message: 'Rich Middleware',
    }),
    description: (
      <Translate
        id="homepage.feature.middleware.description">
        {`Audit trail, idempotency, multi-tenant, request validation,
        rate limiting, output caching — all built-in.`}
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.feature.openapi.title',
      message: 'OpenAPI Integration',
    }),
    description: (
      <Translate
        id="homepage.feature.openapi.description">
        {`Class-level metadata attributes, API versioning, Scalar UI
        for interactive API exploration.`}
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.feature.error.title',
      message: 'Unified Error Handling',
    }),
    description: (
      <Translate
        id="homepage.feature.error.description">
        {`<code>UnifiedResult&lt;T&gt;</code> + global exception handler
        for consistent API responses.`}
      </Translate>
    ),
  },
  {
    title: translate({
      id: 'homepage.feature.logging.title',
      message: 'Structured Logging',
    }),
    description: (
      <Translate
        id="homepage.feature.logging.description">
        {`Redacting formatter to protect sensitive data automatically.
        Production-ready observability.`}
      </Translate>
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