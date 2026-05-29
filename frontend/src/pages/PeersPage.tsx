import { Network } from 'lucide-react'
import { PeerList } from '../components/PeerList'
import { PageHero } from '../components/PageHero'
import { useSDA } from '../contexts/SDAContext'

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return (bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + ' ' + sizes[i]
}

export default function PeersPage() {
  const { devices, connections, system, totalPeers, connectedPeers } = useSDA()

  const allConns = Object.values(connections?.connections ?? {})
  const totalIn  = allConns.reduce((s, c) => s + (c.inBytesTotal  ?? 0), 0)
  const totalOut = allConns.reduce((s, c) => s + (c.outBytesTotal ?? 0), 0)

  return (
    <div>
      <PageHero
        icon={Network}
        iconAccent="emerald"
        title="Appareils pairs"
        description="Nœuds homologues P2P — communication mTLS bidirectionnelle, aucune hiérarchie maître/esclave"
        stats={[
          { label: 'Connectés', value: `${connectedPeers} / ${totalPeers}`, accent: connectedPeers > 0 ? 'emerald' : 'slate' },
          { label: '↓ Reçu',   value: formatBytes(totalIn),                 accent: 'emerald' },
          { label: '↑ Envoyé', value: formatBytes(totalOut),                accent: 'sky' },
        ]}
      />
      <PeerList devices={devices} connections={connections} myID={system?.myID ?? ''} />
    </div>
  )
}
