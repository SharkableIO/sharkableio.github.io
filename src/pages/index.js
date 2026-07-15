import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Translate from '@docusaurus/Translate';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HeroBackground() {
  return (
    <div className={styles.heroBg}>
      <svg viewBox="0 0 1440 480" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="currentColor"/>
          </pattern>
          <pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="currentColor" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="1440" height="480" fill="url(#dots)" opacity="0.6"/>
        <rect width="1440" height="480" fill="url(#grid)"/>
        
        {/* Decorative lines */}
        <line x1="0" y1="120" x2="300" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="300" y1="120" x2="300" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="0" y1="200" x2="300" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <circle cx="300" cy="160" r="3" fill="currentColor" opacity="0.4"/>
        <circle cx="0" cy="120" r="3" fill="currentColor" opacity="0.4"/>
        <circle cx="0" cy="200" r="3" fill="currentColor" opacity="0.4"/>

        <line x1="1440" y1="100" x2="1140" y2="100" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="1140" y1="100" x2="1140" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <line x1="1140" y1="220" x2="1440" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
        <circle cx="1140" cy="160" r="3" fill="currentColor" opacity="0.4"/>
        <circle cx="1440" cy="100" r="3" fill="currentColor" opacity="0.4"/>
        <circle cx="1440" cy="220" r="3" fill="currentColor" opacity="0.4"/>

        {/* Center tech shape */}
        <g opacity="0.25" transform="translate(720,200)">
          <rect x="-60" y="-60" width="120" height="120" rx="12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          <rect x="-40" y="-40" width="80" height="80" rx="8" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="0" cy="0" r="20" fill="none" stroke="currentColor" strokeWidth="1"/>
          <circle cx="0" cy="0" r="4" fill="currentColor"/>
          <line x1="-60" y1="0" x2="-24" y2="0" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="24" y1="0" x2="60" y2="0" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="0" y1="-60" x2="0" y2="-24" stroke="currentColor" strokeWidth="0.8"/>
          <line x1="0" y1="24" x2="0" y2="60" stroke="currentColor" strokeWidth="0.8"/>
        </g>
      </svg>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <HeroBackground />
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">
          <Translate id="homepage.tagline">
            {siteConfig.tagline}
          </Translate>
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/quickstart">
            <Translate id="homepage.button.quickstart">QuickStart →</Translate>
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            href="https://github.com/sharkableio/sharkable">
            <Translate id="homepage.button.github">GitHub ↗</Translate>
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
