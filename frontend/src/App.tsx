import { useEffect } from 'react'
import { BrowserRouter, NavLink, Route, Routes, Link, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BookOpen, CodeXml, GitBranch, LayoutDashboard, Map, ShieldCheck, Waypoints } from 'lucide-react'
import { Overview } from './Overview'
import { RoadmapPage } from './features/curriculum/RoadmapPage'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } })
export function App() {
  return <QueryClientProvider client={queryClient}><BrowserRouter><AppRoutes /></BrowserRouter></QueryClientProvider>
}
export function AppRoutes() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo?.(0, 0)
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [location.pathname])
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Link className="brand" to="/" aria-label="DevQuest home"><span className="brand-mark"><CodeXml size={23} /></span>DevQuest<span className="brand-period">.</span></Link>
      <div className="workspace-label">PERSONAL WORKSPACE</div>
      <nav aria-label="Main navigation">
        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`} to="/" end><LayoutDashboard size={18} />Overview</NavLink>
        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`} to="/roadmap"><Map size={18} />Roadmap</NavLink>
        <div className="nav-item upcoming"><BookOpen size={18} />Lesson workspace</div>
        <div className="nav-item upcoming"><Waypoints size={18} />Security lab</div>
      </nav>
      <div className="sidebar-note"><GitBranch size={18} /><div><strong>Built one milestone at a time.</strong><p>A focused space to learn, build, and understand.</p></div></div>
      <div className="profile"><div className="avatar">E</div><div><strong>Ekrem’s workspace</strong><span>Local · Single user</span></div><ShieldCheck size={17} /></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><span className="breadcrumb">Workspace / {location.pathname.startsWith('/roadmap') ? 'Learning roadmap' : 'Overview'}</span><span className="local-badge"><ShieldCheck size={14} />Local environment</span></header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/roadmap/modules/:moduleId" element={<RoadmapPage />} />
          <Route path="/roadmap/sessions/:sessionId" element={<RoadmapPage />} />
          <Route path="/roadmap/competencies" element={<RoadmapPage />} />
          <Route path="*" element={<div className="empty-state"><h1>Page not found</h1><Link to="/roadmap">Return to roadmap</Link></div>} />
        </Routes>
      </main>
    </div>
  </div>
}
