import { useEffect, useRef, useState } from 'react'
import {
  Activity, FolderSync, FileText, ArrowDownToLine,
  CheckCircle2, Wifi, WifiOff, Settings,
} from 'lucide-react'
import { fetchEvents, type SyncthingEvent } from '../api/syncthing'

type Category = 'all' | 'files' | 'network' | 'system'

interface EventConfig {
  label: string
  icon: React.ReactNode
  accentBg: string
  accentGlow: string
}

const FILE_EVENTS = new Set([
  'StateChanged', 'LocalChangeDetected', 'RemoteChangeDetected',
  'ItemFinished', 'FolderSyncProgress',
])
const NETWORK_EVENTS = new Set(['DeviceConnected', 'DeviceDisconnected'])
const SYSTEM_EVENTS = new Set(['ConfigSaved'])

function getCategory(type: string): Exclude<Category, 'all'> {
  if (FILE_EVENTS.has(type)) return 'files'
  if (NETWORK_EVENTS.has(type)) return 'network'
  if (SYSTEM_EVENTS.has(type)) return 'system'
  return 'system'
}

function getEventConfig(type: string): EventConfig {
  switch (type) {
    case 'StateChanged':
      return { label: 'État modifié', icon: <FolderSync size={14} />, accentBg: 'bg-[#C79A1B]', accentGlow: 'shadow-[0_0_8px_rgba(199,154,27,0.5)]' }
    case 'LocalChangeDetected':
      return { label: 'Fichier modifié', icon: <FileText size={14} />, accentBg: 'bg-emerald-500', accentGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' }
    case 'RemoteChangeDetected':
      return { label: 'Changement pair', icon: <ArrowDownToLine size={14} />, accentBg: 'bg-emerald-500', accentGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' }
    case 'ItemFinished':
      return { label: 'Sync OK', icon: <CheckCircle2 size={14} />, accentBg: 'bg-emerald-500', accentGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' }
    case 'FolderSyncProgress':
      return { label: 'Progression sync', icon: <FolderSync size={14} />, accentBg: 'bg-[#C79A1B]', accentGlow: 'shadow-[0_0_8px_rgba(199,154,27,0.5)]' }
    case 'DeviceConnected':
      return { label: 'Pair connecté', icon: <Wifi size={14} />, accentBg: 'bg-emerald-500', accentGlow: 'shadow-[0_0_8px_rgba(52,211,153,0.4)]' }
    case 'DeviceDisconnected':
      return { label: 'Pair déconnecté', icon: <WifiOff size={14} />, accentBg: 'bg-red-500', accentGlow: 'shadow-[0_0_8px_rgba(239,68,68,0.4)]' }
    case 'ConfigSaved':
      return { label: 'Config sauvée', icon: <Settings size={14} />, accentBg: 'bg-slate-500', accentGlow: '' }
    default:
      return { label: type, icon: <Activity size={14} />, accentBg: 'bg-slate-600', accentGlow: '' }
  }
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `il y a ${diff}s`
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`
  return `il y a ${Math.floor(diff / 3600)}h`
}

interface FilterButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-[#30363d]/80 text-[#e6edf3] shadow-[0_1px_6px_rgba(0,0,0,0.3)]'
          : 'text-slate-500 hover:text-slate-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

export function EventFeed() {
  const [events, setEvents] = useState<SyncthingEvent[]>([])
  const [category, setCategory] = useState<Category>('all')
  const [, setTick] = useState(0)
  const lastId = useRef(0)
  const totalCount = useRef(0)

  useEffect(() => {
    const poll = async () => {
      try {
        const newEvents = await fetchEvents(lastId.current)
        if (newEvents.length > 0) {
          lastId.current = newEvents[newEvents.length - 1].id
          totalCount.current += newEvents.length
          setEvents((prev) => [...newEvents, ...prev].slice(0, 50))
        }
      } catch {
        // Syncthing pas encore prêt
      }
    }
    void poll()
    const timer = setInterval(() => { void poll() }, 3000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10_000)
    return () => clearInterval(timer)
  }, [])

  const filtered = category === 'all'
    ? events
    : events.filter((e) => getCategory(e.type) === category)

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'files', label: 'Fichiers' },
    { key: 'network', label: 'Réseau' },
    { key: 'system', label: 'Système' },
  ]

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .event-item { animation: slideDown 0.2s ease; }
        .feed-scroll::-webkit-scrollbar { width: 4px; }
        .feed-scroll::-webkit-scrollbar-track { background: transparent; }
        .feed-scroll::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
        .feed-scroll::-webkit-scrollbar-thumb:hover { background: #484f58; }
      `}</style>

      <div className="bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4">
          <Activity size={15} className="text-slate-400" />
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-widest">
            Activité récente
          </span>
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded font-bold animate-pulse ml-1">
            LIVE
          </span>
          {totalCount.current > 0 && (
            <span className="ml-auto bg-[#30363d]/80 text-slate-300 text-sm px-2.5 py-0.5 rounded-full font-medium tabular-nums">
              {totalCount.current}
            </span>
          )}
        </div>

        {/* Subtle separator */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Filters */}
        <div className="flex items-center gap-1 px-4 py-3">
          {categories.map(({ key, label }) => (
            <FilterButton
              key={key}
              label={label}
              active={category === key}
              onClick={() => setCategory(key)}
            />
          ))}
        </div>

        {/* Subtle separator */}
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Event list */}
        <div className="feed-scroll max-h-96 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">
              {events.length === 0
                ? 'En attente d\'événements…'
                : 'Aucun événement dans cette catégorie'}
            </div>
          )}

          {filtered.map((evt) => {
            const cfg = getEventConfig(evt.type)
            const folder = typeof evt.data?.folder === 'string' ? evt.data.folder : ''
            const item = typeof evt.data?.item === 'string' ? ` › ${evt.data.item}` : ''

            return (
              <div
                key={evt.id}
                className="event-item relative flex items-center gap-3 px-5 py-3 hover:bg-[#0d1117]/40 transition-colors"
              >
                {/* Left accent strip */}
                <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${cfg.accentBg} ${cfg.accentGlow}`} />

                <span className="text-slate-400 shrink-0">{cfg.icon}</span>
                <span className="text-sm font-medium text-slate-200 shrink-0">{cfg.label}</span>
                {(folder || item) && (
                  <span className="text-slate-500 text-sm truncate flex-1">
                    {folder}{item}
                  </span>
                )}
                <span className="text-slate-600 text-sm shrink-0 ml-auto pl-2 tabular-nums">
                  {timeAgo(evt.time)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
