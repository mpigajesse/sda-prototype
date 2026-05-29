import { useState } from 'react'
import { Copy, Check, Wifi, Server, Cpu, GitBranch } from 'lucide-react'

interface NodeIdentityCardProps {
  deviceId: string
  version: string
  hostPlatform: string
  connectedPeers: number
  totalPeers: number
}

const COPY_FEEDBACK_MS = 2000
const MAX_PEER_DOTS = 10

function shortId(id: string): string {
  return id.split('-').slice(0, 2).join('-')
}

export function NodeIdentityCard({
  deviceId,
  version,
  hostPlatform,
  connectedPeers,
  totalPeers,
}: NodeIdentityCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(deviceId)
      setCopied(true)
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS)
    } catch { /* not available */ }
  }

  const visibleDots = Math.min(totalPeers, MAX_PEER_DOTS)

  const stats = [
    { icon: Server,   label: 'Version',    value: version || '—' },
    { icon: Cpu,      label: 'Plateforme', value: hostPlatform || '—' },
    { icon: Wifi,     label: 'Pairs',      value: `${connectedPeers} / ${totalPeers} connectés` },
    { icon: GitBranch,label: 'Mode',       value: 'Local-first · P2P' },
  ]

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.5)]">

      {/* Ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f1b2d] via-[#0d1117] to-[#111820]" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#B3121B]/8 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-[#C79A1B]/6 blur-3xl pointer-events-none" />

      {/* Mesh grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative p-6 lg:p-8">

        {/* Top row: badge + status */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C79A1B]/15 flex items-center justify-center shadow-[0_0_20px_rgba(199,154,27,0.2)]">
              <Server size={18} className="text-[#C79A1B]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Nœud SDA</p>
              <h2 className="text-lg font-bold text-slate-100 leading-tight">Identité du nœud</h2>
            </div>
          </div>

          {/* Live badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-emerald-400">Actif</span>
          </div>
        </div>

        {/* Device ID — hero element */}
        <div className="mb-6">
          <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2">Device ID</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 bg-[#0a0f18]/60 rounded-xl px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
              <code className="text-[#C79A1B] font-mono text-sm tracking-wide">
                <span className="hidden lg:inline">{deviceId}</span>
                <span className="lg:hidden">{shortId(deviceId)}…</span>
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copier le Device ID"
              className="shrink-0 w-10 h-10 rounded-xl bg-[#0a0f18]/60 hover:bg-[#C79A1B]/10 flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_12px_rgba(199,154,27,0.2)]"
            >
              {copied
                ? <Check size={15} className="text-emerald-400" />
                : <Copy size={15} className="text-slate-400 hover:text-[#C79A1B]" />
              }
            </button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-[#0a0f18]/50 rounded-xl px-4 py-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon size={11} className="text-slate-600" />
                <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</span>
              </div>
              <p className="text-sm font-semibold text-slate-300 truncate" title={value}>{value}</p>
            </div>
          ))}
        </div>

        {/* Peer dots */}
        {totalPeers > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 font-medium shrink-0">
              {connectedPeers}/{totalPeers} pairs
            </span>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: visibleDots }).map((_, i) => {
                const on = i < connectedPeers
                return (
                  <span
                    key={i}
                    className={[
                      'block w-2.5 h-2.5 rounded-full transition-all',
                      on
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                        : 'bg-slate-700',
                    ].join(' ')}
                    title={on ? 'Pair connecté' : 'Pair déconnecté'}
                  />
                )
              })}
              {totalPeers > MAX_PEER_DOTS && (
                <span className="text-xs text-slate-600 font-mono">+{totalPeers - MAX_PEER_DOTS}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NodeIdentityCard
