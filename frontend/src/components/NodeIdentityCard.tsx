import { useState } from 'react'
import { Fingerprint, Tag, Monitor, Users, Copy, Check, Zap } from 'lucide-react'

interface NodeIdentityCardProps {
  deviceId: string
  version: string
  hostPlatform: string
  connectedPeers: number
  totalPeers: number
}

const COPY_FEEDBACK_MS = 2000
const MAX_PEER_DOTS = 8

function formatDeviceIdMobile(id: string): string {
  const segments = id.split('-')
  if (segments.length < 2) return id
  return `${segments[0]}…${segments[segments.length - 1]}`
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
    } catch {
      // clipboard non disponible
    }
  }

  const visibleDots = Math.min(totalPeers, MAX_PEER_DOTS)
  const extraPeers = totalPeers > MAX_PEER_DOTS ? totalPeers - MAX_PEER_DOTS : 0

  const infoCells = [
    { icon: Tag, label: 'Version', value: version },
    { icon: Monitor, label: 'Plateforme', value: hostPlatform },
    { icon: Users, label: 'Pairs', value: `${connectedPeers}/${totalPeers}` },
    { icon: Zap, label: 'État', value: 'Synchronisé' },
  ]

  return (
    <div className="bg-[#161b22] rounded-xl p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="rounded-lg p-2.5 bg-blue-500/10 border border-blue-500/20">
            <Fingerprint className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">Identité du Nœud</h3>
            <p className="text-sm text-slate-500 mt-0.5">Ce nœud SDA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-sm font-medium text-green-400">Actif</span>
        </div>
      </div>

      {/* Device ID */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Device ID
        </label>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-sm bg-[#0d1117] rounded-lg px-4 py-3 text-blue-400 break-all">
            <span className="hidden sm:inline">{deviceId}</span>
            <span className="sm:hidden">{formatDeviceIdMobile(deviceId)}</span>
          </code>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copier le Device ID"
            className="shrink-0 p-3 rounded-lg bg-[#0d1117] hover:bg-[#21262d] transition-colors"
          >
            {copied
              ? <Check className="w-4 h-4 text-green-400" />
              : <Copy className="w-4 h-4 text-slate-400" />
            }
          </button>
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-5">
        {infoCells.map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-[#0d1117] rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-sm font-semibold text-slate-200 truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Peer dots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-400">Pairs configurés</span>
          <span className="text-sm text-slate-400 font-mono">
            {connectedPeers}/{totalPeers}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: visibleDots }).map((_, index) => {
            const isConnected = index < connectedPeers
            return (
              <span
                key={index}
                className={`block w-3.5 h-3.5 rounded-full transition-colors ${
                  isConnected
                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                    : 'bg-slate-700'
                }`}
                aria-label={isConnected ? 'Pair connecté' : 'Pair déconnecté'}
              />
            )
          })}
          {extraPeers > 0 && (
            <span className="ml-1 text-sm text-slate-500 font-mono">+{extraPeers}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default NodeIdentityCard
