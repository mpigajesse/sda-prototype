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
  border: string
  pulse: boolean
  Icon: LucideIcon
}

const stateConfig: Record<string, StateConfig> = {
  idle: {
    label: 'Synchronisé',
    textColor: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    pulse: false,
    Icon: CheckCircle2,
  },
  syncing: {
    label: 'En cours...',
    textColor: 'text-blue-400',
    dotColor: 'bg-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    pulse: true,
    Icon: RefreshCw,
  },
  scanning: {
    label: 'Analyse...',
    textColor: 'text-yellow-400',
    dotColor: 'bg-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    pulse: true,
    Icon: Search,
  },
  error: {
    label: 'Erreur',
    textColor: 'text-red-400',
    dotColor: 'bg-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    pulse: false,
    Icon: AlertCircle,
  },
  paused: {
    label: 'En pause',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    pulse: false,
    Icon: PauseCircle,
  },
  unknown: {
    label: 'Inconnu',
    textColor: 'text-slate-400',
    dotColor: 'bg-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    pulse: false,
    Icon: HelpCircle,
  },
}

const FALLBACK_CONFIG: StateConfig = {
  label: '',
  textColor: 'text-slate-400',
  dotColor: 'bg-slate-400',
  bg: 'bg-slate-500/10',
  border: 'border-slate-500/30',
  pulse: false,
  Icon: HelpCircle,
}

const sizeStyles: Record<BadgeSize, { text: string; icon: number }> = {
  sm: { text: 'text-sm', icon: 13 },
  md: { text: 'text-sm', icon: 14 },
}

export function StatusBadge({ state, size = 'md' }: Props) {
  const cfg = stateConfig[state] ?? { ...FALLBACK_CONFIG, label: state }
  const { text: textSize, icon: iconSize } = sizeStyles[size]

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-medium rounded-full px-2 py-0.5',
        'border',
        cfg.bg,
        cfg.border,
        cfg.textColor,
        textSize,
      ].join(' ')}
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          cfg.dotColor,
          cfg.pulse ? 'pulse-dot' : '',
        ].join(' ')}
      />
      <cfg.Icon size={iconSize} strokeWidth={2} className="flex-shrink-0" />
      {cfg.label}
    </span>
  )
}
