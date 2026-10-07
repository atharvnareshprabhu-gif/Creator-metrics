import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowDownToLine, ArrowUpRight, BarChart3, ChevronDown, CircleHelp, Copy, Mail, Moon, Sparkles, Sun } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();

type Niche = 'Finance' | 'Tech' | 'Fashion' | 'Comedy' | 'Memes';
type HistoryPoint = { id: number; time: number; er: number; niche: Niche; followers: number; price: number };
const niches: { name: Niche; multiplier: number; benchmark: number }[] = [
  { name: 'Finance', multiplier: 1.5, benchmark: 3.5 },
  { name: 'Tech', multiplier: 1.5, benchmark: 3.2 },
  { name: 'Fashion', multiplier: 1, benchmark: 4.2 },
  { name: 'Comedy', multiplier: 0.75, benchmark: 5.1 },
  { name: 'Memes', multiplier: 0.5, benchmark: 6.3 },
];
const HISTORY_KEY = 'creatormetrics-history-v1';
const THEME_KEY = 'creatormetrics-theme-v1';
const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n: number) => `₹${numberFormat.format(Math.round(n))}`;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function IconButton({ children, onClick, label, testId }: { children: React.ReactNode; onClick: () => void; label: string; testId: string }) {
  return <button className="icon-button" type="button" onClick={onClick} aria-label={label} data-testid={testId}>{children}</button>;
}

