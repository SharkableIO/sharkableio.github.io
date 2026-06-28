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
            to="/zh-cn/quickstart">
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