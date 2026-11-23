import { useEffect, useState } from 'react'
import { BookOpen, Braces, Check, ChevronRight, CircleDashed, CodeXml, Database, GitBranch, Layers3, LayoutDashboard, Map, RefreshCw, Server, ShieldCheck, Terminal, Waypoints } from 'lucide-react'
import { fetchHealth, type Health } from './lib/health'

export function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkedAt, setCheckedAt] = useState<Date | null>(null)

  async function refresh() {
    setLoading(true)
    setError(false)
    setHealth(null)
    try { setHealth(await fetchHealth()) }
    catch { setError(true) }
    finally { setLoading(false); setCheckedAt(new Date()) }
  }

  useEffect(() => { void refresh() }, [])
  const connected = health?.status === 'UP'
  const statusText = loading ? 'Checking connection' : connected ? 'Workspace connected' : 'Connection needs attention'

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href="#main" aria-label="DevQuest home"><span className="brand-mark"><CodeXml size={23} /></span>DevQuest<span className="brand-period">.</span></a>
        <div className="workspace-label">PERSONAL WORKSPACE</div>
        <nav aria-label="Main navigation">
          <a className="nav-item selected" href="#main" aria-current="page"><LayoutDashboard size={18} />Overview</a>
          <div className="nav-item upcoming"><Map size={18} />Roadmap<span>Next</span></div>
          <div className="nav-item upcoming"><BookOpen size={18} />Lesson workspace</div>
          <div className="nav-item upcoming"><Waypoints size={18} />Security lab</div>
        </nav>
        <div className="sidebar-note"><GitBranch size={18} /><div><strong>Built one milestone at a time.</strong><p>A focused space to learn, build, and understand.</p></div></div>
        <div className="profile"><div className="avatar">E</div><div><strong>Ekrem’s workspace</strong><span>Local · Single user</span></div><ShieldCheck size={17} /></div>
      </aside>

      <div className="main-area">
        <header className="topbar"><div className="breadcrumb">Workspace<ChevronRight size={14} /><span>Overview</span></div><span className="local-badge"><ShieldCheck size={14} />Local environment</span></header>
        <main id="main" tabIndex={-1}>
          <div className="page-heading"><div><p className="eyebrow">YOUR ENGINEERING JOURNEY</p><h1>A place to build understanding.</h1><p className="subtitle">Small steps. Real practice. Knowledge that stays with you.</p></div><span className="milestone-badge">M0 <span>Foundation</span></span></div>

          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy"><span className="hero-tag"><Layers3 size={15} />WORKSPACE FOUNDATION</span><h2 id="hero-title">Every great journey starts<br className="desktop-break" /> with solid foundations.</h2><p>Your personal learning environment is taking shape. This is the starting point for your Spring Security journey.</p><a className="primary-button" href="#connection"><Terminal size={17} />View workspace status</a><span className="hero-footnote">Your curriculum stays exactly as you left it.</span></div>
            <div className="architecture-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-tile tile-back"><Database size={31} /></div><div className="art-tile tile-front"><Braces size={51} /></div><div className="art-label">LEARN. BUILD. UNDERSTAND.</div><span className="art-spark spark-one">+</span><span className="art-spark spark-two">+</span></div>
          </section>

          <section id="connection" className="connection-section" aria-labelledby="connection-title">
            <div className="section-heading"><div><h2 id="connection-title">Workspace connection</h2><p>Live status from your local application.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'refreshing' : ''} />{loading ? 'Checking…' : 'Check connection'}</button></div>
            <div className="connection-summary" role="status" aria-live="polite"><span className={`status-dot ${connected ? 'online' : ''}`} />{statusText}<span className="checked-at">{checkedAt && !loading ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div>
            {error && <p className="error-message" role="alert">The backend could not be reached. Start the backend and local database, then check again.</p>}
            {health?.status === 'DOWN' && <p className="error-message" role="alert">The backend responded, but a dependency is unavailable. Check the database and backend logs, then retry.</p>}
            <div className="status-grid">
              <StatusCard icon={<Server size={21} />} title="Backend API" detail="Spring Boot" state={loading ? 'Checking' : health ? 'Reachable' : 'Unavailable'} ok={!!health} />
              <StatusCard icon={<Database size={21} />} title="Database" detail="PostgreSQL · devquest_db" state={loading ? 'Checking' : health?.database === 'UP' ? 'Connected' : health ? 'Unavailable' : 'Not verified'} ok={health?.database === 'UP'} />
              <StatusCard icon={<Layers3 size={21} />} title="Schema migrations" detail="Managed by Flyway" state={loading ? 'Checking' : health?.migrations === 'UP' ? 'Up to date' : health?.migrations === 'DOWN' ? 'Needs attention' : 'Not verified'} ok={health?.migrations === 'UP'} />
            </div>
          </section>

          <section className="bottom-grid" aria-label="What comes next">
            <article className="next-card"><div className="card-kicker"><Map size={18} />UP NEXT <span>M1</span></div><h2>Your roadmap, brought to life.</h2><p>Explore modules and sessions, update topic progress, and pick up where you left off.</p><div className="planned-state"><CircleDashed size={16} />Planned for the next milestone</div></article>
            <article className="principles-card"><h2>A workspace you can trust</h2><p>Designed around your learning, from day one.</p><ul><li><Check size={16} />Your existing curriculum is preserved</li><li><Check size={16} />Progress will reflect your real work</li><li><Check size={16} />A personal, local-first experience</li></ul></article>
          </section>
          <footer><span>DevQuest <span className="footer-divider">/</span> A little better, every session.</span><span>Foundation · v0.0.1</span></footer>
        </main>
      </div>
    </div>
  )
}

function StatusCard({ icon, title, detail, state, ok }: { icon: React.ReactNode; title: string; detail: string; state: string; ok: boolean }) {
  return <article className="status-card"><div className="status-icon">{icon}</div><h3>{title}</h3><p>{detail}</p><span className={`state-pill ${ok ? 'state-good' : ''}`}>{ok && <Check size={13} />}{state}</span></article>
}
