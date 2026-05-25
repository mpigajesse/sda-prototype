import { useState } from 'react'
import { Shield, RefreshCw, ExternalLink, Menu, X } from 'lucide-react'

interface HeaderProps {
  sdaStatus: string
  lastRefresh: Date
  isRefreshing: boolean
  onRefresh: () => void
}

export default function Header({ sdaStatus, lastRefresh, isRefreshing, onRefresh }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const formattedTime = lastRefresh.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const isOperational = sdaStatus === 'operational'

  const StatusBadge = () => (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${
        isOperational
          ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
          : 'text-red-400 border-red-500/30 bg-red-500/10'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isOperational ? 'bg-emerald-400' : 'bg-red-400'
        }`}
      />
      {isOperational ? 'Opérationnel' : 'Hors ligne'}
    </span>
  )

  const RefreshButton = () => (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <RefreshCw
        className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
      />
      <span className="text-slate-500">{formattedTime}</span>
    </button>
  )

  const SyncthingLink = () => (
    <a
      href="http://localhost:8384"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      Syncthing
    </a>
  )

  return (
    <header className="bg-[#0d1117]/95 backdrop-blur-md border-b border-[#30363d] sticky top-0 z-50">
      {/* Desktop layout */}
      <div className="hidden md:flex items-center gap-4 px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mr-2">
          <div className="rounded-lg w-8 h-8 bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-white font-bold text-sm">SDA</span>
            <span className="text-slate-500 text-[10px] mt-0.5">Sovereign Data Agent</span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-[#30363d]" />

        {/* Status badge */}
        <StatusBadge />

        {/* Offline Ready badge */}
        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium text-emerald-500/70 border-emerald-500/20 bg-emerald-500/5">
          ⚡ Offline Ready
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Refresh */}
        <RefreshButton />

        {/* Divider */}
        <div className="h-5 w-px bg-[#30363d]" />

        {/* Syncthing link */}
        <SyncthingLink />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="rounded-lg w-8 h-8 bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-white font-bold text-sm">SDA</span>
          </div>

          {/* Hamburger */}
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <div
          className={`transition-all duration-200 overflow-hidden border-t border-[#30363d] ${
            menuOpen ? 'max-h-48' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-3 px-4 py-3">
            <StatusBadge />
            <RefreshButton />
            <SyncthingLink />
          </div>
        </div>
      </div>
    </header>
  )
}
