import { useEffect, useState } from 'react'
import { Shield, Lock, Wifi, Database, Server, GitBranch, Cpu, MemoryStick, Clock, Radio, RefreshCw } from 'lucide-react'
import { useSDA } from '../contexts/SDAContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortId(id: string): string {
  if (!id || id.length < 8) return '—'
  return id.slice(0, 7) + '-' + id.slice(8, 15) + '…'
}

function formatMem(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`
}

function formatUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}min`
}

// ── Static data ───────────────────────────────────────────────────────────────

const TECH_STACK = [
  { label: 'mTLS 1.3',         desc: 'Transit chiffré',      color: '#B3121B', Icon: Lock     },
  { label: 'Fernet AES-128',   desc: 'Chiffrement at-rest',  color: '#C79A1B', Icon: Shield   },
  { label: 'Syncthing BEP',    desc: 'Réplication P2P',      color: '#10b981', Icon: Wifi     },
  { label: 'FastAPI + Uvicorn',desc: 'REST + Swagger UI',    color: '#6366f1', Icon: Server   },
  { label: 'DuckDB + SQLite',  desc: 'OLAP + ACID local',    color: '#8b5cf6', Icon: Database },
  { label: 'CRDT LWW',         desc: 'Résolution conflits',  color: '#0ea5e9', Icon: GitBranch},
]

// SVG layout constants
const VBW = 1000
const VBH = 500

const POS = {
  win11:  { cx: 180, cy: 390 },
  ubuntu: { cx: 500, cy:  85 },
  kali:   { cx: 820, cy: 390 },
}

// Bezier paths (visible + motion template)
const PATHS: Record<string, string> = {
  'win11-ubuntu': `M180,390 C230,220 440,90 500,85`,
  'win11-kali':   `M180,390 C180,470 820,470 820,390`,
  'ubuntu-kali':  `M500,85 C680,85 780,220 820,390`,
}

