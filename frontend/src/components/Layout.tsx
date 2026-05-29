import { Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useSDA } from '../contexts/SDAContext'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/overview': 'Vue d\'ensemble',
  '/': 'Vue d\'ensemble',
  '/cluster':  'Architecture P2P — Cluster SDA',
  '/folders':  'Dossiers synchronisés',
  '/peers':    'Appareils pairs',
  '/events':   'Journal d\'événements',
  '/files':    'Coffre-fort de fichiers',
}

export function Layout() {
  const { sdaStatus, version, folders, totalPeers, connectedPeers, lastRefresh, isRefreshing, error, refresh } = useSDA()
  const location = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'SDA'

  return (
    <div className="flex h-screen bg-[#0D0A07] text-[#e6edf3] overflow-hidden">
      <Sidebar
        sdaStatus={sdaStatus}
        version={version ? `Syncthing ${version}` : ''}
        folderCount={folders.length}
        peerCount={totalPeers}
        connectedPeers={connectedPeers}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="shrink-0 h-12 bg-[#0D0A07]/95 backdrop-blur-md flex items-center px-4 sm:px-6 gap-3 border-b border-[#2E1F14]">
          <div className="w-9 lg:hidden" />
          <h1 className="text-base font-semibold text-[#e6edf3] truncate">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-sm text-slate-500 font-mono tabular-nums">
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-red-500/10 rounded-xl text-red-400 text-sm shrink-0 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="w-full">
            <Outlet />
            <footer className="mt-10 pt-4 text-center text-[11px] text-slate-700 pb-4 space-y-1">
              <p>SDA v1.0 · EIGSI 2025–2026 · Jesse MPIGA-ODOUMBA</p>
              <p>Local-first / P2P · Aucune dépendance centrale</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
