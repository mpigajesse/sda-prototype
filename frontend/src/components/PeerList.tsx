import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  ExternalLink,
  Monitor,
  Network,
  Zap,
} from 'lucide-react'
import { type SyncthingDevice, type SyncthingConnections } from '../api/syncthing'

interface Props {
  devices: SyncthingDevice[]
  connections: SyncthingConnections | null
  myID: string
}

type ConnectionKind = 'QUIC' | 'TCP' | 'Relay' | 'Unknown'

interface PeerConnection {
  connected: boolean
  inBytesTotal: number
  outBytesTotal: number
  address: string
  type: string
  clientVersion: string
}

function shortDeviceId(id: string): string {
  return id.split('-')[0] ?? id.slice(0, 7)
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  const value = (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)
  return value + ' ' + sizes[i]
}

function getInitials(name: string, fallbackId: string): string {
  const source = (name || fallbackId).trim()
  if (!source) return '??'
  const parts = source.split(/[\s_\-.]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return source.slice(0, 2).toUpperCase()
}

function detectKind(rawType: string | undefined): ConnectionKind {
  const t = (rawType ?? '').toLowerCase()
  if (t.includes('quic')) return 'QUIC'
  if (t.includes('relay')) return 'Relay'
  if (t.includes('tcp')) return 'TCP'
  return 'Unknown'
}

function signalBarsFor(kind: ConnectionKind): number {
  if (kind === 'QUIC') return 3
  if (kind === 'TCP') return 2
  if (kind === 'Relay') return 1
  return 0
}

function kindBadgeClass(kind: ConnectionKind): string {
  switch (kind) {
    case 'QUIC':
      return 'bg-emerald-500/10 text-emerald-300'
    case 'TCP':
      return 'bg-sky-500/10 text-sky-300'
    case 'Relay':
      return 'bg-amber-500/10 text-amber-300'
    default:
      return 'bg-slate-500/10 text-slate-300'
  }
}

function SignalBars({ count, active }: { count: number; active: boolean }) {
  const label = 'Signal ' + count + '/3'
  return (
    <div className="flex items-end gap-[2px] h-3" aria-label={label}>
      {[0, 1, 2].map((i) => {
        const filled = i < count
        const heights = ['h-1', 'h-2', 'h-3']
        return (
          <span
            key={i}
            className={[
              'w-[3px] rounded-[1px] transition-colors',
              heights[i],
              filled && active
                ? 'bg-emerald-400'
                : filled
                ? 'bg-slate-500'
                : 'bg-slate-700',
            ].join(' ')}
          />
        )
      })}
    </div>
  )
}

function PeerAvatar({
  initials,
  isConnected,
}: {
  initials: string
  isConnected: boolean
}) {
  return (
    <div
      className={[
        'relative shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
        'font-semibold text-sm tracking-wide transition-all',
        isConnected
          ? 'bg-emerald-500/10 text-emerald-300 shadow-[0_0_0_3px_rgba(16,185,129,0.15),0_0_16px_rgba(16,185,129,0.1)]'
          : 'bg-slate-500/10 text-slate-400',
      ].join(' ')}
    >
      {initials || <Monitor size={16} />}
      <span
        className={[
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full shadow-[0_0_0_2px_#161b22]',
          isConnected ? 'bg-emerald-400' : 'bg-slate-500',
        ].join(' ')}
        aria-hidden
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-xl p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <div className="mx-auto mb-4 w-20 h-20 relative">
        <svg
          viewBox="0 0 80 80"
          className="w-full h-full text-slate-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          <circle cx="40" cy="40" r="6" className="fill-emerald-500/20 stroke-emerald-400/60" />
          <circle cx="12" cy="20" r="4" />
          <circle cx="68" cy="20" r="4" />
          <circle cx="12" cy="60" r="4" />
          <circle cx="68" cy="60" r="4" />
          <line x1="40" y1="40" x2="12" y2="20" strokeDasharray="2 3" />
          <line x1="40" y1="40" x2="68" y2="20" strokeDasharray="2 3" />
          <line x1="40" y1="40" x2="12" y2="60" strokeDasharray="2 3" />
          <line x1="40" y1="40" x2="68" y2="60" strokeDasharray="2 3" />
        </svg>
      </div>
      <p className="text-[#e6edf3] text-base font-semibold">Aucun pair configuré</p>
      <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto leading-relaxed">
        Ajoutez un pair via l&#39;interface Syncthing pour initier la replication P2P chiffree.
      </p>
      <a
        href="http://localhost:8384"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
      >
        Ouvrir Syncthing
        <ExternalLink size={12} />
      </a>
    </div>
  )
}

interface PeerCardProps {
  device: SyncthingDevice
  conn: PeerConnection | undefined
}

function PeerCard({ device, conn }: PeerCardProps) {
  const isConnected = conn?.connected ?? false
  const [expanded, setExpanded] = useState(false)
  const [justConnected, setJustConnected] = useState(false)
  const prevConnected = useRef(isConnected)

  useEffect(() => {
    if (!prevConnected.current && isConnected) {
      setJustConnected(true)
      const t = window.setTimeout(() => setJustConnected(false), 1400)
      prevConnected.current = isConnected
      return () => window.clearTimeout(t)
    }
    prevConnected.current = isConnected
    return undefined
  }, [isConnected])

  const kind = detectKind(conn?.type)
  const bars = signalBarsFor(kind)
  const initials = getInitials(device.name, device.deviceID)
  const displayName = device.name || shortDeviceId(device.deviceID)

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    void navigator.clipboard?.writeText(device.deviceID)
  }

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1a2030] to-[#161b22] transition-all shadow-[0_4px_24px_rgba(0,0,0,0.35)]',
        justConnected ? 'ring-2 ring-emerald-400/60 animate-pulse' : '',
      ].join(' ')}
    >
      {/* Left accent strip */}
      <span
        aria-hidden
        className={[
          'absolute left-0 top-0 bottom-0 w-[3px] rounded-r-sm transition-all',
          isConnected
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
            : 'bg-slate-600',
        ].join(' ')}
      />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left pl-5 pr-4 py-4"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <PeerAvatar initials={initials} isConnected={isConnected} />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#e6edf3] truncate text-base">
                {displayName}
              </span>
              {isConnected && (
                <span
                  className={[
                    'hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide',
                    kindBadgeClass(kind),
                  ].join(' ')}
                >
                  {kind === 'QUIC' && <Zap size={10} />}
                  {kind === 'Relay' && <Network size={10} />}
                  {kind}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-mono">
              <span className="truncate">{shortDeviceId(device.deviceID)}...</span>
              <span
                className={[
                  'hidden sm:inline-flex items-center gap-1 text-sm font-sans font-medium',
                  isConnected ? 'text-emerald-400' : 'text-slate-500',
                ].join(' ')}
              >
                <span
                  className={[
                    'w-1.5 h-1.5 rounded-full',
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500',
                  ].join(' ')}
                />
                {isConnected ? 'Connecté' : 'Hors-ligne'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">
              <SignalBars count={bars} active={isConnected} />
            </div>
            <span
              className={[
                'sm:hidden w-2 h-2 rounded-full',
                isConnected ? 'bg-emerald-400' : 'bg-slate-500',
              ].join(' ')}
              aria-hidden
            />
            <ChevronDown
              size={16}
              className={[
                'text-slate-500 transition-transform',
                expanded ? 'rotate-180' : '',
              ].join(' ')}
            />
          </div>
        </div>

        {isConnected && conn && (
          <div className="hidden sm:grid mt-3.5 grid-cols-2 gap-3">
            <div className="bg-[#0d1117]/60 rounded-xl px-5 py-3 flex items-center gap-2 shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
              <ArrowDown size={13} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Reçu
                </div>
                <div className="text-[#e6edf3] text-base font-semibold tabular-nums truncate">
                  {formatBytes(conn.inBytesTotal)}
                </div>
              </div>
            </div>
            <div className="bg-[#0d1117]/60 rounded-xl px-5 py-3 flex items-center gap-2 shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
              <ArrowUp size={13} className="text-sky-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-slate-500">
                  Envoyé
                </div>
                <div className="text-[#e6edf3] text-base font-semibold tabular-nums truncate">
                  {formatBytes(conn.outBytesTotal)}
                </div>
              </div>
            </div>
          </div>
        )}
      </button>

      {expanded && (
        <div className="bg-[#0d1117]/50 px-5 pt-4 pb-5 space-y-4">
          {/* Subtle separator */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent -mx-5 mb-4" />

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Device ID
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors"
              >
                <Copy size={11} /> Copier
              </button>
            </div>
            <p className="mt-1.5 font-mono text-sm text-[#e6edf3] break-all leading-relaxed">
              {device.deviceID}
            </p>
          </div>

          {conn?.address && (
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Adresse active
              </div>
              <p className="mt-1.5 font-mono text-sm text-[#e6edf3] break-all">
                {conn.address}
              </p>
            </div>
          )}

          {device.addresses && device.addresses.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Adresses configurées
              </div>
              <ul className="mt-1.5 space-y-1">
                {device.addresses.map((addr) => (
                  <li
                    key={addr}
                    className="font-mono text-sm text-slate-300 break-all"
                  >
                    {addr}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Client
              </div>
              <p className="mt-1.5 text-sm text-[#e6edf3] truncate">
                {conn?.clientVersion || '-'}
              </p>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">
                Type
              </div>
              <p className="mt-1.5 text-sm text-[#e6edf3]">
                {conn?.type || '-'}
              </p>
            </div>
          </div>

          {isConnected && conn && (
            <div className="grid grid-cols-2 gap-2 sm:hidden pt-1">
              <div className="bg-[#161b22] rounded-xl px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ArrowDown size={10} className="text-emerald-400" /> Recu
                </div>
                <div className="text-[#e6edf3] text-xs font-medium tabular-nums">
                  {formatBytes(conn.inBytesTotal)}
                </div>
              </div>
              <div className="bg-[#161b22] rounded-xl px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ArrowUp size={10} className="text-sky-400" /> Envoye
                </div>
                <div className="text-[#e6edf3] text-xs font-medium tabular-nums">
                  {formatBytes(conn.outBytesTotal)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PeerList({ devices, connections, myID }: Props) {
  const peers = devices.filter((d) => d.deviceID !== myID)

  if (peers.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="flex flex-col gap-3.5">
      {peers.map((device) => (
        <PeerCard
          key={device.deviceID}
          device={device}
          conn={connections?.connections[device.deviceID]}
        />
      ))}
    </div>
  )
}
