import { Activity } from 'lucide-react'
import { EventFeed } from '../components/EventFeed'
import { PageHero } from '../components/PageHero'

function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/12 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
      Live
    </span>
  )
}

export default function EventsPage() {
  return (
    <div>
      <PageHero
        icon={Activity}
        iconAccent="rouge"
        title="Journal d'événements"
        description="Bus d'événements Syncthing temps réel — fichiers modifiés, connexions, système"
        badge={<LiveBadge />}
        stats={[
          { label: 'Polling',  value: '3 s',           accent: 'slate' },
          { label: 'Rétention', value: '50 événements', accent: 'slate' },
          { label: 'Source',   value: 'Syncthing API',  accent: 'slate' },
        ]}
      />
      <EventFeed />
    </div>
  )
}
