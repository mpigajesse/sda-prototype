const BASE = '/syncthing-api/rest'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Syncthing API ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export interface SyncthingSystem {
  myID: string
  cpuPercent: number
  mem: number
  uptime: number
  version: string
  goroutines: number
}

export interface SyncthingFolder {
  id: string
  label: string
  path: string
  type: string
  status?: FolderStatus
}

export interface FolderStatus {
  state: string
  stateChanged: string
  localFiles: number
  localBytes: number
  inSyncFiles: number
  needFiles: number
  errors: number
}

export interface SyncthingDevice {
  deviceID: string
  name: string
  addresses: string[]
  paused: boolean
  connected?: boolean
  lastSeen?: string
}

export interface SyncthingEvent {
  id: number
  time: string
  type: string
  data: Record<string, unknown>
}

export interface SyncthingConnections {
  connections: Record<string, {
    connected: boolean
    inBytesTotal: number
    outBytesTotal: number
    address: string
    type: string
    clientVersion: string
  }>
}

export async function fetchSystem(): Promise<SyncthingSystem> {
  return get('/system/status')
}

export async function fetchVersion(): Promise<{ version: string; longVersion: string; os: string; arch: string }> {
  return get('/system/version')
}

export async function fetchConfig(): Promise<{ folders: SyncthingFolder[]; devices: SyncthingDevice[] }> {
  return get('/config')
}

export async function fetchFolderStatus(id: string): Promise<FolderStatus> {
  return get(`/db/status?folder=${encodeURIComponent(id)}`)
}

export async function fetchConnections(): Promise<SyncthingConnections> {
  return get('/system/connections')
}

export async function fetchEvents(since = 0): Promise<SyncthingEvent[]> {
  return get(`/events?since=${since}&limit=20`)
}

export async function fetchSDAHealth(): Promise<{ status: string; offline_ready: boolean }> {
  const res = await fetch('/sda-api/health')
  if (!res.ok) throw new Error('SDA backend unreachable')
  return res.json()
}
