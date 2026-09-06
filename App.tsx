import { type ReactNode, useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, Check, ChevronRight, Circle, Clock3, FileText, Gavel, LockKeyhole, Menu, ShieldCheck, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type MetaProps = {
  title: string;
  description: string;
  path: string;
};

function Meta({ title, description, path }: MetaProps) {
  useEffect(() => {
    document.title = title;
    document.documentElement.lang = 'en';
    const canonical = `${window.location.origin}${path}`;
    const tags = [
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'Melastar Legal' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];

    tags.forEach(({ name, property, content }) => {
      const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
      let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        if (name) tag.setAttribute('name', name);
        if (property) tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });
  }, [title, description, path]);

  return null;
}

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand-mark ${small ? 'brand-mark--small' : ''}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" data-testid="link-home-brand" aria-label="Melastar Legal home">
          <Mark />
          <span className="brand__wordmark">melastar</span>
          <span className="brand__label">legal</span>
        </Link>
        <button
          type="button"
          className="mobile-menu"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="main-navigation"
          data-testid="button-mobile-menu"
        >
          {open ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          <span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span>
        </button>
        <nav id="main-navigation" className={`main-nav ${open ? 'main-nav--open' : ''}`} aria-label="Main navigation">
          <Link href="/terms" className={location === '/terms' ? 'nav-link nav-link--active' : 'nav-link'} data-testid="link-terms-nav">
            Terms of Service
          </Link>
          <Link href="/privacy" className={location === '/privacy' ? 'nav-link nav-link--active' : 'nav-link'} data-testid="link-privacy-nav">
            Privacy Policy
          </Link>
          <span className="nav-rule" aria-hidden="true" />
          <Link href="/" className="nav-home" data-testid="link-home-nav">
            Melastar home <ArrowUpRight size={15} strokeWidth={1.8} />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__top">
        <Link href="/" className="brand brand--footer" data-testid="link-footer-brand">
          <Mark small />
          <span className="brand__wordmark">melastar</span>
        </Link>
        <p className="footer-note">A clear home for the rules and choices behind Melastar.</p>
        <div className="footer-links">
          <Link href="/terms" data-testid="link-terms-footer">Terms</Link>
          <Link href="/privacy" data-testid="link-privacy-footer">Privacy</Link>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} Melastar</span>
        <span className="footer-status"><Circle size={7} fill="currentColor" /> Public documentation</span>
      </div>
    </footer>
  );
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function SectionEyebrow({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <div className="eyebrow">{icon}<span>{children}</span></div>;
}

function Home() {
  return (
    <PageShell>
      <Meta
        title="Melastar Legal — Clear rules for better communities"
        description="The public legal home for Melastar, a Discord giveaway bot. Read the Terms of Service and Privacy Policy."
        path="/"
      />
      <section className="home-hero section-wrap">
        <div className="hero-copy">
          <SectionEyebrow icon={<ShieldCheck size={15} strokeWidth={1.7} />}>Trust, made legible</SectionEyebrow>
          <h1>Good communities<br /><em>start with clarity.</em></h1>
          <p className="hero-lede">
            Melastar helps Discord server owners run giveaways with confidence. This is the straightforward place to understand the rules, responsibilities, and data choices that come with using it.
          </p>
          <div className="hero-actions">
            <Link href="/terms" className="button button--ink" data-testid="link-read-terms-hero">
              Read the Terms <ArrowUpRight size={17} strokeWidth={1.8} />
            </Link>
            <Link href="/privacy" className="text-link" data-testid="link-read-privacy-hero">
              Read the Privacy Policy <ChevronRight size={16} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
        <div className="hero-document" aria-label="Melastar legal documents">
          <div className="hero-document__top">
            <span className="document-kicker">M / 01</span>
            <span className="document-date">Updated 2025</span>
          </div>
          <div className="hero-document__seal"><Gavel size={24} strokeWidth={1.45} /></div>
          <p className="hero-document__quote">“The best policy is one people can actually read.”</p>
          <div className="hero-document__line" />
          <div className="hero-document__meta">
            <span>Melastar</span>
            <span>Legal centre</span>
          </div>
        </div>
      </section>

      <section className="intro-strip">
        <div className="section-wrap intro-strip__inner">
          <span className="intro-strip__number">01</span>
          <p>Whether you manage a server or join a giveaway, you deserve to know what to expect. These documents keep that answer close.</p>
          <span className="intro-strip__mark"><span /><span /><span /></span>
        </div>
      </section>

      <section className="documents-section section-wrap">
        <div className="section-heading">
          <SectionEyebrow icon={<BookOpen size={15} strokeWidth={1.7} />}>The essentials</SectionEyebrow>
          <h2>Two documents.<br /><em>One clear standard.</em></h2>
        </div>
        <div className="document-list">
          <Link href="/terms" className="document-row" data-testid="card-terms">
            <div className="document-row__index">01</div>
            <div className="document-row__icon"><FileText size={22} strokeWidth={1.5} /></div>
            <div className="document-row__body">
              <h3>Terms of Service</h3>
              <p>The rules for using Melastar in your Discord community, including responsibilities, fair use, and important limitations.</p>
            </div>
            <div className="document-row__action"><span>Read document</span><ArrowUpRight size={18} strokeWidth={1.6} /></div>
          </Link>
          <Link href="/privacy" className="document-row document-row--privacy" data-testid="card-privacy">
            <div className="document-row__index">02</div>
            <div className="document-row__icon"><LockKeyhole size={22} strokeWidth={1.5} /></div>
            <div className="document-row__body">
              <h3>Privacy Policy</h3>
              <p>What information Melastar handles, why it is needed, how long it stays around, and the choices available to you.</p>
            </div>
            <div className="document-row__action"><span>Read document</span><ArrowUpRight size={18} strokeWidth={1.6} /></div>
          </Link>
        </div>
      </section>

      <section className="principles-section">
        <div className="section-wrap principles-layout">
          <div className="principles-label">
            <span className="principles-label__line" />
            <span>Our approach</span>
          </div>
          <div className="principles-copy">
            <h2>Plain language is<br /><em>a product decision.</em></h2>
            <p>Legal pages do important work. They should not make you work hard to understand them. Melastar’s public policies are organized around the questions people actually ask before they add a bot or enter a giveaway.</p>
            <div className="principle-points">
              <div><Check size={16} strokeWidth={2} /><span>Written for server owners and participants</span></div>
              <div><Check size={16} strokeWidth={2} /><span>Direct links for Discord review</span></div>
              <div><Check size={16} strokeWidth={2} /><span>Updated when our practices change</span></div>
            </div>
          </div>
          <div className="principles-aside">
            <Clock3 size={19} strokeWidth={1.5} />
            <span>Take your time.<br />There is no fine print race.</span>
          </div>
        </div>
      </section>

      <section className="home-close section-wrap">
        <div className="home-close__rule" />
        <SectionEyebrow>Looking for something specific?</SectionEyebrow>
        <div className="home-close__line">
          <h2>Start with the<br /><em>document that fits.</em></h2>
          <Link href="/privacy" className="button button--outline" data-testid="link-start-privacy">
            View Privacy Policy <ArrowUpRight size={17} strokeWidth={1.8} />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

type PolicySection = {
  id: string;
  title: string;
  children: ReactNode;
};

function PolicyLayout({ kind, title, intro, updated, sections }: { kind: 'terms' | 'privacy'; title: string; intro: string; updated: string; sections: PolicySection[] }) {
  const isTerms = kind === 'terms';
  return (
    <PageShell>
      <Meta
        title={`${title} — Melastar Legal`}
        description={intro}
        path={isTerms ? '/terms' : '/privacy'}
      />
      <div className="policy-hero">
        <div className="section-wrap policy-hero__inner">
          <Link href="/" className="back-link" data-testid={`link-back-${kind}`}><ChevronRight size={15} className="back-link__icon" /> Legal home</Link>
          <div className="policy-hero__content">
            <SectionEyebrow icon={isTerms ? <Gavel size={15} strokeWidth={1.7} /> : <LockKeyhole size={15} strokeWidth={1.7} />}>
              {isTerms ? 'Agreement' : 'Your information'}
            </SectionEyebrow>
            <h1>{title}</h1>
            <p>{intro}</p>
            <div className="policy-meta"><span>Melastar</span><span className="meta-dot" /><span>Last updated {updated}</span></div>
          </div>
          <div className="policy-hero__number">{isTerms ? '01' : '02'}</div>
        </div>
      </div>
      <div className="section-wrap policy-layout">
        <aside className="policy-aside" aria-label="On this page">
          <span className="aside-label">On this page</span>
          <nav className="policy-contents">
            {sections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id} data-testid={`link-section-${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>{section.title}
              </a>
            ))}
          </nav>
          <div className="aside-note"><ShieldCheck size={16} strokeWidth={1.6} /><span>Designed to be<br />read, not decoded.</span></div>
        </aside>
        <article className="policy-article">
          <p className="policy-lead">{intro}</p>
          {sections.map((section) => (
            <section className="policy-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              <div className="policy-section__body">{section.children}</div>
            </section>
          ))}
          <div className="policy-end">
            <div className="policy-end__mark"><Mark small /></div>
            <p>Thank you for taking the time to understand how Melastar works.</p>
          </div>
          <div className="policy-switch">
            <span>{isTerms ? 'Next document' : 'Related document'}</span>
            <Link href={isTerms ? '/privacy' : '/terms'} data-testid={`link-related-${kind}`}>
              {isTerms ? 'Privacy Policy' : 'Terms of Service'} <ArrowUpRight size={16} strokeWidth={1.7} />
            </Link>
          </div>
        </article>
      </div>
    </PageShell>
  );
}

function Terms() {
  const sections: PolicySection[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of these terms',
      children: <><p>These Terms of Service govern your use of Melastar, a Discord bot that helps communities organize giveaways. By adding Melastar to a Discord server, configuring it, or participating in a giveaway managed through it, you agree to these Terms.</p><p>If you are using Melastar on behalf of a server, organization, or community, you confirm that you have permission to do so and that you can accept these Terms for that community.</p></>,
    },
    {
      id: 'the-service',
      title: '2. What Melastar does',
      children: <><p>Melastar provides tools for creating, managing, and joining giveaways within Discord servers. Its features may include giveaway setup, entry collection, eligibility checks, winner selection, and result announcements.</p><p>Features can change over time. We may add, modify, or remove functionality to keep the service reliable and useful.</p></>,
    },
    {
      id: 'responsibilities',
      title: '3. Your responsibilities',
      children: <><p>Use Melastar lawfully and in a way that respects the people in your community. Server owners and moderators are responsible for:</p><ul><li>Communicating giveaway rules, eligibility requirements, deadlines, and prizes clearly.</li><li>Ensuring that giveaways follow Discord’s rules and applicable laws.</li><li>Making sure prizes are available as described and delivered as promised.</li><li>Using only the permissions Melastar needs to perform its stated functions.</li></ul><p>Participants are responsible for providing accurate information when a giveaway requires it and for following the rules published by the server hosting that giveaway.</p></>,
    },
    {
      id: 'fair-use',
      title: '4. Fair use and prohibited conduct',
      children: <><p>You may not use Melastar to impersonate another person or service, run deceptive or fraudulent promotions, harass participants, manipulate winner selection, collect information without a proper reason, or interfere with the service or its infrastructure.</p><p>We may restrict or discontinue access when we reasonably believe use is abusive, unlawful, harmful to other users, or likely to put Melastar or Discord communities at risk.</p></>,
    },
    {
      id: 'availability',
      title: '5. Availability and disclaimers',
      children: <><p>Melastar is provided on an “as available” basis. We work to keep it dependable, but we cannot promise uninterrupted operation, error-free results, or that every feature will always be available.</p><p>Melastar is not a party to agreements between a server owner and a giveaway participant. We do not guarantee the quality, safety, legality, or delivery of any prize. Questions about a giveaway should first be directed to the server that hosted it.</p></>,
    },
    {
      id: 'changes',
      title: '6. Changes to these terms',
      children: <><p>We may update these Terms when the service or our practices change. The “Last updated” date at the top will show when the current version took effect. Continuing to use Melastar after an update means you accept the revised Terms.</p><p>If you do not agree with an update, remove Melastar from your server and stop using the service.</p></>,
    },
    {
      id: 'contact',
      title: '7. Questions',
      children: <p>If you have a question about these Terms or a problem with Melastar, contact the Melastar team through the support channel associated with the bot. Please include enough context for us to understand the issue, but do not send passwords, payment details, or other sensitive information.</p>,
    },
  ];
  return <PolicyLayout kind="terms" title="Terms of Service" intro="The rules for using Melastar responsibly in Discord communities." updated="January 18, 2025" sections={sections} />;
}

function Privacy() {
  const sections: PolicySection[] = [
    {
      id: 'overview',
      title: '1. The short version',
      children: <><p>Melastar handles the minimum information needed to operate giveaway features in Discord. We do not sell personal information, and we do not use giveaway participation data to build advertising profiles.</p><p>This policy explains what may be handled when Melastar is installed in a server or used by a participant, why it is needed, and what choices you have.</p></>,
    },
    {
      id: 'information',
      title: '2. Information Melastar handles',
      children: <><p>Depending on how a server uses Melastar, this may include:</p><ul><li><strong>Discord identifiers:</strong> server, channel, user, role, and message identifiers needed to recognize where a giveaway belongs and who entered it.</li><li><strong>Configuration:</strong> giveaway rules, entry requirements, dates, prize descriptions, and status set by a server owner or moderator.</li><li><strong>Participation records:</strong> whether a Discord user entered a giveaway and information needed to select or contact a winner.</li><li><strong>Technical information:</strong> limited logs such as event times and error details used to maintain reliability and prevent abuse.</li></ul><p>Melastar does not need your Discord password. Do not provide it to us.</p></>,
    },
    {
      id: 'use',
      title: '3. How we use information',
      children: <><p>We use information to provide and protect the service, including to:</p><ul><li>Store and display giveaway configuration and results.</li><li>Determine eligibility and select winners according to the server’s published rules.</li><li>Respond to support requests and diagnose errors.</li><li>Protect Melastar and communities from spam, fraud, and misuse.</li><li>Understand service reliability and improve features using aggregated or de-identified information where practical.</li></ul></>,
    },
    {
      id: 'sharing',
      title: '4. When information is shared',
      children: <><p>Melastar may display giveaway details, entries, and results to people in the Discord server where the giveaway is hosted, because that is how the feature works. Server owners and moderators control the giveaways they create and may be able to see related participation information through Discord or Melastar.</p><p>We may share limited information with service providers that help us host, secure, or operate Melastar. They may use it only to provide services to us. We may also disclose information when required by law or needed to protect users, the service, or the public.</p></>,
    },
    {
      id: 'retention',
      title: '5. Retention and security',
      children: <><p>We keep information for as long as it is reasonably needed to provide the relevant feature, maintain a trustworthy record of service activity, resolve disputes, or meet legal and security needs. Retention can vary by data type and by whether a server continues to use Melastar.</p><p>We use reasonable safeguards designed to protect information. No online service can promise absolute security, so please use care when sharing information in public Discord channels.</p></>,
    },
    {
      id: 'choices',
      title: '6. Your choices',
      children: <><p>You can stop Melastar from handling new server activity by removing it from the server. If you are a participant, questions about a giveaway or a server’s records should generally be directed to that server’s owner or moderators first.</p><p>For requests about information Melastar directly controls, contact the Melastar team through the support channel associated with the bot. We may need to verify the request and may retain limited information where the law or security requires it.</p></>,
    },
    {
      id: 'updates',
      title: '7. Updates to this policy',
      children: <><p>We may revise this Privacy Policy when our service or information practices change. We will update the date shown at the top so you can tell which version is current. If a change is important, we will take reasonable steps to make it noticeable.</p></>,
    },
  ];
  return <PolicyLayout kind="privacy" title="Privacy Policy" intro="A plain-language look at the information Melastar handles and the choices available to you." updated="January 18, 2025" sections={sections} />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;