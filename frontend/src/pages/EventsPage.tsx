import { EventFeed } from '../components/EventFeed'

export default function EventsPage() {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-6">
        Flux d'événements Syncthing en temps réel — fichiers, réseau, système
      </p>
      <EventFeed />
    </div>
  )
}
