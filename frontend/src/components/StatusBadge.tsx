import { CheckCircle2, RefreshCw, Search, AlertCircle, PauseCircle, HelpCircle } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

type BadgeState = 'idle' | 'syncing' | 'scanning' | 'error' | 'paused' | 'unknown'
type BadgeSize = 'sm' | 'md'

interface Props {
  state: BadgeState | string
  size?: BadgeSize
}

interface StateConfig {
  label: string
  textColor: string
  dotColor: string
  bg: string
  pulse: boolean
  Icon: LucideIcon
}

const stateConfig: Record<string, StateConfig> = {
  idle:     { label: 'Synchronisé', textColor: 'text-emerald-400', dotColor: 'bg-emerald-400', bg: 'bg-emerald-500/10', pulse: false, Icon: CheckCircle2 },
  syncing:  { label: 'En cours...', textColor: 'text-[#C79A1B]',  dotColor: 'bg-[#C79A1B]',  bg: 'bg-[#C79A1B]/10',  pulse: true,  Icon: RefreshCw },
  scanning: { label: 'Analyse...',  textColor: 'text-yellow-400',  dotColor: 'bg-yellow-400',  bg: 'bg-yellow-500/10',  pulse: true,  Icon: Search },
  error:    { label: 'Erreur',      textColor: 'text-red-400',     dotColor: 'bg-red-400',     bg: 'bg-red-500/10',     pulse: false, Icon: AlertCircle },
  paused:   { label: 'En pause',    textColor: 'text-slate-400',   dotColor: 'bg-slate-400',   bg: 'bg-slate-500/10',   pulse: false, Icon: PauseCircle },
  unknown:  { label: 'Inconnu',     textColor: 'text-slate-400',   dotColor: 'bg-slate-400',   bg: 'bg-slate-500/10',   pulse: false, Icon: HelpCircle },
}

const FALLBACK: StateConfig = { label: '', textColor: 'text-slate-400', dotColor: 'bg-slate-400', bg: 'bg-slate-500/10', pulse: false, Icon: HelpCircle }

export function StatusBadge({ state, size = 'md' }: Props) {
  const cfg = stateConfig[state] ?? { ...FALLBACK, label: state }
  const iconSize = size === 'sm' ? 13 : 14

  return (
    <span className={[
      'inline-flex items-center gap-1.5 font-medium rounded-full px-2.5 py-1 text-sm',
      cfg.bg, cfg.textColor,
    ].join(' ')}>
      <span className={['w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dotColor, cfg.pulse ? 'animate-pulse' : ''].join(' ')} />
      <cfg.Icon size={iconSize} strokeWidth={2} className="flex-shrink-0" />
      {cfg.label}
    </span>
  )
}
