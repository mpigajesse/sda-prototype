import { FolderList } from '../components/FolderList'
import { useSDA } from '../contexts/SDAContext'

export default function FoldersPage() {
  const { folders, system } = useSDA()

  return (
    <div>
      <p className="text-xs text-slate-500 mb-6">
        {folders.length} dossier{folders.length !== 1 ? 's' : ''} partagé{folders.length !== 1 ? 's' : ''} · synchronisation P2P automatique via Syncthing
      </p>
      <FolderList folders={folders} loading={!system} />
    </div>
  )
}
