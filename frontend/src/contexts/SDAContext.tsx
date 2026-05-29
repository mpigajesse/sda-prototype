import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  fetchSystem, fetchVersion, fetchConfig, fetchConnections, fetchSDAHealth, fetchNodeInfo,
  type SyncthingSystem, type SyncthingFolder, type SyncthingDevice, type SyncthingConnections,
} from '../api/syncthing'

interface SDAContextValue {
  system: SyncthingSystem | null
  version: string
  hostPlatform: string
  folders: SyncthingFolder[]
  devices: SyncthingDevice[]
  connections: SyncthingConnections | null
  sdaStatus: string
  lastRefresh: Date
  isRefreshing: boolean
  error: string | null
  connectedPeers: number
  totalPeers: number
  refresh: () => void
}

const SDAContext = createContext<SDAContextValue | null>(null)

function formatPlatform(os: string, release: string, arch: string): string {
  return `${os} ${release} (${arch})`
}

export function SDAProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState<SyncthingSystem | null>(null)
  const [version, setVersion] = useState('')
  const [hostPlatform, setHostPlatform] = useState('—')
  const [folders, setFolders] = useState<SyncthingFolder[]>([])
  const [devices, setDevices] = useState<SyncthingDevice[]>([])
  const [connections, setConnections] = useState<SyncthingConnections | null>(null)
  const [sdaStatus, setSdaStatus] = useState('unknown')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loading = useRef(false)

  const load = async () => {
    if (loading.current) return
    loading.current = true
    setIsRefreshing(true)
    try {
      const [sys, ver, cfg, conn, sda, nodeInfo] = await Promise.all([
        fetchSystem(),
        fetchVersion(),
        fetchConfig(),
        fetchConnections(),
        fetchSDAHealth().catch(() => ({ status: 'unreachable', offline_ready: false })),
        fetchNodeInfo().catch(() => ({ host_os: '—', host_os_release: '—', host_arch: '—', host_hostname: '—' })),
      ])
      setSystem(sys)
      setVersion(ver.version)
      setHostPlatform(formatPlatform(nodeInfo.host_os, nodeInfo.host_os_release, nodeInfo.host_arch))
      setFolders(cfg.folders ?? [])
      setDevices(cfg.devices ?? [])
      setConnections(conn)
      setSdaStatus(sda.status)
      setLastRefresh(new Date())
      setError(null)
    } catch {
      setError('Impossible de joindre Syncthing. Vérifiez que le conteneur est démarré.')
    } finally {
      setIsRefreshing(false)
      loading.current = false
    }
  }

  useEffect(() => {
    void load()
    const timer = setInterval(() => { void load() }, 10_000)
    return () => clearInterval(timer)
  }, [])

  const connectedPeers = connections
    ? Object.values(connections.connections).filter((c) => c.connected).length
    : 0
  const totalPeers = Math.max(0, devices.length - 1)

  return (
    <SDAContext.Provider value={{
      system, version, hostPlatform, folders, devices, connections,
      sdaStatus, lastRefresh, isRefreshing, error,
      connectedPeers, totalPeers,
      refresh: () => { void load() },
    }}>
      {children}
    </SDAContext.Provider>
  )
}

export function useSDA(): SDAContextValue {
  const ctx = useContext(SDAContext)
  if (!ctx) throw new Error('useSDA must be used inside SDAProvider')
  return ctx
}
