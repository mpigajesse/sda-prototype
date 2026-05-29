import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Upload, Trash2, Download, FileText, FileImage,
  FileSpreadsheet, File, AlertCircle, Loader2, HardDrive,
  Lock, LockOpen, Key, Copy, Check, X, Eye, EyeOff,
} from 'lucide-react'

interface FileEntry {
  name: string
  size: number
  modified: string
  mime: string
  owner_node: string
  is_mine: boolean
}

interface VaultKeyInfo {
  node_name: string
  vault_key: string
  instructions: string
}

function fileIcon(mime: string, name: string) {
  if (mime.startsWith('image/')) return <FileImage size={16} className="text-violet-400" />
  if (mime.includes('pdf'))       return <FileText   size={16} className="text-rose-400" />
  if (mime.includes('csv') || mime.includes('spreadsheet') || name.endsWith('.csv') || name.endsWith('.xlsx'))
    return <FileSpreadsheet size={16} className="text-emerald-400" />
  if (mime.includes('parquet') || name.endsWith('.parquet'))
    return <HardDrive size={16} className="text-[#C79A1B]" />
  return <File size={16} className="text-slate-400" />
}

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Modal : déverrouiller un fichier étranger ───────────────────────────────
interface UnlockModalProps {
  filename: string
  ownerNode: string
  onClose: () => void
}

