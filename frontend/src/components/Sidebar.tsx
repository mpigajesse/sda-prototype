import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  FolderSync,
  Network,
  Activity,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  HardDrive,
  Globe,
} from 'lucide-react'

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/overview', label: 'Vue d\'ensemble', icon: <LayoutDashboard size={16} /> },
  { to: '/cluster',  label: 'Cluster P2P',     icon: <Globe size={16} /> },
  { to: '/folders',  label: 'Dossiers',        icon: <FolderSync size={16} /> },
  { to: '/peers',    label: 'Pairs',            icon: <Network size={16} /> },
  { to: '/events',   label: 'Événements',       icon: <Activity size={16} /> },
  { to: '/files',    label: 'Coffre-fort',      icon: <HardDrive size={16} /> },
]

interface SidebarProps {
  sdaStatus: string
  version: string
  folderCount: number
  peerCount: number
  connectedPeers: number
}

function StatusDot({ operational }: { operational: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {operational && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      )}
      <span className={`relative inline-flex rounded-full h-2 w-2 ${operational ? 'bg-emerald-400' : 'bg-red-400'}`} />
    </span>
  )
}

/* Séparateur géométrique style zellige marocain */
function MoroccanDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 mx-3 ${className}`}>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C79A1B]/25 to-[#C79A1B]/15" />
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden>
        <polygon points="4,0 8,4 4,8 0,4" fill="#C79A1B" opacity="0.45" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#C79A1B]/25 to-[#C79A1B]/15" />
    </div>
  )
}

interface NavButtonProps {
  item: NavItem
  collapsed: boolean
  badge?: number
  onNavigate: () => void
}

function NavButton({ item, collapsed, badge, onNavigate }: NavButtonProps) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => [
        'group relative w-full flex items-center gap-3 rounded-xl transition-all duration-150',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-3',
        isActive
          ? 'bg-gradient-to-r from-[#1C1208]/90 to-[#150F0A]/70 text-[#e6edf3] font-medium shadow-[0_2px_12px_rgba(0,0,0,0.4)]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-[#1C1208]/60',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-[#C79A1B] shadow-[0_0_8px_rgba(199,154,27,0.6)]" />
          )}
          <span className={isActive ? 'text-[#C79A1B]' : 'text-slate-500 group-hover:text-slate-300'}>
            {item.icon}
          </span>
          {!collapsed && (
            <span className="text-sm truncate flex-1 text-left">{item.label}</span>
          )}
          {!collapsed && badge !== undefined && badge > 0 && (
            <span className="ml-auto text-[10px] font-mono bg-[#2E1F14]/80 text-[#C79A1B]/80 px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-[#3D2A1E]/50">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar({ sdaStatus, version, folderCount, peerCount, connectedPeers }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isOperational = sdaStatus === 'operational'

  const badges: Record<string, number> = {
    '/folders': folderCount,
    '/peers': peerCount,
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Brand — icône + texte avec arche marocaine */}
      <div className={`relative flex items-center gap-3 pb-4 pt-5 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
        {/* Arche marocaine horseshoe derrière l'icône */}
        <div className="relative shrink-0">
          {!collapsed && (
            <svg
              className="absolute -inset-1.5 pointer-events-none"
              width="48" height="52" viewBox="0 0 48 52"
              fill="none" aria-hidden
            >
              <path
                d="M6,52 L6,26 Q6,5 24,5 Q42,5 42,26 L42,52"
                stroke="#C79A1B" strokeWidth="1" opacity="0.22"
              />
              <path
                d="M10,52 L10,28 Q10,9 24,9 Q38,9 38,28 L38,52"
                stroke="#C79A1B" strokeWidth="0.5" opacity="0.12"
              />
              {/* Croissant au sommet de l'arche */}
              <circle cx="24" cy="5" r="4" fill="none" stroke="#C79A1B" strokeWidth="0.8" opacity="0.2" />
              <circle cx="24" cy="5" r="1.5" fill="#C79A1B" opacity="0.15" />
            </svg>
          )}
          <div className="relative shrink-0 w-9 h-9 rounded-lg bg-[#B3121B]/15 flex items-center justify-center shadow-[0_0_16px_rgba(179,18,27,0.25)]">
            <Shield size={18} className="text-[#C79A1B]" />
          </div>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-base font-bold text-[#e6edf3] leading-none tracking-wide">SDA</div>
            <div className="text-xs text-[#C79A1B]/60 mt-1 tracking-wider font-medium">Sovereign Data Agent</div>
          </div>
        )}
      </div>

      <MoroccanDivider className="mb-3" />

      {/* Status */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium ${
            isOperational
              ? 'bg-emerald-500/8 text-emerald-400 border border-emerald-500/15'
              : 'bg-red-500/8 text-red-400 border border-red-500/15'
          }`}>
            <StatusDot operational={isOperational} />
            {isOperational ? 'Backend opérationnel' : 'Hors ligne'}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="px-3 py-3 flex justify-center">
          <StatusDot operational={isOperational} />
        </div>
      )}

      {!collapsed && (
        <div className="px-4 pt-2 pb-1">
          <span className="text-[10px] font-semibold text-[#C79A1B]/35 uppercase tracking-widest">Navigation</span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.to}
            item={item}
            collapsed={collapsed}
            badge={badges[item.to]}
            onNavigate={() => setMobileOpen(false)}
          />
        ))}
      </nav>

      {/* EL BARAA CONSULT logo */}
      <div className={`${collapsed ? 'px-2 pt-1 pb-2 flex justify-center' : 'px-3 pt-1 pb-2'}`}>
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-[0_0_12px_rgba(179,18,27,0.2)] shrink-0">
            <img src="/logoentreprise.png" alt="EL BARAA CONSULT" className="w-full h-full object-contain bg-white/5 p-0.5" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#1A0A0A] to-[#1A1208] shadow-[0_2px_12px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(199,154,27,0.08)] border border-[#3D2A1E]/40">
            <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 shadow-[0_0_12px_rgba(179,18,27,0.25)]">
              <img src="/logoentreprise.png" alt="EL BARAA CONSULT" className="w-full h-full object-contain bg-white/5 p-0.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold leading-tight truncate" style={{ color: '#C79A1B' }}>EL BARAA</div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 leading-tight">CONSULT</div>
            </div>
            <div className="ml-auto shrink-0 w-1 h-6 rounded-full" style={{ background: 'linear-gradient(to bottom, #B3121B, #C79A1B)' }} />
          </div>
        )}
      </div>

      <MoroccanDivider className="mb-1" />

      <div className={`${collapsed ? 'px-2 py-3 space-y-2' : 'px-4 py-4 space-y-3'}`}>
        {!collapsed && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pairs connectés</span>
            <span className={`font-mono font-semibold ${connectedPeers > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {connectedPeers}/{peerCount}
            </span>
          </div>
        )}
        <a
          href="http://localhost:8384"
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'flex items-center gap-2 text-xs text-slate-500 hover:text-[#C79A1B] transition-colors rounded-lg',
            collapsed ? 'justify-center p-2 hover:bg-[#1C1208]' : 'py-1',
          ].join(' ')}
          title={collapsed ? 'GUI Syncthing' : undefined}
        >
          <ExternalLink size={12} />
          {!collapsed && <span>GUI Syncthing</span>}
        </a>
        {!collapsed && version && (
          <div className="text-[10px] text-slate-700 font-mono">{version}</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="hidden lg:flex items-center justify-center w-full py-2 text-slate-600 hover:text-[#C79A1B]/60 hover:bg-[#1C1208]/60 transition-colors text-xs gap-1 rounded-b-xl"
        title={collapsed ? 'Développer' : 'Réduire'}
      >
        {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>Réduire</span></>}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl bg-[#1C1208] shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-slate-400 hover:text-[#C79A1B] transition-colors"
        aria-label="Ouvrir le menu"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={[
        'lg:hidden fixed top-0 left-0 h-full z-40 w-64 bg-[#090705]',
        'border-r border-[#3D2A1E]',
        'shadow-[4px_0_32px_rgba(0,0,0,0.6)]',
        'transform transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={[
        'hidden lg:flex flex-col h-screen sticky top-0 bg-[#090705] shrink-0',
        'border-r border-[#3D2A1E]',
        'transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}>
        {sidebarContent}
      </aside>
    </>
  )
}
