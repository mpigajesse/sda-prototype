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
          ? 'bg-gradient-to-r from-[#21262d] to-[#1a2030] text-[#e6edf3] font-medium shadow-[0_2px_12px_rgba(0,0,0,0.3)]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]/80',
      ].join(' ')}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-[#B3121B] shadow-[0_0_8px_rgba(179,18,27,0.7)]" />
          )}
          <span className={isActive ? 'text-[#C79A1B]' : 'text-slate-500 group-hover:text-slate-300'}>
            {item.icon}
          </span>
          {!collapsed && (
            <span className="text-sm truncate flex-1 text-left">{item.label}</span>
          )}
          {!collapsed && badge !== undefined && badge > 0 && (
            <span className="ml-auto text-[10px] font-mono bg-[#30363d]/80 text-slate-300 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
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

      {/* Brand */}
      <div className={`flex items-center gap-3 pb-4 pt-5 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
        <div className="shrink-0 w-9 h-9 rounded-lg bg-[#B3121B]/15 flex items-center justify-center shadow-[0_0_16px_rgba(179,18,27,0.2)]">
          <Shield size={18} className="text-[#C79A1B]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-base font-bold text-[#e6edf3] leading-none">SDA</div>
            <div className="text-xs text-slate-400 mt-1">Sovereign Data Agent</div>
          </div>
        )}
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-3" />

      {/* Status */}
      {!collapsed && (
        <div className="px-3 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium ${
            isOperational ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
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
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Navigation</span>
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
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#1a0a0a] to-[#1a1208] shadow-[0_2px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(199,154,27,0.08)]">
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

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

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
            'flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors rounded-lg',
            collapsed ? 'justify-center p-2 hover:bg-[#161b22]' : 'py-1',
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
        className="hidden lg:flex items-center justify-center w-full py-2 text-slate-600 hover:text-slate-400 hover:bg-[#161b22]/60 transition-colors text-xs gap-1 rounded-b-xl"
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
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-xl bg-[#161b22] shadow-[0_2px_12px_rgba(0,0,0,0.4)] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Ouvrir le menu"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={[
        'lg:hidden fixed top-0 left-0 h-full z-40 w-64 bg-[#0d1117]',
        'border-r border-[#30363d]',
        'shadow-[4px_0_32px_rgba(0,0,0,0.6)]',
        'transform transition-transform duration-200',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className={[
        'hidden lg:flex flex-col h-screen sticky top-0 bg-[#0d1117] shrink-0',
        'border-r border-[#30363d]',
        'transition-all duration-200',
        collapsed ? 'w-14' : 'w-56',
      ].join(' ')}>
        {sidebarContent}
      </aside>
    </>
  )
}