function Home() {
  const [followers, setFollowers] = useState('18000');
  const [likes, setLikes] = useState('730');
  const [comments, setComments] = useState('64');
  const [niche, setNiche] = useState<Niche>('Finance');
  const [isDirty, setIsDirty] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[]>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? (JSON.parse(saved) as HistoryPoint[]).slice(0, 5) : [];
    } catch { return []; }
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
  });
  const [pitch, setPitch] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const lastSnapshot = useRef('');

  const followerCount = Math.max(0, Number(followers) || 0);
  const likeCount = Math.max(0, Number(likes) || 0);
  const commentCount = Math.max(0, Number(comments) || 0);
  const selectedNiche = niches.find((item) => item.name === niche) ?? niches[0];
  const er = followerCount > 0 ? ((likeCount + commentCount) / followerCount) * 100 : 0;
  const tier = er < 2 ? { title: 'Rising Star 🌟', line: 'Thodi aur mehnat karo!' } : er <= 5 ? { title: 'Viral King/Queen 🔥', line: 'Your community is showing up.' } : { title: 'Elite Influencer 👑', line: 'That connection is something special.' };
  const erFactor = clamp(er / 3, 0.5, 2.5);
  const basePrice = followerCount * 0.05 * erFactor * selectedNiche.multiplier;
  const lowPrice = basePrice * 0.8;
  const highPrice = basePrice * 1.2;
  const benchmarkGap = er - selectedNiche.benchmark;
  const benchmarkMessage = Math.abs(benchmarkGap) < 0.05
    ? 'You are right around the niche average.'
    : `${Math.abs(benchmarkGap).toFixed(1)} percentage points ${benchmarkGap > 0 ? 'above' : 'below'} the ${niche.toLowerCase()} average.`;

  const chartPoints = useMemo(() => history.slice(0, 5).reverse(), [history]);
  const activePoint = chartPoints.find((point) => point.id === selectedPoint) ?? chartPoints[chartPoints.length - 1];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* local preference is optional */ }
  }, [theme]);

  useEffect(() => {
    if (!isDirty || followerCount <= 0) return;
    const timer = window.setTimeout(() => {
      const snapshot = JSON.stringify({ followers: followerCount, likes: likeCount, comments: commentCount, niche, er: Number(er.toFixed(3)), price: Math.round(basePrice) });
      if (snapshot === lastSnapshot.current) return;
      lastSnapshot.current = snapshot;
      const point: HistoryPoint = { id: Date.now(), time: Date.now(), er: Number(er.toFixed(2)), niche, followers: followerCount, price: Math.round(basePrice) };
      setHistory((current) => {
        const next = [point, ...current].slice(0, 5);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* storage may be unavailable */ }
        return next;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [isDirty, followerCount, likeCount, commentCount, niche, er, basePrice]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    try {
      const win = window as Window & { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement> };
      if (!win.html2canvas) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>('script[data-html2canvas]');
          if (existing) {
            if (win.html2canvas) resolve();
            else {
              existing.addEventListener('load', () => resolve(), { once: true });
              existing.addEventListener('error', () => reject(new Error('load failed')), { once: true });
            }
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.async = true;
          script.dataset.html2canvas = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('load failed'));
          document.head.appendChild(script);
        });
      }
      if (!win.html2canvas) throw new Error('capture library unavailable');
      const canvas = await win.html2canvas(reportRef.current, { backgroundColor: theme === 'dark' ? '#1a2924' : '#f7f5ed', scale: 2, useCORS: true });
      const anchor = document.createElement('a');
      anchor.download = 'creator-metrics-report.png';
      anchor.href = canvas.toDataURL('image/png');
      anchor.click();
      setNotice('Your report card is ready to share.');
    } catch {
      setNotice('Could not load the report image tool. Check your connection and try again.');
    }
  };

  const makePitch = () => {
    setPitch(`Hi [Brand Name],\n\nI’m a ${niche.toLowerCase()} creator building an engaged community of ${numberFormat.format(followerCount)}. My Instagram engagement rate is ${er.toFixed(2)}%, and I’d love to explore a collaboration that feels like a natural fit for both of us.\n\nMy suggested rate for a sponsored post is ${formatINR(lowPrice)}–${formatINR(highPrice)}. I’d be happy to share a few creative ideas tailored to your next campaign.\n\nWould you be open to a quick conversation?\n\nBest,\n[Your Name]`);
    setNotice('A pitch draft is ready for your edits.');
  };

  const copyPitch = async () => {
    if (!pitch.trim()) {
      setNotice('Generate a pitch first, then make it yours.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pitch);
      setNotice('Pitch copied to your clipboard.');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = pitch;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      textArea.remove();
      setNotice(copied ? 'Pitch copied to your clipboard.' : 'Clipboard access is unavailable. Select and copy your pitch.');
    }
  };

  const pointCoords = chartPoints.map((point, index) => ({
    ...point,
    x: chartPoints.length === 1 ? 190 : 22 + (index * 336) / (chartPoints.length - 1),
    y: 104 - (clamp(point.er, 0, 10) / 10) * 82,
    label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(point.time),
  }));
  const graphLine = pointCoords.map((point) => `${point.x},${point.y}`).join(' ');
  const graphArea = pointCoords.length > 1 ? `22,108 ${graphLine} 358,108` : '';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="CreatorMetrics home">
          <span className="brand-mark"><BarChart3 size={18} strokeWidth={2.4} /></span>
          <span>creator<span style={{ color: 'hsl(var(--primary))' }}>metrics</span></span>
        </div>
        <div className="top-actions">
          <span className="theme-label" style={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>{theme === 'dark' ? 'Night mode' : 'Day mode'}</span>
          <IconButton onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} testId="button-theme-toggle">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </IconButton>
        </div>
      </header>
      <main className="page-wrap">
        <section className="intro">
          <div>
            <p className="eyebrow"><span className="eyebrow-dot" /> Your creator toolkit</p>
            <h1>Know your worth.<br /><span>Pitch with confidence.</span></h1>
            <p className="intro-copy">A little clarity goes a long way. Get a fair rate estimate, see how your community stacks up, and take a ready-to-personalize pitch to your next brand conversation.</p>
          </div>
          <div className="hello-pill">Made for creators, by your side</div>
        </section>

        <div className="main-grid">
          <section className="panel input-panel" aria-labelledby="input-heading">
            <div className="panel-heading">
              <div><h2 id="input-heading">Your Instagram snapshot</h2><p>Just a few numbers to get you started.</p></div>
              <span className="step-mark">01</span>
            </div>
            <div className="field-list">
              <label>
                <span className="field-label">Followers <span className="field-note">Your community size</span></span>
                <span className="input-wrap"><input type="number" min="0" step="1" value={followers} onChange={(e) => { setFollowers(e.target.value); setIsDirty(true); }} data-testid="input-followers" aria-label="Instagram followers" /></span>
              </label>
              <label>
                <span className="field-label">Average likes <span className="field-note">Per post</span></span>
                <span className="input-wrap"><input type="number" min="0" step="1" value={likes} onChange={(e) => { setLikes(e.target.value); setIsDirty(true); }} data-testid="input-average-likes" aria-label="Average likes per post" /></span>
              </label>
              <label>
                <span className="field-label">Average comments <span className="field-note">Per post</span></span>
                <span className="input-wrap"><input type="number" min="0" step="1" value={comments} onChange={(e) => { setComments(e.target.value); setIsDirty(true); }} data-testid="input-average-comments" aria-label="Average comments per post" /></span>
              </label>
              <label>
                <span className="field-label">Your niche <span className="field-note">Shapes your rate estimate</span></span>
                <span className="input-wrap">
                  <select className="field-select" value={niche} onChange={(e) => { setNiche(e.target.value as Niche); setIsDirty(true); }} data-testid="select-niche" aria-label="Creator niche">
                    {niches.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.multiplier.toFixed(item.multiplier % 1 ? 1 : 0)}× niche factor</option>)}
                  </select>
                  <ChevronDown className="select-chevron" size={16} />
                </span>
              </label>
            </div>
          </section>

          <section className="panel result-panel report-card" ref={reportRef} aria-labelledby="result-heading" data-testid="section-report-card">
            <div className="result-top">
              <div>
                <p className="eyebrow"><span className="eyebrow-dot" /> Your creator snapshot</p>
                <div className="result-title" id="result-heading">Your community is your value.</div>
                <p className="tier-message" data-testid="text-tier-message">{tier.line}</p>
              </div>
              <span className="tier-badge" data-testid="badge-engagement-tier">{tier.title}</span>
            </div>
            <div className="rate-box">
              <div className="rate-label">Suggested rate per sponsored post</div>
              <div className="rate-value" data-testid="text-price-range">{formatINR(lowPrice)} – {formatINR(highPrice)}</div>
              <div className="rate-foot"><span>Estimated range · INR</span><span>+ your creative spark</span></div>
            </div>
            <div className="result-metrics">
              <div className="metric-tile"><div className="metric-label">Engagement rate</div><div className="metric-value" data-testid="text-engagement-rate">{er.toFixed(2)}%</div></div>
              <div className="metric-tile"><div className="metric-label">Niche multiplier</div><div className="metric-value" data-testid="text-niche-multiplier">{selectedNiche.multiplier.toFixed(selectedNiche.multiplier % 1 ? 1 : 0)}×</div></div>
            </div>
            <div className="result-bottom">
              <button type="button" className="button-primary" onClick={handleDownload} data-testid="button-download-report"><ArrowDownToLine size={15} /> Download report card</button>
              <button type="button" className="button-quiet" onClick={makePitch} data-testid="button-generate-brand-pitch-results"><Mail size={15} /> Generate brand pitch</button>
            </div>
          </section>
        </div>

        <div className="below-grid">
          <section className="panel benchmark-panel" aria-labelledby="benchmark-heading">
            <div className="subheading-row">
              <div><h2 id="benchmark-heading">Your niche, in perspective</h2><p>Engagement averages give your numbers context.</p></div>
              <span className="compare-chip">{niche} selected</span>
            </div>
            <div className="bench-list" data-testid="list-niche-benchmarks">
              {niches.map((item) => <div className={`bench-item ${item.name === niche ? 'selected' : ''}`} key={item.name} data-testid={`benchmark-${item.name.toLowerCase()}`}>
                <div className="bench-name">{item.name}</div><div className="bench-value">{item.benchmark.toFixed(1)}%</div><div className="bench-unit">avg. engagement</div>
              </div>)}
            </div>
            <p className={`benchmark-note ${benchmarkGap >= 0 ? 'above' : 'below'}`} role="status"><ArrowUpRight size={14} /> <span><strong>{er.toFixed(2)}% vs. {selectedNiche.benchmark.toFixed(1)}%</strong> {benchmarkMessage}</span></p>
          </section>
          <section className="panel trend-panel" aria-labelledby="trend-heading">
            <div className="trend-head">
              <div className="subheading-row" style={{ marginBottom: 0 }}><div><h2 id="trend-heading">Your weekly progress</h2><p>Small wins add up.</p></div></div>
              <div className="trend-stat" data-testid="text-trend-current">{activePoint ? `${activePoint.er.toFixed(2)}%` : '—'}</div>
            </div>
            {pointCoords.length ? (
              <div className="chart-wrap" data-testid="chart-weekly-progress">
                <svg viewBox="0 0 380 132" role="img" aria-label="Interactive recent engagement rate trend">
                  <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".22" /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" /></linearGradient></defs>
                  {[25, 64, 103].map((y) => <line key={y} x1="22" x2="358" y1={y} y2={y} className="chart-grid" />)}
                  {pointCoords.length > 1 && <polygon points={graphArea} className="chart-area" />}
                  {pointCoords.length > 1 && <polyline points={graphLine} className="chart-line" />}
                  {pointCoords.map((point) => <g key={point.id} onClick={() => setSelectedPoint(point.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedPoint(point.id); } }} tabIndex={0} role="button" aria-label={`${point.label}: ${point.er}% engagement`}>
                    <title>{point.label}: {point.er.toFixed(2)}% · {point.niche}</title>
                    <circle cx={point.x} cy={point.y} r={selectedPoint === point.id ? 6 : 4.5} className="chart-point" />
                    {pointCoords.length <= 5 && <text x={point.x} y="127" textAnchor="middle" className="chart-label">{point.label}</text>}
                  </g>)}
                </svg>
              </div>
            ) : (
              <div className="empty-chart" data-testid="empty-weekly-progress">
                <div className="empty-chart-mark"><BarChart3 size={17} /></div>
                <strong>Your first check-in starts the line.</strong>
                <span>Change a number to save a progress point.</span>
              </div>
            )}
          </section>
        </div>

        <section className="panel pitch-panel" aria-labelledby="pitch-heading">
          <div className="pitch-intro">
            <p className="eyebrow"><span className="eyebrow-dot" /> Make the first move</p>
            <h2 id="pitch-heading">A good pitch sounds like you.</h2>
            <p>Start with a thoughtful draft, then add the little details only you know.</p>
            <div className="pitch-actions">
              <button type="button" className="button-secondary" onClick={makePitch} data-testid="button-generate-brand-pitch"><Sparkles size={15} /> Generate brand pitch</button>
              <button type="button" className="button-secondary" onClick={copyPitch} data-testid="button-copy-pitch"><Copy size={14} /> Copy</button>
            </div>
          </div>
          <div className="pitch-editor">
            <label className="sr-only" htmlFor="pitch-text">Editable brand pitch</label>
            <textarea id="pitch-text" value={pitch} onChange={(e) => setPitch(e.target.value)} placeholder="Your pitch draft will appear here. Generate one to get started, then make it sound like you." data-testid="textarea-brand-pitch" />
            <div className="pitch-note"><span>Editable by design. Make this pitch yours.</span><span data-testid="text-pitch-characters">{pitch.length} characters</span></div>
          </div>
        </section>

        <footer className="footer">
          <div className="formula"><CircleHelp size={15} /><span><strong>How we estimate:</strong> followers × ₹0.05 × engagement factor (ER ÷ 3, clamped 0.5–2.5) × niche factor. At 3% ER, that’s ₹0.05 per follower before niche adjustment. Range is ±20%.</span></div>
          <div className="footer-mark">Your work. Your worth.</div>
        </footer>
      </main>
      {notice && <div className="notice" role="status" data-testid="status-notice">{notice}</div>}
    </div>
  );
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