// Animation timing per edge
const ANIM: Record<string, { d1: number; d2: number; b2: number }> = {
  'win11-ubuntu': { d1: 2.8, d2: 3.6, b2: 0.0 },
  'win11-kali':   { d1: 3.4, d2: 4.2, b2: 0.5 },
  'ubuntu-kali':  { d1: 2.5, d2: 3.8, b2: 1.1 },
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface MiniCardProps { icon: React.ElementType; label: string; value: string; color: string }

function MiniCard({ icon: Icon, label, value, color }: MiniCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-gradient-to-br from-[#111820] to-[#0d1420] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="rounded-xl p-2 shrink-0" style={{ backgroundColor: `${color}1a` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{label}</p>
        <p className="text-xl font-bold" style={{ color }}>{value}</p>
      </div>
    </div>
  )
}

// ── Node SVG group ─────────────────────────────────────────────────────────────

interface SvgNodeProps {
  cx: number
  cy: number
  label: string
  os: string
  sub: string
  ip: string
  synId: string
  connected: boolean
  isLocal: boolean
}

function SvgNode({ cx, cy, label, os, sub, ip, synId, connected, isLocal }: SvgNodeProps) {
  // Tous les nœuds sont égaux — même couleur verte pour tout nœud connecté
  const ringColor  = '#10b981'
  const nodeStroke = connected ? ringColor : '#1e2a38'
  const statusTxt  = connected ? '● Actif' : '○ Hors ligne'
  const statusFill = connected ? '#10b981' : '#475569'

  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Pulse rings — identiques pour tous les nœuds */}
      {connected && (
        <>
          <circle r="36" fill="none" stroke={ringColor} strokeWidth="1">
            <animate attributeName="r"       values="36;54;36" dur="3.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0;0.3" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle r="30" fill="none" stroke={ringColor} strokeWidth="1">
            <animate attributeName="r"       values="30;46;30" dur="3.5s" begin="0.7s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur="3.5s" begin="0.7s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Node circle — même style pour tous */}
      <circle r="30" fill="rgba(8,16,28,0.7)" stroke={nodeStroke} strokeWidth="1.5"
        filter={connected ? 'url(#glow-g)' : ''} />

      {/* Inner dot — identique pour tous */}
      <circle r="6" fill={connected ? '#10b981' : '#1e2a38'} opacity={connected ? 0.8 : 0.4} />

      {/* Status dot top-right */}
      <circle cx="22" cy="-22" r="5" fill={connected ? '#10b981' : '#374151'} filter={connected ? 'url(#glow-g)' : ''}>
        {connected && <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />}
      </circle>

      {/* Badge "Vue locale" en doré pour le nœud courant (neutre, pas de hiérarchie) */}
      {isLocal && (
        <>
          <rect x="-28" y="-92" width="56" height="14" rx="7"
            fill="rgba(199,154,27,0.12)" stroke="#C79A1B" strokeWidth="0.5" strokeOpacity="0.5" />
          <text y="-82" textAnchor="middle" fill="#C79A1B" fontSize="7" fontWeight="600" letterSpacing="0.5">
            ◎ Vue locale
          </text>
        </>
      )}

      {/* Text ABOVE */}
      <text y="-46" textAnchor="middle" fill="#e6edf3"   fontSize="11" fontWeight="700">{label}</text>
      <text y="-33" textAnchor="middle" fill="#94a3b8"   fontSize="9">{os}</text>
      <text y="-21" textAnchor="middle" fill="#64748b"   fontSize="7.5">{sub}</text>

      {/* Text BELOW */}
      <text y="49" textAnchor="middle" fill="#C79A1B"    fontSize="9.5" fontFamily="monospace" fontWeight="600">{ip}</text>
      <text y="63" textAnchor="middle" fill="#475569"    fontSize="7" fontFamily="monospace">{synId}</text>

      {/* Status badge */}
      <rect x="-26" y="70" width="52" height="15" rx="7.5"
        fill={connected ? 'rgba(16,185,129,0.12)' : 'rgba(30,42,56,0.5)'} />
      <text y="81" textAnchor="middle" fill={statusFill} fontSize="7.5" fontWeight="600">{statusTxt}</text>
    </g>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ClusterPage() {
  const {
    system, version, folders, devices, connections,
    connectedPeers, totalPeers, sdaStatus,
    lastRefresh, isRefreshing, refresh,
  } = useSDA()

  const isOp    = sdaStatus === 'operational'
  const localId = system?.myID ?? ''
  const peers   = devices.filter((d) => d.deviceID !== localId)
  const peer0   = peers[0]
  const peer1   = peers[1]

  const isConn = (id?: string) =>
    !!id && !!(connections?.connections[id]?.connected)

  const c01 = isConn(peer0?.deviceID)
  const c02 = isConn(peer1?.deviceID)

  // Cosmetic packet counter — increments while cluster is live
  const [pktCount, setPktCount] = useState(1247)
  useEffect(() => {
    if (!isOp) return
    const t = setInterval(() => setPktCount((v) => v + Math.floor(Math.random() * 4) + 1), 1800)
    return () => clearInterval(t)
  }, [isOp])

  const edges: Array<{ key: string; active: boolean }> = [
    { key: 'win11-ubuntu', active: isOp && c01 },
    { key: 'win11-kali',   active: isOp && c02 },
    { key: 'ubuntu-kali',  active: isOp && (c01 || c02) },
  ]

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#e6edf3] tracking-tight">Architecture P2P</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cluster SDA · {totalPeers + 1} nœuds souverains · Local-first · Offline-ready
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-xs font-semibold text-emerald-400">Temps réel</span>
          </div>
          <button onClick={refresh} disabled={isRefreshing} title="Actualiser"
            className="p-2 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Network SVG visualization ────────────────────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden shadow-[0_12px_60px_rgba(0,0,0,0.7)]">

        {/* Layered background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#07090f] via-[#080c14] to-[#05080f]" />
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-emerald-900/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#C79A1B]/3 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-emerald-900/6 blur-3xl pointer-events-none" />

        <svg
          viewBox={`0 0 ${VBW} ${VBH}`}
          className="relative w-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Topologie réseau du cluster SDA"
        >
          <defs>
            {/* Glow filters */}
            <filter id="glow-r" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-g" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-gold" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Invisible motion paths */}
            {Object.entries(PATHS).map(([key, d]) => (
              <path key={key} id={`mp-${key}`} d={d} fill="none" />
            ))}
          </defs>

          {/* ── Edges ─────────────────────────────────────────────────────── */}
          {edges.map(({ key, active }) => {
            const a = ANIM[key]
            return (
              <g key={key}>
                {/* Glow shadow */}
                <path d={PATHS[key]} fill="none"
                  stroke={active ? '#10b981' : '#0d1520'}
                  strokeWidth={active ? 4 : 2}
                  strokeOpacity={active ? 0.08 : 0.3} />
                {/* Dashed line */}
                <path d={PATHS[key]} fill="none"
                  stroke={active ? '#10b981' : '#1a2435'}
                  strokeWidth={active ? 1.5 : 1}
                  strokeOpacity={active ? 0.45 : 0.2}
                  strokeDasharray="10 7" />

                {/* Moving data packets */}
                {active && (
                  <>
                    {/* Green packet */}
                    <circle r="4.5" fill="#10b981" filter="url(#glow-g)">
                      <animateMotion dur={`${a.d1}s`} repeatCount="indefinite">
                        <mpath href={`#mp-${key}`} />
                      </animateMotion>
                    </circle>
                    {/* Gold packet */}
                    <circle r="3" fill="#C79A1B" filter="url(#glow-gold)" opacity="0.9">
                      <animateMotion dur={`${a.d2}s`} begin={`${a.b2}s`} repeatCount="indefinite">
                        <mpath href={`#mp-${key}`} />
                      </animateMotion>
                    </circle>
                    {/* Red packet (less frequent) */}
                    <circle r="2.5" fill="#B3121B" filter="url(#glow-r)" opacity="0.7">
                      <animateMotion dur={`${a.d1 * 1.8}s`} begin={`${a.d1 * 0.5}s`} repeatCount="indefinite">
                        <mpath href={`#mp-${key}`} />
                      </animateMotion>
                    </circle>
                  </>
                )}
              </g>
            )
          })}

          {/* ── Edge protocol labels ──────────────────────────────────────── */}
          <text x="300" y="205" textAnchor="middle" fill="#C79A1B" fontSize="8.5" fontFamily="monospace"
            opacity={isOp && c01 ? 0.75 : 0.25} transform="rotate(-46,300,205)">mTLS 1.3</text>

          <text x="700" y="205" textAnchor="middle" fill="#C79A1B" fontSize="8.5" fontFamily="monospace"
            opacity={isOp && c02 ? 0.75 : 0.25} transform="rotate(46,700,205)">mTLS 1.3</text>

          <text x="500" y="458" textAnchor="middle" fill="#C79A1B" fontSize="8.5" fontFamily="monospace"
            opacity={isOp ? 0.55 : 0.2}>BEP / TLS 1.3</text>

          {/* ── Center cluster label ──────────────────────────────────────── */}
          <g>
            {/* Faint hexagon */}
            <polygon
              points="500,218 536,238 536,278 500,298 464,278 464,238"
              fill="none" stroke="#B3121B" strokeWidth="0.5" strokeOpacity="0.15"
            />
            <text x="500" y="252" textAnchor="middle" fill="#B3121B" fontSize="11" fontWeight="800"
              letterSpacing="3" opacity="0.65">SDA CLUSTER</text>
            <text x="500" y="267" textAnchor="middle" fill="#64748b" fontSize="7.5" letterSpacing="1.5">
              Sovereign Data Agent
            </text>
            <text x="500" y="284" textAnchor="middle" fontSize="9" fontWeight="600"
              fill={connectedPeers > 0 ? '#10b981' : '#64748b'}>
              ◆ {connectedPeers + 1} / {totalPeers + 1} nœuds actifs
            </text>
            <text x="500" y="300" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">
              {pktCount.toLocaleString()} paquets synchronisés
            </text>
          </g>

          {/* ── Three cluster nodes ───────────────────────────────────────── */}
          <SvgNode
            {...POS.win11}
            label="Node 1"
            os="Windows 11 Pro"
            sub="WSL2 · Hôte physique"
            ip="192.168.200.1"
            synId={shortId(localId)}
            connected={isOp}
            isLocal
          />
          <SvgNode
            {...POS.ubuntu}
            label="Node 2"
            os="Ubuntu 26.04 LTS"
            sub="VM VMware"
            ip="192.168.200.130"
            synId={peer0 ? shortId(peer0.deviceID) : '—'}
            connected={isOp && c01}
            isLocal={false}
          />
          <SvgNode
            {...POS.kali}
            label="Node 3"
            os="Kali Linux"
            sub="VM VMware"
            ip="192.168.200.128"
            synId={peer1 ? shortId(peer1.deviceID) : '—'}
            connected={isOp && c02}
            isLocal={false}
          />

          {/* ── Syncthing logo badge at center ──────────────────────────── */}
          <circle cx="500" cy="258" r="16" fill="rgba(179,18,27,0.06)" stroke="#B3121B" strokeWidth="0.8" strokeOpacity="0.3" />
          <path
            d="M500,248 L504,252 L500,268 L496,252 Z"
            fill="#B3121B" opacity="0.7"
          />
        </svg>
      </div>

      {/* ── Live system metrics ──────────────────────────────────────────────── */}
      {system ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniCard icon={Cpu}         label="CPU nœud local"    value={`${system.cpuPercent.toFixed(1)}%`} color="#B3121B" />
          <MiniCard icon={MemoryStick} label="Mémoire utilisée"  value={formatMem(system.alloc)}             color="#C79A1B" />
          <MiniCard icon={Clock}       label="Uptime"            value={formatUptime(system.uptime)}         color="#10b981" />
          <MiniCard icon={Radio}       label="Paquets sync"      value={pktCount.toLocaleString()}           color="#6366f1" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-gradient-to-br from-[#111820] to-[#0d1420] animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Technology stack ────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-3">
          Stack technique · Couches de sécurité
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {TECH_STACK.map(({ label, desc, color, Icon }) => (
            <div key={label}
              className="flex flex-col gap-1.5 px-3 py-3 rounded-xl bg-gradient-to-br from-[#111820] to-[#0d1420] hover:from-[#161e2c] hover:to-[#111820] transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-1 shrink-0" style={{ backgroundColor: `${color}1a` }}>
                  <Icon size={11} style={{ color }} />
                </div>
                <span className="text-[10px] font-bold leading-tight" style={{ color }}>{label}</span>
              </div>
              <span className="text-[10px] text-slate-600 leading-tight">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Paradigm callout ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-[#B3121B]/8 to-[#C79A1B]/6 border border-[#B3121B]/15">
        <Shield size={20} className="text-[#B3121B] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-[#e6edf3]">Paradigme Code-to-Data</p>
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
            Les données ne quittent jamais le périmètre de confiance. L'image Docker est l'artefact
            centralisé — le runtime est distribué localement sur chaque nœud souverain.
            Conformité AUDPF · Aucune dépendance cloud.
          </p>
        </div>
      </div>

      {/* ── Footer metadata ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-700 font-mono">
        <span>Syncthing {version || '—'}</span>
        <span>·</span>
        <span>{folders.length} dossier{folders.length !== 1 ? 's' : ''} synchronisé{folders.length !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Actualisé à {lastRefresh.toLocaleTimeString('fr-FR')}</span>
      </div>

    </div>
  )
}
