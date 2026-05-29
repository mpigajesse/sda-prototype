import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SDAProvider } from './contexts/SDAContext'

const OverviewPage  = lazy(() => import('./pages/OverviewPage'))
const FoldersPage   = lazy(() => import('./pages/FoldersPage'))
const PeersPage     = lazy(() => import('./pages/PeersPage'))
const EventsPage    = lazy(() => import('./pages/EventsPage'))
const FilesPage     = lazy(() => import('./pages/FilesPage'))
const ClusterPage   = lazy(() => import('./pages/ClusterPage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20 text-slate-500 text-sm gap-2">
      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeLinecap="round" />
      </svg>
      Chargement…
    </div>
  )
}

export default function App() {
  return (
    <SDAProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Suspense fallback={<PageLoader />}><OverviewPage /></Suspense>} />
          <Route path="/folders"  element={<Suspense fallback={<PageLoader />}><FoldersPage /></Suspense>} />
          <Route path="/peers"    element={<Suspense fallback={<PageLoader />}><PeersPage /></Suspense>} />
          <Route path="/events"   element={<Suspense fallback={<PageLoader />}><EventsPage /></Suspense>} />
          <Route path="/files"    element={<Suspense fallback={<PageLoader />}><FilesPage /></Suspense>} />
          <Route path="/cluster"  element={<Suspense fallback={<PageLoader />}><ClusterPage /></Suspense>} />
          <Route path="*"         element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </SDAProvider>
  )
}
