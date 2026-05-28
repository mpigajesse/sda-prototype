import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Upload, Trash2, Download, FileText, FileImage,
  FileSpreadsheet, File, AlertCircle, Loader2, HardDrive,
} from 'lucide-react'

interface FileEntry {
  name: string
  size: number
  modified: string
  mime: string
}

function fileIcon(mime: string, name: string) {
  if (mime.startsWith('image/')) return <FileImage size={16} className="text-violet-400" />
  if (mime.includes('pdf'))       return <FileText   size={16} className="text-rose-400" />
  if (mime.includes('csv') || mime.includes('spreadsheet') || name.endsWith('.csv') || name.endsWith('.xlsx'))
    return <FileSpreadsheet size={16} className="text-emerald-400" />
  if (mime.includes('parquet') || name.endsWith('.parquet'))
    return <HardDrive size={16} className="text-blue-400" />
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

export function FilesManager() {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [deletingName, setDeletingName] = useState<string | null>(null)
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

  useEffect(() => { void fetchFiles() }, [fetchFiles])

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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchFiles()
    } catch {
      setError(`Erreur lors de la suppression de "${name}"`)
    } finally {
      setDeletingName(null)
    }
  }, [fetchFiles])

  const totalSize = files.reduce((acc, f) => acc + f.size, 0)

  return (
    <div className="flex flex-col gap-6">

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'relative border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-blue-400 bg-blue-500/10'
            : 'border-[#30363d] hover:border-slate-500 hover:bg-[#161b22]',
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
            <Loader2 size={28} className="text-blue-400 animate-spin" />
            <p className="text-sm text-slate-400">Upload en cours…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={28} className="text-slate-500" />
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
          <AlertCircle size={14} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Stats bar */}
      {!loading && files.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
          <span><span className="text-slate-300 font-semibold">{files.length}</span> fichier{files.length > 1 ? 's' : ''}</span>
          <span>·</span>
          <span>Total <span className="text-slate-300 font-semibold">{formatSize(totalSize)}</span></span>
          <span>·</span>
          <span className="text-emerald-400">Répliqués P2P via Syncthing</span>
        </div>
      )}

      {/* File list */}
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
        <div className="rounded-xl border border-[#30363d] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#30363d] bg-[#161b22] text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichier</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Taille</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Modifié</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {files.map((f) => (
                <tr key={f.name} className="hover:bg-[#161b22] transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
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
    </div>
  )
}
