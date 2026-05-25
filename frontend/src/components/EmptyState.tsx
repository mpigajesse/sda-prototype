import { PackageOpen, type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  const DisplayIcon = Icon ?? PackageOpen

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-4">
        <DisplayIcon className="w-6 h-6 text-slate-400" />
      </div>

      <p className="text-sm font-medium text-[#e6edf3] mb-1.5">{title}</p>

      {description && (
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{description}</p>
      )}

      {action && (
        action.href ? (
          <a
            href={action.href}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg px-3 py-1.5 hover:bg-blue-500/20 transition-colors"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg px-3 py-1.5 hover:bg-blue-500/20 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
