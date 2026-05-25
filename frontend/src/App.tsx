import { useEffect, useRef, useState } from 'react'
import { Cpu, MemoryStick, Clock, Shield, RefreshCw } from 'lucide-react'
import {
  fetchSystem, fetchVersion, fetchConfig, fetchConnections, fetchSDAHealth,
  type SyncthingSystem, type SyncthingFolder, type SyncthingDevice, type SyncthingConnections,
} from './api/syncthing'
import { Sidebar, type SidebarSection } from './components/Sidebar'
import { MetricCard } from './components/MetricCard'
import { NodeIdentityCard } from './components/NodeIdentityCard'
import { FolderList } from './components/FolderList'
import { PeerList } from './components/PeerList'
import { EventFeed } from './components/EventFeed'

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

function formatMem(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

function SectionHeader({ title, accent, count }: { title: string; accent: string; count?: number }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">
      <span className={`inline-block w-1 h-5 rounded ${accent}`} />
      {title}
      {count !== undefined && (
        <span className="ml-auto font-mono text-xs bg-[#161b22] border border-white/5 px-2.5 py-0.5 rounded-full text-slate-400 normal-case tracking-normal">
          {count}
        </span>
      )}
    </h2>
  )
}

export default function App() {
  const [system, setSystem] = useState<SyncthingSystem | null>(null)
  const [version, setVersion] = useState<string>('')
  const [folders, setFolders] = useState<SyncthingFolder[]>([])
  const [devices, setDevices] = useState<SyncthingDevice[]>([])
  const [connections, setConnections] = useState<SyncthingConnections | null>(null)
  const [sdaStatus, setSdaStatus] = useState<string>('unknown')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<SidebarSection>('overview')

  const loadingRef = useRef(false)

  const load = async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setIsRefreshing(true)
    try {
      const [sys, ver, cfg, conn, sda] = await Promise.all([
        fetchSystem(),
        fetchVersion(),
        fetchConfig(),
        fetchConnections(),
        fetchSDAHealth().catch(() => ({ status: 'unreachable', offline_ready: false })),
      ])
      setSystem(sys)
      setVersion(ver.version)
      setFolders(cfg.folders ?? [])
      setDevices(cfg.devices ?? [])
      setConnections(conn)
      setSdaStatus(sda.status)
      setLastRefresh(new Date())
      setError(null)
    } catch {
      setError('Impossible de joindre Syncthing. Vérifiez que le conteneur est démarré.')
    } finally {
      setIsRefreshing(false)
      loadingRef.current = false
    }
  }

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 10_000)
    return () => clearInterval(timer)
  }, [])

  const connectedPeers = connections
    ? Object.values(connections.connections).filter((c) => c.connected).length
    : 0
  const totalPeers = Math.max(0, devices.length - 1)

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="flex flex-col gap-6 lg:gap-8">
            {system && (
              <NodeIdentityCard
                deviceId={system.myID}
                version={`Syncthing ${version}`}
                os={system.os}
                arch={system.arch}
                connectedPeers={connectedPeers}
                totalPeers={totalPeers}
              />
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={Cpu}
                label="CPU"
                value={system ? `${system.cpuPercent.toFixed(1)}%` : '—'}
                sub="utilisation"
                accent={system && system.cpuPercent > 80 ? 'text-rose-400' : 'text-emerald-400'}
                loading={!system}
              />
              <MetricCard
                icon={MemoryStick}
                label="Mémoire"
                value={system ? formatMem(system.mem) : '—'}
                sub="consommée"
                accent="text-blue-400"
                loading={!system}
              />
              <MetricCard
                icon={Clock}
                label="Uptime"
                value={system ? formatUptime(system.uptime) : '—'}
                sub="depuis démarrage"
                accent="text-violet-400"
                loading={!system}
              />
              <MetricCard
                icon={Shield}
                label="Pairs actifs"
                value={String(connectedPeers)}
                sub={`/ ${totalPeers} configurés`}
                accent={connectedPeers > 0 ? 'text-emerald-400' : 'text-slate-400'}
                loading={!system}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div>
                <SectionHeader title="Dossiers synchronisés" accent="bg-blue-500" count={folders.length} />
                <FolderList folders={folders} loading={!system} />
              </div>
              <div>
                <SectionHeader title="Appareils pairs" accent="bg-purple-500" count={totalPeers} />
                <PeerList devices={devices} connections={connections} myID={system?.myID ?? ''} />
              </div>
            </div>

            <EventFeed />
          </div>
        )

      case 'folders':
        return (
          <div>
            <SectionHeader title="Dossiers synchronisés" accent="bg-blue-500" count={folders.length} />
            <FolderList folders={folders} loading={!system} />
          </div>
        )

      case 'peers':
        return (
          <div>
            <SectionHeader title="Appareils pairs" accent="bg-purple-500" count={totalPeers} />
            <PeerList devices={devices} connections={connections} myID={system?.myID ?? ''} />
          </div>
        )

      case 'events':
        return <EventFeed />
    }
  }

  return (
    <div className="flex h-screen bg-[#0d1117] text-[#e6edf3] overflow-hidden">

      <Sidebar
        active={activeSection}
        onNavigate={setActiveSection}
        sdaStatus={sdaStatus}
        version={version ? `Syncthing ${version}` : ''}
        folderCount={folders.length}
        peerCount={totalPeers}
        connectedPeers={connectedPeers}
      />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 h-12 border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md flex items-center px-4 sm:px-6 gap-3">
          {/* Mobile spacer for hamburger button */}
          <div className="w-9 lg:hidden" />

          <h1 className="text-base font-semibold text-[#e6edf3] truncate">
            {activeSection === 'overview' && 'Vue d\'ensemble'}
            {activeSection === 'folders' && 'Dossiers synchronisés'}
            {activeSection === 'peers' && 'Appareils pairs'}
            {activeSection === 'events' && 'Journal d\'événements'}
          </h1>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="hidden sm:block text-sm text-slate-500 font-mono tabular-nums">
              {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>

            <button
              onClick={() => { void load() }}
              disabled={isRefreshing}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
              title="Rafraîchir"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {renderContent()}

            <footer className="border-t border-white/5 mt-10 pt-4 text-center text-[11px] text-slate-700 pb-4 space-y-1">
              <p>SDA v1.0 · EIGSI 2025–2026 · Jesse MPIGA-ODOUMBA</p>
              <p>Local-first / P2P · Aucune dépendance centrale</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