function UnlockModal({ filename, ownerNode, onClose }: UnlockModalProps) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!key.trim()) { setError('Veuillez coller la clé de déchiffrement.'); return }
    setDownloading(true)
    setError(null)
    try {
      const url = `/api/v1/files/download/${encodeURIComponent(filename)}?key=${encodeURIComponent(key.trim())}`
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json() as { detail?: string }
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Clé incorrecte ou fichier corrompu.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-gradient-to-br from-[#1a2030] to-[#161b22] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Lock size={14} className="text-amber-400" />
              Déverrouiller le fichier
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono truncate">{filename}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="mb-4 px-3 py-2 bg-amber-500/10 rounded-xl text-xs text-amber-400">
          Ce fichier appartient au nœud <span className="font-semibold font-mono">{ownerNode}</span>.
          Demandez sa clé de coffre-fort et collez-la ci-dessous.
        </div>

        <label className="block text-xs text-slate-400 mb-1.5">Clé de déchiffrement (Fernet base64)</label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Collez la clé ici…"
            className="w-full bg-[#0d1117] rounded-xl px-3 py-2.5 pr-10 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-[#C79A1B]/50 transition-all shadow-[inset_0_1px_6px_rgba(0,0,0,0.3)]"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={12} />
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-[#0d1117]/60 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#21262d] transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => void handleDownload()}
            disabled={downloading || !key.trim()}
            className="flex-1 py-2 rounded-xl bg-[#B3121B] hover:bg-[#8E0E15] disabled:opacity-50 text-xs text-white font-medium transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(179,18,27,0.3)]"
          >
            {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Déchiffrer & Télécharger
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Section : partager sa propre clé ────────────────────────────────────────
interface MyKeyPanelProps {
  info: VaultKeyInfo
}

function MyKeyPanel({ info }: MyKeyPanelProps) {
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const copy = () => {
    void navigator.clipboard.writeText(info.vault_key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl bg-emerald-500/5 p-4 shadow-[0_0_24px_rgba(52,211,153,0.05),inset_0_1px_0_rgba(52,211,153,0.1)]">
      <div className="flex items-center gap-2 mb-3">
        <Key size={14} className="text-emerald-400 shrink-0" />
        <span className="text-xs font-semibold text-emerald-400">Ma clé de coffre-fort</span>
        <span className="ml-auto font-mono text-[10px] bg-[#0d1117]/60 px-2 py-0.5 rounded-full text-slate-500">
          {info.node_name}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Partagez cette clé avec un pair pour qu'il puisse déchiffrer vos fichiers depuis son nœud.
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-[#0d1117]/70 rounded-xl px-3 py-2 font-mono text-[11px] text-slate-400 overflow-hidden shadow-[inset_0_1px_6px_rgba(0,0,0,0.3)]">
          {revealed ? info.vault_key : '••••••••••••••••••••••••••••••••••••••••••••'}
        </div>
        <button
          onClick={() => setRevealed((v) => !v)}
          className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-[#161b22] transition-colors"
          title={revealed ? 'Masquer' : 'Afficher'}
        >
          {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={copy}
          className="shrink-0 p-2 rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
          title="Copier la clé"
        >
          {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function FilesManager() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [vaultKey, setVaultKey] = useState<VaultKeyInfo | null>(null)
  const [unlockTarget, setUnlockTarget] = useState<FileEntry | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/files/')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setFiles(await res.json() as FileEntry[])
      setError(null)
    } catch {
      setError('Impossible de charger la liste des fichiers.')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchVaultKey = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/files/my-key')
      if (!res.ok) return
      setVaultKey(await res.json() as VaultKeyInfo)
    } catch { /* non-bloquant */ }
  }, [])

  useEffect(() => {
    void fetchFiles()
    void fetchVaultKey()
  }, [fetchFiles, fetchVaultKey])

  const upload = useCallback(async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/v1/files/upload', { method: 'POST', body: form })
      if (!res.ok) {
        const body = await res.json() as { detail?: string }
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      await fetchFiles()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }, [fetchFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) void upload(file)
  }, [upload])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void upload(file)
    e.target.value = ''
  }, [upload])

  const deleteFile = useCallback(async (name: string) => {
    setDeletingName(name)
    try {
      const res = await fetch(`/api/v1/files/${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json() as { detail?: string }
        throw new Error(body.detail ?? `HTTP ${res.status}`)
      }
      await fetchFiles()
    } catch (e) {
      setError(e instanceof Error ? e.message : `Erreur lors de la suppression de "${name}"`)
    } finally {
      setDeletingName(null)
    }
  }, [fetchFiles])

  const ownFiles    = files.filter((f) => f.is_mine)
  const foreignFiles = files.filter((f) => !f.is_mine)
  const totalSize   = ownFiles.reduce((acc, f) => acc + f.size, 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Modal déverrouillage */}
      {unlockTarget && (
        <UnlockModal
          filename={unlockTarget.name}
          ownerNode={unlockTarget.owner_node}
          onClose={() => setUnlockTarget(null)}
        />
      )}

      {/* Zone de dépôt */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'relative rounded-xl px-6 py-10 text-center cursor-pointer transition-all',
          dragOver
            ? 'bg-[#C79A1B]/10 shadow-[0_0_0_2px_rgba(199,154,27,0.5),inset_0_0_40px_rgba(199,154,27,0.05)]'
            : 'bg-gradient-to-br from-[#1a2030] to-[#161b22] shadow-[0_4px_24px_rgba(0,0,0,0.35)] hover:shadow-[0_4px_32px_rgba(0,0,0,0.45)]',
          '[background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_8px)]',
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          accept="*/*"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={28} className="text-[#C79A1B] animate-spin" />
            <p className="text-sm text-slate-400">Chiffrement et upload en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0d1117]/60 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
              <Upload size={22} className="text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">
                Glisser-déposer un fichier ici
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ou cliquer pour choisir — Images, CSV, PDF, JSON, Parquet…
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Erreur globale */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 rounded-xl text-red-400 text-sm shadow-[0_0_16px_rgba(239,68,68,0.08)]">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Ma clé de coffre-fort */}
      {vaultKey && <MyKeyPanel info={vaultKey} />}

      {/* Chargement */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Chargement…</span>
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-600 gap-2">
          <HardDrive size={32} />
          <p className="text-sm">Aucun fichier dans le coffre-fort</p>
          <p className="text-xs">Déposez le premier fichier ci-dessus</p>
        </div>
      ) : (
        <>
          {/* ── Mes fichiers ─────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <LockOpen size={14} className="text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mes fichiers
              </h3>
              <span className="ml-auto font-mono text-[10px] text-slate-500">
                {ownFiles.length} · {formatSize(totalSize)}
              </span>
            </div>

            {ownFiles.length === 0 ? (
              <p className="text-xs text-slate-600 py-4 text-center">
                Aucun fichier uploadé depuis ce nœud.
              </p>
            ) : (
              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#1a2030] to-[#161b22] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(52,211,153,0.06)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-emerald-500/5 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichier</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Taille</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Modifié</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownFiles.map((f, i) => (
                      <tr
                        key={f.name}
                        className={[
                          'hover:bg-emerald-500/5 transition-colors group',
                          i > 0 ? 'border-t border-white/5' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <LockOpen size={12} className="text-emerald-500 shrink-0" />
                            {fileIcon(f.mime, f.name)}
                            <span className="truncate font-mono text-xs text-slate-300">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs hidden sm:table-cell whitespace-nowrap">
                          {formatSize(f.size)}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell whitespace-nowrap">
                          {formatDate(f.modified)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/api/v1/files/download/${encodeURIComponent(f.name)}`}
                              download={f.name}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                              title="Télécharger"
                            >
                              <Download size={13} />
                            </a>
                            <button
                              type="button"
                              onClick={() => void deleteFile(f.name)}
                              disabled={deletingName === f.name}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                              title="Supprimer"
                            >
                              {deletingName === f.name
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Trash2 size={13} />
                              }
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Fichiers des pairs ────────────────────────────────── */}
          {foreignFiles.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Lock size={14} className="text-amber-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Fichiers des pairs
                </h3>
                <span className="ml-auto font-mono text-[10px] text-slate-500">
                  {foreignFiles.length} fichier{foreignFiles.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#1e1a14] to-[#161b22] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(251,191,36,0.06)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-amber-500/5 text-left">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichier</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Propriétaire</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Taille</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foreignFiles.map((f, i) => (
                      <tr
                        key={f.name}
                        className={[
                          'hover:bg-amber-500/5 transition-colors opacity-75 hover:opacity-100',
                          i > 0 ? 'border-t border-white/5' : '',
                        ].join(' ')}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Lock size={12} className="text-amber-500 shrink-0" />
                            {fileIcon(f.mime, f.name)}
                            <span className="truncate font-mono text-xs text-slate-500">{f.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#21262d]/60 text-[10px] font-mono text-slate-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            {f.owner_node}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs hidden md:table-cell whitespace-nowrap">
                          {formatSize(f.size)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setUnlockTarget(f)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                            title="Déverrouiller avec la clé du propriétaire"
                          >
                            <Key size={11} />
                            Déverrouiller
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-slate-600 mt-2 px-1">
                Ces fichiers sont répliqués par Syncthing mais chiffrés avec la clé du nœud propriétaire.
                Demandez la clé via l'interface "Ma clé de coffre-fort" du pair concerné.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  )
}
