import { lazy, Suspense, useEffect } from 'react'
import { createBrowserRouter, RouterProvider, NavLink, Route, Routes, Link, useLocation } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CodeXml, GitBranch, LayoutDashboard, Map, Network, ShieldCheck, Waypoints } from 'lucide-react'
import { Overview } from './Overview'
import { RoadmapPage } from './features/curriculum/RoadmapPage'
import { DataSafetyPage } from './features/data-safety/DataSafetyPage'
import { ReadingPage } from './features/learning/ReadingPage'
import { DraftWorkspace } from './features/learning/DraftWorkspace'
const SkillTreePage = lazy(() => import('./features/skill-tree/SkillAtlas'))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } })
let appRouter: ReturnType<typeof createBrowserRouter> | undefined
export function App() {
  appRouter ??= createBrowserRouter([{path:"*",element:<AppRoutes/>}])
  return <QueryClientProvider client={queryClient}><RouterProvider router={appRouter}/></QueryClientProvider>
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
        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`} to="/skill-tree"><Network size={18} />Skill tree</NavLink>
        <NavLink className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`} to="/data-safety"><ShieldCheck size={18} />Data safety</NavLink>
        <div className="nav-item upcoming"><Waypoints size={18} />Security lab</div>
      </nav>
      <div className="sidebar-note"><GitBranch size={18} /><div><strong>Built one milestone at a time.</strong><p>A focused space to learn, build, and understand.</p></div></div>
      <div className="profile"><div className="avatar">E</div><div><strong>Ekrem’s workspace</strong><span>Local · Single user</span></div><ShieldCheck size={17} /></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><span className="breadcrumb">Workspace / {location.pathname.startsWith('/roadmap') ? 'Learning roadmap' : location.pathname.endsWith('/assessment') ? 'Assessment' : location.pathname.startsWith('/learn/') ? 'Reading' : location.pathname === '/skill-tree' ? 'Skill tree' : location.pathname === '/data-safety' ? 'Data safety' : 'Overview'}</span><span className="local-badge"><ShieldCheck size={14} />Local environment</span></header>
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/data-safety" element={<DataSafetyPage />} />
          <Route path="/skill-tree" element={<Suspense fallback={<p className="empty-state" role="status">Loading skill tree…</p>}><SkillTreePage /></Suspense>} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/roadmap/modules/:moduleId" element={<RoadmapPage />} />
          <Route path="/roadmap/sessions/:sessionId" element={<RoadmapPage />} />
          <Route path="/learn/:sessionId/read" element={<ReadingPage />} />
          <Route path="/learn/:sessionId/assessment" element={<DraftWorkspace />} />
          <Route path="/roadmap/competencies" element={<RoadmapPage />} />
          <Route path="*" element={<div className="empty-state"><h1>Page not found</h1><Link to="/roadmap">Return to roadmap</Link></div>} />
        </Routes>
      </main>
    </div>
  </div>
}
