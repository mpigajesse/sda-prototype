interface LoadingCardProps {
  lines?: number
  showHeader?: boolean
  className?: string
}

const LINE_WIDTHS = ['w-full', 'w-3/4', 'w-1/2', 'w-5/6', 'w-2/3', 'w-4/5']

function getLineWidth(index: number): string {
  return LINE_WIDTHS[index % LINE_WIDTHS.length]
}

export function LoadingCard({ lines = 3, showHeader = false, className = '' }: LoadingCardProps) {
  return (
    <div className={`bg-[#161b22] border border-[#30363d] rounded-xl p-4 ${className}`}>
      <div className="animate-pulse">
        {showHeader && (
          <div className="flex items-center gap-2 mb-4">
            <div className="h-4 w-32 rounded bg-[#21262d]" />
            <div className="w-2 h-2 rounded-full bg-[#21262d]" />
          </div>
        )}

        <div className="space-y-2.5">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={`h-3 rounded bg-[#21262d] ${getLineWidth(i)}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
