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

const accentStyles: Record<string, { text: string; bg: string; strip: string; glow: string }> = {
  'text-emerald-400': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', strip: 'from-emerald-500/0 via-emerald-400/70 to-emerald-500/0', glow: 'shadow-[0_0_32px_rgba(52,211,153,0.07)]' },
  'text-blue-400':    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    strip: 'from-blue-500/0 via-blue-400/70 to-blue-500/0',    glow: 'shadow-[0_0_32px_rgba(96,165,250,0.07)]' },
  'text-violet-400':  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  strip: 'from-violet-500/0 via-violet-400/70 to-violet-500/0',  glow: 'shadow-[0_0_32px_rgba(167,139,250,0.07)]' },
  'text-[#C79A1B]':   { text: 'text-[#C79A1B]',   bg: 'bg-[#C79A1B]/10',   strip: 'from-[#C79A1B]/0 via-[#C79A1B]/70 to-[#C79A1B]/0',   glow: 'shadow-[0_0_32px_rgba(199,154,27,0.08)]' },
  'text-[#B3121B]':   { text: 'text-[#B3121B]',   bg: 'bg-[#B3121B]/10',   strip: 'from-[#B3121B]/0 via-[#B3121B]/70 to-[#B3121B]/0',   glow: 'shadow-[0_0_32px_rgba(179,18,27,0.08)]' },
  'text-amber-400':   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   strip: 'from-amber-500/0 via-amber-400/70 to-amber-500/0',   glow: 'shadow-[0_0_32px_rgba(251,191,36,0.07)]' },
  'text-rose-400':    { text: 'text-rose-400',    bg: 'bg-rose-500/10',    strip: 'from-rose-500/0 via-rose-400/70 to-rose-500/0',    glow: 'shadow-[0_0_32px_rgba(251,113,133,0.07)]' },
  'text-cyan-400':    { text: 'text-cyan-400',    bg: 'bg-cyan-500/10',    strip: 'from-cyan-500/0 via-cyan-400/70 to-cyan-500/0',    glow: 'shadow-[0_0_32px_rgba(34,211,238,0.07)]' },
  'text-slate-400':   { text: 'text-slate-400',   bg: 'bg-slate-500/10',   strip: 'from-slate-500/0 via-slate-400/40 to-slate-500/0',   glow: '' },
}

const DEFAULT = 'text-emerald-400'

function SkeletonContent() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-20 rounded bg-white/5" />
      <div className="h-8 w-28 rounded bg-white/5" />
      <div className="h-3 w-16 rounded bg-white/5" />
    </div>
  )
}

export function MetricCard({ icon: Icon, label, value, sub, accent = DEFAULT, loading = false, trend }: Props) {
  const s = accentStyles[accent] ?? accentStyles[DEFAULT]

  const trendColor = !trend ? ''
    : trend.startsWith('+') ? 'text-emerald-400'
    : trend.startsWith('-') ? 'text-red-400'
    : 'text-slate-400'

  return (
    <div className={[
      'relative flex flex-col gap-3 rounded-2xl p-5 min-w-0',
      'bg-gradient-to-br from-[#160C07] to-[#0E0805]',
      'shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
      s.glow,
    ].join(' ')}>

      {/* Top accent glow strip */}
      <span className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r ${s.strip}`} />

      {loading ? <SkeletonContent /> : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest truncate">{label}</span>
            <div className={`rounded-lg p-1.5 ${s.bg}`}>
              <Icon size={14} className={s.text} />
            </div>
          </div>

          <div className="flex items-end gap-2 min-w-0">
            <span className={`text-2xl lg:text-3xl font-bold tracking-tight truncate ${s.text}`}>{value}</span>
            {trend && <span className={`text-sm font-medium mb-1 shrink-0 ${trendColor}`}>{trend}</span>}
          </div>

          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </>
      )}
    </div>
  )
}
