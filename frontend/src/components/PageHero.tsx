import { type LucideIcon } from 'lucide-react'

export interface StatChip {
  label: string
  value: string | number
  accent?: 'emerald' | 'gold' | 'rouge' | 'amber' | 'slate' | 'sky'
}

interface PageHeroProps {
  icon: LucideIcon
  iconAccent?: 'gold' | 'rouge' | 'emerald' | 'sky' | 'slate'
  title: string
  description: string
  stats?: StatChip[]
  badge?: React.ReactNode
}

const ACCENT_CHIP: Record<NonNullable<StatChip['accent']>, { chip: string; val: string }> = {
  emerald: { chip: 'bg-emerald-500/10 border-emerald-500/20', val: 'text-emerald-400' },
  gold:    { chip: 'bg-[#C79A1B]/10 border-[#C79A1B]/20',    val: 'text-[#C79A1B]' },
  rouge:   { chip: 'bg-[#B3121B]/10 border-[#B3121B]/20',    val: 'text-[#B3121B]' },
  amber:   { chip: 'bg-amber-500/10 border-amber-500/20',    val: 'text-amber-400' },
  sky:     { chip: 'bg-sky-500/10 border-sky-500/20',        val: 'text-sky-400' },
  slate:   { chip: 'bg-slate-500/8 border-slate-500/20',     val: 'text-slate-300' },
}

const ICON_ACCENT: Record<string, { bg: string; icon: string }> = {
  gold:    { bg: 'bg-[#C79A1B]/12 shadow-[0_0_14px_rgba(199,154,27,0.12)]', icon: 'text-[#C79A1B]' },
  rouge:   { bg: 'bg-[#B3121B]/12 shadow-[0_0_14px_rgba(179,18,27,0.12)]', icon: 'text-[#B3121B]' },
  emerald: { bg: 'bg-emerald-500/12 shadow-[0_0_14px_rgba(52,211,153,0.1)]', icon: 'text-emerald-400' },
  sky:     { bg: 'bg-sky-500/12 shadow-[0_0_14px_rgba(56,189,248,0.1)]',   icon: 'text-sky-400' },
  slate:   { bg: 'bg-slate-500/10',                                         icon: 'text-slate-400' },
}

function Chip({ label, value, accent = 'slate' }: StatChip) {
  const s = ACCENT_CHIP[accent] ?? ACCENT_CHIP.slate
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${s.chip}`}>
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${s.val}`}>{value}</span>
    </div>
  )
}

export function PageHero({ icon: Icon, iconAccent = 'gold', title, description, stats, badge }: PageHeroProps) {
  const ia = ICON_ACCENT[iconAccent] ?? ICON_ACCENT.gold

  return (
    <div className="mb-6 pb-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${ia.bg}`}>
            <Icon size={17} className={ia.icon} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-[#e6edf3] leading-tight">{title}</h2>
              {badge}
            </div>
            <p className="text-sm text-slate-500 mt-0.5 leading-snug">{description}</p>
          </div>
        </div>

        {stats && stats.length > 0 && (
          <div className="hidden md:flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {stats.map((s) => <Chip key={s.label} {...s} />)}
          </div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="md:hidden flex items-center gap-2 mt-3 ml-12 flex-wrap">
          {stats.map((s) => <Chip key={s.label} {...s} />)}
        </div>
      )}

      {/* Séparateur zellige marocain */}
      <div className="flex items-center gap-1.5 mt-4">
        <div className="flex-1 h-px bg-gradient-to-r from-[#3D2A1E]/80 via-[#C79A1B]/20 to-transparent" />
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <polygon points="5,0.5 9.5,5 5,9.5 0.5,5" fill="#C79A1B" opacity="0.4" />
        </svg>
        <div className="w-4 h-px bg-[#C79A1B]/15" />
        <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden>
          <polygon points="3,0.5 5.5,3 3,5.5 0.5,3" fill="#C79A1B" opacity="0.25" />
        </svg>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[#3D2A1E]/60 to-transparent" />
      </div>
    </div>
  )
}
