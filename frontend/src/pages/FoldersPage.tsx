import { FolderSync } from 'lucide-react'
import { FolderList } from '../components/FolderList'
import { PageHero } from '../components/PageHero'
import { useSDA } from '../contexts/SDAContext'

export default function FoldersPage() {
  const { folders, system, connectedPeers, totalPeers } = useSDA()

  return (
    <div>
      <PageHero
        icon={FolderSync}
        iconAccent="gold"
        title="Dossiers synchronisés"
        description="Réplication P2P chiffrée via Syncthing BEP/TLS 1.3 — aucun serveur central, synchronisation automatique"
        stats={[
          { label: 'Dossiers',    value: folders.length,                       accent: 'gold' },
          { label: 'Pairs actifs', value: `${connectedPeers} / ${totalPeers}`,  accent: connectedPeers > 0 ? 'emerald' : 'slate' },
          { label: 'Protocole',   value: 'BEP / TLS 1.3',                      accent: 'slate' },
        ]}
      />
      <FolderList folders={folders} loading={!system} />
    </div>
  )
}
