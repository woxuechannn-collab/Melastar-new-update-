import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="app-shell not-found-page">
      <header className="site-header">
        <div className="site-header__inner">
          <Link href="/" className="brand" data-testid="link-404-brand" aria-label="Melastar Legal home">
            <span className="brand-mark" aria-hidden="true"><span /><span /><span /></span>
            <span className="brand__wordmark">melastar</span>
            <span className="brand__label">legal</span>
          </Link>
        </div>
      </header>
      <main className="not-found-main">
        <div className="not-found-code">404</div>
        <div className="eyebrow">This page wandered off</div>
        <h1>That address<br /><em>does not exist.</em></h1>
        <p>Try returning to the legal home, where the current Terms of Service and Privacy Policy are always close by.</p>
        <Link href="/" className="button button--ink" data-testid="link-404-home">
          Back to legal home <ArrowUpRight size={17} strokeWidth={1.8} />
        </Link>
        <Link href="/terms" className="not-found-secondary" data-testid="link-404-terms">
          Or read the Terms of Service <ChevronRight size={16} strokeWidth={1.8} />
        </Link>
      </main>
    </div>
  );
}