import { FilesManager } from '../components/FilesManager'

export default function FilesPage() {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-6">
        Déposez n'importe quel fichier — il sera chiffré avec votre clé Fernet et répliqué automatiquement sur tous les nœuds P2P.
      </p>
      <FilesManager />
    </div>
  )
}
