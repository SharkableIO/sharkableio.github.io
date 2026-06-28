import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

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