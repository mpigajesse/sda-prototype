import { type LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  label: string
  value: string
  sub?: string
  accent?: string
  loading?: boolean
  trend?: string
}

const accentStyles: Record<string, { text: string; border: string; bg: string }> = {
  'text-emerald-400': {
    text: 'text-emerald-400',
    border: 'border-t-emerald-500/50',
    bg: 'bg-emerald-500/10',
  },
  'text-blue-400': {
    text: 'text-blue-400',
    border: 'border-t-blue-500/50',
    bg: 'bg-blue-500/10',
  },
  'text-violet-400': {
    text: 'text-violet-400',
    border: 'border-t-violet-500/50',
    bg: 'bg-violet-500/10',
  },
  'text-amber-400': {
    text: 'text-amber-400',
    border: 'border-t-amber-500/50',
    bg: 'bg-amber-500/10',
  },
  'text-rose-400': {
    text: 'text-rose-400',
    border: 'border-t-rose-500/50',
    bg: 'bg-rose-500/10',
  },
  'text-cyan-400': {
    text: 'text-cyan-400',
    border: 'border-t-cyan-500/50',
    bg: 'bg-cyan-500/10',
  },
  'text-slate-400': {
    text: 'text-slate-400',
    border: 'border-t-slate-500/50',
    bg: 'bg-slate-500/10',
  },
}

const DEFAULT_ACCENT = 'text-emerald-400'

function isTrendPositive(trend: string): boolean {
  return trend.startsWith('+')
}

function isTrendNegative(trend: string): boolean {
  return trend.startsWith('-')
}

function SkeletonContent() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-20 rounded bg-[#30363d]" />
      <div className="h-7 w-28 rounded bg-[#30363d]" />
    </div>
  )
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = DEFAULT_ACCENT,
  loading = false,
  trend,
}: Props) {
  const styles = accentStyles[accent] ?? accentStyles[DEFAULT_ACCENT]

  const trendColor =
    trend === undefined
      ? ''
      : isTrendPositive(trend)
        ? 'text-emerald-400'
        : isTrendNegative(trend)
          ? 'text-red-400'
          : 'text-slate-400'

  return (
    <div
      className={[
        'relative flex flex-col gap-3 rounded-xl p-5 slide-in',
        'bg-[#161b22]',
        'border-t-2',
        styles.border,
        'transition-all duration-200',
      ].join(' ')}
    >
      {loading ? (
        <SkeletonContent />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs uppercase tracking-widest">{label}</span>
            <span className={`rounded-lg p-1.5 ${styles.bg}`}>
              <Icon size={15} className={styles.text} />
            </span>
          </div>

          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${styles.text}`}>{value}</span>
            {trend !== undefined && (
              <span className={`text-sm font-medium mb-1 ${trendColor}`}>{trend}</span>
            )}
          </div>

          {sub && <div className="text-slate-500 text-sm">{sub}</div>}
        </>
      )}
    </div>
  )
}
