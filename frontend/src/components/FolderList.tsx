import { useEffect, useState } from 'react'
import { FolderSync, HardDrive, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchFolderStatus, type SyncthingFolder, type FolderStatus } from '../api/syncthing'
import { StatusBadge } from './StatusBadge'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function SyncProgressBar({ inSyncFiles, localFiles, hasError }: {
  inSyncFiles: number
  localFiles: number
  hasError: boolean
}) {
  const pct = Math.round((inSyncFiles / Math.max(localFiles, 1)) * 100)
  const clampedPct = Math.min(100, Math.max(0, pct))

  let barColor = 'bg-[#C79A1B]'
  if (hasError) barColor = 'bg-red-500'
  else if (clampedPct === 100) barColor = 'bg-emerald-500'

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-slate-400">Progression sync</span>
        <span className={`text-sm font-semibold ${hasError ? 'text-red-400' : clampedPct === 100 ? 'text-emerald-400' : 'text-[#C79A1B]'}`}>
          {clampedPct}%
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-xl p-5 animate-pulse shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-5 h-5 rounded bg-[#30363d] shrink-0" />
          <div className="h-5 bg-[#30363d] rounded w-1/3" />
        </div>
        <div className="h-6 bg-[#30363d] rounded-full w-24" />
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <div className="w-4 h-4 rounded bg-[#30363d]" />
        <div className="h-4 bg-[#30363d] rounded w-2/3" />
      </div>
      <div className="mt-4 h-1.5 bg-[#30363d] rounded-full" />
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="text-center space-y-1.5">
            <div className="h-6 bg-[#30363d] rounded mx-auto w-12" />
            <div className="h-4 bg-[#30363d] rounded mx-auto w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-xl p-10 text-center shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
      <svg
        className="mx-auto mb-5 text-slate-600"
        width="56" height="56" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <line x1="12" y1="11" x2="12" y2="17" />
        <line x1="9" y1="14" x2="15" y2="14" />
      </svg>
      <p className="text-slate-300 text-base font-medium">Aucun dossier configuré</p>
      <p className="text-slate-500 text-sm mt-2 mb-5">
        Ajoutez un dossier partagé pour démarrer la synchronisation P2P.
      </p>
      <a
        href="http://localhost:8384"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-[#C79A1B] hover:text-[#D8AE35] transition-colors hover:bg-[#C79A1B]/10 rounded-xl px-4 py-2"
      >
        <FolderSync size={14} />
        Ouvrir Syncthing GUI
      </a>
    </div>
  )
}

interface Props {
  folders: SyncthingFolder[]
  loading?: boolean
}

export function FolderList({ folders, loading }: Props) {
  const [statuses, setStatuses] = useState<Record<string, FolderStatus>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (folders.length === 0) return
    const load = async () => {
      const entries = await Promise.all(
        folders.map(async (f) => {
          try {
            const s = await fetchFolderStatus(f.id)
            return [f.id, s] as const
          } catch {
            return [f.id, null] as const
          }
        })
      )
      setStatuses(Object.fromEntries(
        entries.filter(([, v]) => v !== null) as [string, FolderStatus][]
      ))
    }
    void load()
    const timer = setInterval(() => { void load() }, 5000)
    return () => clearInterval(timer)
  }, [folders])

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading && folders.length === 0) {
    return (
      <div className="flex flex-col gap-3.5">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (folders.length === 0) return <EmptyState />

  return (
    <div className="flex flex-col gap-3.5">
      {folders.map((folder) => {
        const s = statuses[folder.id]
        const isExpanded = expanded[folder.id] ?? false
        const hasError = s ? (s.errors ?? 0) > 0 || s.state === 'error' : false
        const isSynced = s
          ? s.state === 'idle' && s.inSyncFiles >= s.localFiles && s.localFiles > 0
          : false

        return (
          <div
            key={folder.id}
            className="bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
          >
            {/* Header — click to expand */}
            <button
              type="button"
              className="w-full text-left px-5 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C79A1B]/50"
              onClick={() => toggleExpand(folder.id)}
              aria-expanded={isExpanded}
              aria-controls={`folder-details-${folder.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <FolderSync size={18} className="text-[#C79A1B] shrink-0" />
                  <span className="text-base font-semibold text-[#e6edf3] truncate">
                    {folder.label || folder.id}
                  </span>
                  {isSynced && (
                    <CheckCircle2
                      size={16}
                      className="text-emerald-400 shrink-0"
                      aria-label="Synchronisé"
                    />
                  )}
                </div>

                {/* Right */}
                <div className="flex items-center gap-2 shrink-0">
                  {s && (s.errors ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-medium">
                      ⚠ {s.errors} conflit{(s.errors ?? 0) > 1 ? 's' : ''}
                    </span>
                  )}
                  {s && <StatusBadge state={s.state} />}
                  <span className="text-slate-500 ml-1">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
              </div>

              {/* Path */}
              <div className="mt-2.5 flex items-center gap-2 text-slate-500 text-sm">
                <HardDrive size={13} className="shrink-0" />
                <span className="truncate font-mono">{folder.path}</span>
              </div>
            </button>

            {/* Progress bar */}
            {s && (
              <div className="px-5 pb-3">
                <SyncProgressBar
                  inSyncFiles={s.inSyncFiles}
                  localFiles={s.localFiles}
                  hasError={hasError}
                />
              </div>
            )}

            {/* Pending files */}
            {s && s.needFiles > 0 && (
              <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl bg-yellow-500/10 px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" aria-hidden="true" />
                <span className="text-sm text-yellow-300">
                  {s.needFiles} fichier{s.needFiles > 1 ? 's' : ''} en attente de synchronisation
                </span>
              </div>
            )}

            {/* Expandable details */}
            <div
              id={`folder-details-${folder.id}`}
              className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
              {s && (
                <div className="px-5 pt-4 pb-5">
                  {/* Subtle separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-4" />

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="text-center bg-[#0d1117]/70 rounded-xl py-3 shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
                      <div className="text-xl font-bold text-[#e6edf3]">
                        {s.localFiles.toLocaleString()}
                      </div>
                      <div className="text-slate-500 text-sm mt-1">Fichiers locaux</div>
                    </div>
                    <div className="text-center bg-[#0d1117]/70 rounded-xl py-3 shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
                      <div className="text-xl font-bold text-emerald-400">
                        {s.inSyncFiles.toLocaleString()}
                      </div>
                      <div className="text-slate-500 text-sm mt-1">Synchronisés</div>
                    </div>
                    <div className="text-center bg-[#0d1117]/70 rounded-xl py-3 col-span-2 sm:col-span-1 shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
                      <div className="text-xl font-bold text-[#C79A1B]">
                        {formatBytes(s.localBytes)}
                      </div>
                      <div className="text-slate-500 text-sm mt-1">Taille totale</div>
                    </div>
                  </div>

                  {/* Full path */}
                  <div className="mt-4">
                    <p className="text-sm font-medium text-slate-500 mb-1.5">Chemin complet</p>
                    <p className="font-mono text-sm text-slate-300 bg-[#0d1117]/70 rounded-xl px-3 py-2 break-all shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
                      {folder.path}
                    </p>
                  </div>

                  {/* Folder ID */}
                  <div className="mt-2">
                    <p className="text-sm font-medium text-slate-500 mb-1">Identifiant Syncthing</p>
                    <p className="font-mono text-sm text-slate-400 bg-[#0d1117]/70 rounded-xl px-3 py-2 break-all shadow-[inset_0_1px_6px_rgba(0,0,0,0.2)]">
                      {folder.id}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
