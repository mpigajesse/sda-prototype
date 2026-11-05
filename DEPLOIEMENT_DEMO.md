# Démo publique du nœud SDA (gratuite, Render)

Un seul service Render **Docker** (`Dockerfile.demo`, branche `demo-publique`) : FastAPI sert
l'API **et** le tableau de bord React construit, sur la même origine.

Ce qui change par rapport au déploiement réel (`docker-compose.yml`), et seulement si
`DEMO_PASSWORD` est défini (`backend/app/demo.py`) :

- **Syncthing est simulé** : un cluster fictif de trois nœuds (win11, ubuntu, kali), ses
  connexions et son flux d'évènements. Syncthing ne peut pas tourner sur l'hébergement
  gratuit, et un vrai nœud n'expose jamais son interface Syncthing sur Internet.
- **Données fictives** au démarrage : 24 relevés de deux tenants fictifs dans DuckDB (journal
  d'audit chaîné) et cinq documents dans le coffre-fort, dont deux appartenant aux pairs
  (chiffrés avec leur clé, donnée dans `LISEZ-MOI-demo.txt` pour tester « Déverrouiller »).
- **Page de connexion** : compte `demo`, mot de passe `DEMO_PASSWORD`, affichés sur la page.
- **Plafonds du coffre-fort** : 2 Mo par fichier, 30 fichiers au plus.
- Le disque gratuit est effacé à chaque mise en veille (15 min sans visite) : la démo revient
  à son état initial. Premier chargement après une veille : 30 à 60 s.

| Champ Render | Valeur |
|---|---|
| Runtime | Docker — Dockerfile `Dockerfile.demo`, contexte `.` |
| Instance | Free |
| Variables | `DEMO_PASSWORD=<affiché publiquement>`, `SECRET_KEY` (aléatoire) |

Domaine personnalisé : Render → *Settings → Custom Domains*, puis chez le fournisseur
`A @ → 216.24.57.1` et `CNAME www → <service>.onrender.com`. Aucune variable à modifier :
l'application n'a pas de liste d'hôtes autorisés et le frontend est sur la même origine.
