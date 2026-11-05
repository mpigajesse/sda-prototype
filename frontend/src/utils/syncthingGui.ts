// Adresse de l'interface web Syncthing du nœud. Par défaut, celle du nœud local
// (un vrai nœud SDA tourne sur la machine de l'utilisateur). La démo en ligne la
// remplace (VITE_SYNCTHING_GUI_URL=/syncthing-gui) : sinon le lien ouvrirait
// le localhost du visiteur.
export const SYNCTHING_GUI_URL: string =
  import.meta.env.VITE_SYNCTHING_GUI_URL || 'http://localhost:8384'
