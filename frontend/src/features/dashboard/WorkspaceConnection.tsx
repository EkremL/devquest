import { useEffect, useState } from 'react'
import { Check, Database, Layers3, RefreshCw, Server } from 'lucide-react'
import { fetchHealth, type Health } from '../../lib/health'
export function WorkspaceConnection() {
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

  return <section id="connection" className="connection-section" aria-labelledby="connection-title">
            <div className="section-heading"><div><h2 id="connection-title">Workspace connection</h2><p>Live status from your local application.</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'refreshing' : ''} />{loading ? 'Checking…' : 'Check connection'}</button></div>
            <div className="connection-summary" role="status" aria-live="polite"><span className={`status-dot ${connected ? 'online' : ''}`} />{statusText}<span className="checked-at">{checkedAt && !loading ? `Checked at ${checkedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span></div>
            {error && <p className="error-message" role="alert">The backend could not be reached. Start the backend and local database, then check again.</p>}
            {health?.status === 'DOWN' && <p className="error-message" role="alert">The backend responded, but a dependency is unavailable. Check the database and backend logs, then retry.</p>}
            <div className="status-grid">
              <StatusCard icon={<Server size={21} />} title="Backend API" detail="Spring Boot" state={loading ? 'Checking' : health ? 'Reachable' : 'Unavailable'} ok={!!health} />
              <StatusCard icon={<Database size={21} />} title="Database" detail="PostgreSQL" state={loading ? 'Checking' : health?.database === 'UP' ? 'Connected' : health ? 'Unavailable' : 'Not verified'} ok={health?.database === 'UP'} />
              <StatusCard icon={<Layers3 size={21} />} title="Schema migrations" detail="Managed by Flyway" state={loading ? 'Checking' : health?.migrations === 'UP' ? 'Up to date' : health?.migrations === 'DOWN' ? 'Needs attention' : 'Not verified'} ok={health?.migrations === 'UP'} />
            </div>
          </section>
}

function StatusCard({ icon, title, detail, state, ok }: { icon: React.ReactNode; title: string; detail: string; state: string; ok: boolean }) {
  return <article className="status-card"><div className="status-icon">{icon}</div><h3>{title}</h3><p>{detail}</p><span className={`state-pill ${ok ? 'state-good' : ''}`}>{ok && <Check size={13} />}{state}</span></article>
}
