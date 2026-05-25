import { useState } from 'react'
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
} from 'lucide-react'

export type SidebarSection = 'overview' | 'folders' | 'peers' | 'events'

interface NavItem {
  id: SidebarSection
  label: string
  icon: React.ReactNode
  accent: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    icon: <LayoutDashboard size={16} />,
    accent: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'folders',
    label: 'Dossiers',
    icon: <FolderSync size={16} />,
    accent: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 'peers',
    label: 'Pairs',
    icon: <Network size={16} />,
    accent: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    id: 'events',
    label: 'Événements',
    icon: <Activity size={16} />,
    accent: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
]

interface SidebarProps {
  active: SidebarSection
  onNavigate: (section: SidebarSection) => void
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
      <span
        className={`relative inline-flex rounded-full h-2 w-2 ${
          operational ? 'bg-emerald-400' : 'bg-red-400'
        }`}
      />
    </span>
  )
}

interface NavButtonProps {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  badge?: number
  onClick: () => void
}

function NavButton({ item, isActive, collapsed, badge, onClick }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={[
        'group relative w-full flex items-center gap-3 rounded-lg transition-all duration-150',
        collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-3',
        isActive
          ? 'bg-[#21262d] text-[#e6edf3] font-medium'
          : 'text-slate-400 hover:text-slate-200 hover:bg-[#161b22]',
      ].join(' ')}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r bg-blue-400" />
      )}

      <span className={isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}>
        {item.icon}
      </span>

      {!collapsed && (
        <span className="text-sm truncate flex-1 text-left">{item.label}</span>
      )}

      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto text-[10px] font-mono bg-[#30363d] text-slate-300 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}

export function Sidebar({
  active,
  onNavigate,
  sdaStatus,
  version,
  folderCount,
  peerCount,
  connectedPeers,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isOperational = sdaStatus === 'operational'

  const badges: Partial<Record<SidebarSection, number>> = {
    folders: folderCount,
    peers: peerCount,
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Brand */}
      <div className={`flex items-center gap-3 border-b border-[#30363d] ${collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'}`}>
        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
          <Shield size={15} className="text-blue-400" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#e6edf3] leading-none">SDA</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Sovereign Data Agent</div>
          </div>
        )}
      </div>

      {/* Status */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
            isOperational
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
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

      {/* Navigation label */}
      {!collapsed && (
        <div className="px-4 pt-4 pb-1">
          <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest">
            Navigation
          </span>
        </div>
      )}

      {/* Nav items */}
      <nav className={`flex-1 px-2 space-y-1.5 py-2 overflow-y-auto`}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={active === item.id}
            collapsed={collapsed}
            badge={badges[item.id]}
            onClick={() => {
              onNavigate(item.id)
              setMobileOpen(false)
            }}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className={`border-t border-[#30363d] ${collapsed ? 'px-2 py-3 space-y-2' : 'px-4 py-4 space-y-3'}`}>

        {/* Connected peers indicator */}
        {!collapsed && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pairs connectés</span>
            <span className={`font-mono font-semibold ${connectedPeers > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
              {connectedPeers}/{peerCount}
            </span>
          </div>
        )}

        {/* Syncthing link */}
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

        {/* Version */}
        {!collapsed && version && (
          <div className="text-[10px] text-slate-700 font-mono">{version}</div>
        )}
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="hidden lg:flex items-center justify-center w-full py-2 border-t border-[#30363d] text-slate-600 hover:text-slate-400 hover:bg-[#161b22] transition-colors text-xs gap-1"
        title={collapsed ? 'Développer' : 'Réduire'}
      >
        {collapsed
          ? <ChevronRight size={14} />
          : <><ChevronLeft size={14} /><span>Réduire</span></>
        }
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors shadow-lg"
        aria-label="Ouvrir le menu"
      >
        {mobileOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={[
          'lg:hidden fixed top-0 left-0 h-full z-40 w-64 bg-[#0d1117] border-r border-[#30363d]',
          'transform transition-transform duration-200',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden lg:flex flex-col h-screen sticky top-0 bg-[#0d1117] border-r border-[#30363d] shrink-0',
          'transition-all duration-200',
          collapsed ? 'w-14' : 'w-56',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
