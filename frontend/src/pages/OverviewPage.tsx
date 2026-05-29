import { Cpu, MemoryStick, Clock, Radio } from 'lucide-react'
import { MetricCard } from '../components/MetricCard'
import { NodeIdentityCard } from '../components/NodeIdentityCard'
import { FolderList } from '../components/FolderList'
import { PeerList } from '../components/PeerList'
import { EventFeed } from '../components/EventFeed'
import { useSDA } from '../contexts/SDAContext'

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

function formatMem(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

function SectionLabel({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{children}</h2>
      {count !== undefined && (
        <span className="text-[10px] font-mono text-slate-600 bg-[#161b22] px-2 py-0.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.3)]">
          {count}
        </span>
      )}
    </div>
  )
}

export default function OverviewPage() {
  const { system, version, hostPlatform, folders, devices, connections, connectedPeers, totalPeers } = useSDA()

  return (
    <div className="flex flex-col gap-6">

      {/* ── Hero: Identité du nœud ─────────────────────────── */}
      {system && (
        <NodeIdentityCard
          deviceId={system.myID}
          version={`Syncthing ${version}`}
          hostPlatform={hostPlatform}
          connectedPeers={connectedPeers}
          totalPeers={totalPeers}
        />
      )}

      {/* ── Métriques système ─────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          value={system ? formatMem(system.alloc) : '—'}
          sub="consommée"
          accent="text-[#C79A1B]"
          loading={!system}
        />
        <MetricCard
          icon={Clock}
          label="Uptime"
          value={system ? formatUptime(system.uptime) : '—'}
          sub="depuis démarrage"
          accent="text-[#B3121B]"
          loading={!system}
        />
        <MetricCard
          icon={Radio}
          label="Pairs actifs"
          value={String(connectedPeers)}
          sub={`/ ${totalPeers} configurés`}
          accent={connectedPeers > 0 ? 'text-emerald-400' : 'text-slate-400'}
          loading={!system}
        />
      </div>

      {/* ── Bento: Dossiers + Pairs ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionLabel count={folders.length}>Dossiers synchronisés</SectionLabel>
          <FolderList folders={folders} loading={!system} />
        </div>
        <div>
          <SectionLabel count={totalPeers}>Appareils pairs</SectionLabel>
          <PeerList devices={devices} connections={connections} myID={system?.myID ?? ''} />
        </div>
      </div>

      {/* ── Activité temps réel ─────────────────────────────── */}
      <div>
        <SectionLabel>Activité récente</SectionLabel>
        <EventFeed />
      </div>

    </div>
  )
}
