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

      {/* Ambient background — tons chauds marocains */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#160C07] via-[#0D0A07] to-[#120E09]" />
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#B3121B]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-[#C79A1B]/8 blur-3xl pointer-events-none" />

      {/* Zellige khatam — motif géométrique marocain étoile 8 branches */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.055] pointer-events-none" aria-hidden>
        <defs>
          <pattern id="zellige-nic" width="48" height="48" patternUnits="userSpaceOnUse">
            {/* Étoile 8 branches (khatam) */}
            <polygon
              points="24,7 26.6,17.5 35.9,12.1 30.5,21.4 41,24 30.5,26.6 35.9,35.9 26.6,30.5 24,41 21.4,30.5 12.1,35.9 17.5,26.6 7,24 17.5,21.4 12.1,12.1 21.4,17.5"
              fill="none" stroke="#C79A1B" strokeWidth="0.8"
            />
            {/* Carré intérieur (motif zellige) */}
            <polygon
              points="24,14 30,24 24,34 18,24"
              fill="none" stroke="#C79A1B" strokeWidth="0.4" opacity="0.5"
            />
            {/* Points d'ancrage aux coins pour le tissu continu */}
            <polygon
              points="0,0 2,4 0,8 -2,4"
              fill="#C79A1B" opacity="0.3"
            />
            <polygon
              points="48,0 50,4 48,8 46,4"
              fill="#C79A1B" opacity="0.3"
            />
            <polygon
              points="0,48 2,52 0,56 -2,52"
              fill="#C79A1B" opacity="0.3"
            />
            <polygon
              points="48,48 50,52 48,56 46,52"
              fill="#C79A1B" opacity="0.3"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zellige-nic)" />
      </svg>

      {/* Ligne de scan sécurité — vérification système symbolique */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div
          className="sda-scan-line absolute inset-x-0 h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.55) 40%, rgba(199,154,27,0.4) 60%, transparent 100%)' }}
        />
      </div>

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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 sda-connected-ring">
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
            <div className="flex-1 min-w-0 bg-[#090503]/70 rounded-xl px-4 py-3 shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
              <code className="text-[#C79A1B] font-mono text-sm tracking-wide">
                <span className="hidden lg:inline">{deviceId}</span>
                <span className="lg:hidden">{shortId(deviceId)}…</span>
              </code>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copier le Device ID"
              className="shrink-0 w-10 h-10 rounded-xl bg-[#090503]/70 hover:bg-[#C79A1B]/10 flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(0,0,0,0.3)] hover:shadow-[0_0_12px_rgba(199,154,27,0.2)]"
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
            <div key={label} className="bg-[#090503]/60 rounded-xl px-4 py-3 shadow-[inset_0_1px_4px_rgba(0,0,0,0.3)]">
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
