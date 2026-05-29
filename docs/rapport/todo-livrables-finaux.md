# Livrables Finaux — Reste à Faire

**Projet :** SDA — Coffre-Fort Data P2P Souveraine  
**Étudiant :** Jesse MPIGA-ODOUMBA — EIGSI Promo 2026  
**Entreprise :** AL BARAA CONSULTING — Tuteur : Mme Soumia CHOKRI  
**Date de mise à jour :** 2026-05-30  
**Statut prototype :** ✅ 100% techniquement validé (32/33 PASS — 2026-05-27)

---

## Livrables restants (tous académiques)

### 1. Rapport Final de Stage
**Deadline : 23/07/2026**  
**Format : PDF — 30+ pages — gabarit EIGSI**

Plan suggéré :

- Résumé exécutif (1 page)
- Introduction & contexte (problématique souveraineté numérique Afrique, AUDPF)
- Présentation d'AL BARAA CONSULTING
- Analyse fonctionnelle (Bête à Corne, Pieuvre, FAST)
- État de l'art & positionnement technologique (IPFS vs Solid vs SDA)
- Architecture technique (diagrammes C4, couches, flux de données)
- Implémentation — Module Stockage Local (FastAPI, DuckDB, SQLite, Fernet)
- Implémentation — Module Synchronisation P2P (Syncthing, CRDT LWW)
- Implémentation — Sécurité (mTLS x509, TLS 1.3, chiffrement at-rest)
- Implémentation — Frontend (React dashboard, design souverain)
- Tests & Validation (résultats 32/33 PASS cluster 3 nœuds)
- Difficultés rencontrées & solutions (journal technique)
- Bilan & perspectives (passage POC → production, 10+ nœuds)
- Conclusion
- Annexes (captures d'écran, logs de tests, code clé)

Sources disponibles dans le repo :
- `docs/rapport/rapport-tests-validation.md` — résultats complets
- `docs/rapport/journal-technique-deploiement.md` — incidents & solutions
- `docs/architecture/security.md` — architecture sécurité
- `docs/install/` — guides déploiement (preuves d'implémentation)

---

### 2. Évaluation des Compétences (signé + tamponné)
**Deadline : 23/07/2026**  
**Format : grille EIGSI PDF — signé par Mme Soumia CHOKRI**

- Télécharger la grille d'évaluation sur la plateforme EIGSI
- La remettre à Mme CHOKRI pour remplissage, signature et tampon AL BARAA CONSULTING
- Déposer sur la plateforme EIGSI avant le 23/07/2026

---

### 3. Plan de Soutenance
**Deadline : 30/07/2026**  
**Format : PDF — 1 à 2 pages**

Structure suggérée :

- Titre, nom, entreprise, tuteurs, date de soutenance
- Problématique en une phrase
- Plan de présentation (titres des slides avec durée)
- Points clés à démontrer en live (démo cluster 3 nœuds)
- Questions jury anticipées & réponses préparées

---

### 4. Support de Soutenance
**Deadline : 06/08/2026**  
**Format : PPT ou PDF — 15 à 20 slides**

Plan de slides suggéré :

| Slide | Titre | Durée |
|-------|-------|-------|
| 1 | Page de garde — SDA, EIGSI × AL BARAA, Promo 2026 | — |
| 2 | Problématique : souveraineté numérique en Afrique | 1 min |
| 3 | Solution proposée : la Brique Universelle décentralisée | 1 min |
| 4 | Architecture 3 couches (Nginx mTLS / FastAPI / DuckDB+Syncthing) | 2 min |
| 5 | Paradigme Code-to-Data vs Cloud | 1 min |
| 6 | Démo live — Cluster 3 nœuds (schéma) | 1 min |
| 7 | Démo live — Ingest depuis Win11, réplication sur Ubuntu + Kali | 3 min |
| 8 | Démo live — Dashboard frontend (métriques Syncthing, coffre-fort) | 2 min |
| 9 | Résultats tests : 32/33 PASS — tableau par nœud | 2 min |
| 10 | Sécurité : TLS 1.3, mTLS x509, Fernet AES-128 | 1 min |
| 11 | Résilience : offline-ready, CRDT, 45h uptime | 1 min |
| 12 | Conformité AUDPF — données 100% locales | 1 min |
| 13 | Difficultés rencontrées & solutions (top 3) | 1 min |
| 14 | Bilan & perspectives (10+ nœuds, gRPC, mobile) | 1 min |
| 15 | Conclusion — indicateurs de succès tous atteints | 1 min |
| 16 | Questions | — |

---

## Points bonus à mentionner en soutenance

Ces réalisations dépassent le cahier des charges initial et renforcent la valeur du PFE :

- **Frontend React professionnel** avec design Moroccan Dark Tech (identité africaine souveraine)
- **Coffre-fort de fichiers P2P** avec chiffrement Fernet et propriété par nœud
- **Déploiement entièrement automatisé** — zéro action manuelle pour la clé API Syncthing
- **Audit trail blockchain-style** — hashes SHA-256 chaînés, non falsifiables
- **Résolution de bugs production** documentée (tremblement SVG, include nginx optionnel)

---

## Planning de finalisation suggéré

| Semaine | Période | Action |
|---------|---------|--------|
| S18-S19 | 02–13/06/2026 | Rédiger rapport final (introduction → architecture) |
| S20-S21 | 16–27/06/2026 | Rédiger rapport final (implémentation → tests) |
| S22 | 30/06–04/07/2026 | Finaliser rapport, relecture, mise en forme EIGSI |
| S23 | 07–11/07/2026 | Déposer rapport + obtenir signature Mme CHOKRI |
| S24 | 14–18/07/2026 | Plan de soutenance (1-2 pages) |
| S25 | 21–25/07/2026 | Support de soutenance (slides) |
| S26 | 28/07–01/08/2026 | Répétition soutenance, Q&A anticipées |
| S27 | 04–06/08/2026 | Dépôt final — soutenance |

---

*Document généré le 2026-05-30 — SDA-Prototype v0.2 — EIGSI × AL BARAA CONSULTING*
