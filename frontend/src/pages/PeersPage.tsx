import { PeerList } from '../components/PeerList'
import { useSDA } from '../contexts/SDAContext'

export default function PeersPage() {
  const { devices, connections, system, totalPeers, connectedPeers } = useSDA()

  return (
    <div>
      <p className="text-xs text-slate-500 mb-6">
        {connectedPeers}/{totalPeers} pair{totalPeers !== 1 ? 's' : ''} connecté{connectedPeers !== 1 ? 's' : ''} · réseau P2P chiffré TLS 1.3
      </p>
      <PeerList devices={devices} connections={connections} myID={system?.myID ?? ''} />
    </div>
  )
}
