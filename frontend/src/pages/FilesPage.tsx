import { HardDrive } from 'lucide-react'
import { FilesManager } from '../components/FilesManager'
import { PageHero } from '../components/PageHero'

export default function FilesPage() {
  return (
    <div>
      <PageHero
        icon={HardDrive}
        iconAccent="rouge"
        title="Coffre-fort de fichiers"
        description="Upload → chiffrement Fernet AES-128-CBC + HMAC-SHA256 → réplication P2P — vos données ne quittent jamais vos nœuds"
        stats={[
          { label: 'Chiffrement', value: 'Fernet AES-128', accent: 'rouge' },
          { label: 'Intégrité',   value: 'HMAC-SHA256',    accent: 'gold' },
          { label: 'Transport',   value: 'mTLS 1.3',        accent: 'emerald' },
        ]}
      />
      <FilesManager />
    </div>
  )
}
