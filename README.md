# Veille

Application mobile permettant à toute personne — **sans compétence informatique** — de :

- rédiger un **document de volontés** et préparer un legs, de façon guidée ;
- conserver ses **documents personnels chiffrés** (factures, bulletins de salaire, papiers administratifs) ;
- **interroger une IA locale** sur ses propres documents, sans qu'ils quittent l'appareil ;
- désigner un **contact de confiance** qui n'obtient **aucun accès** tant que des conditions
  d'activation strictes ne sont pas remplies ;
- **exporter, migrer ou supprimer** l'intégralité de ses données à tout moment.

> ⚠️ Veille **ne remplace ni un notaire ni un avocat**, et ne produit pas un testament juridiquement
> valide en l'état. Voir [ADR-0008](docs/decisions/0008-perimetre-juridique.md).

---

## État du projet

**Phase 0 — structure du projet : terminée.** Règles permanentes, architecture, threat model,
classification des données, ADR-0001 à ADR-0011. Aucun code applicatif.

**Phase 1 — POC UX/UI en PWA : phase en cours.** Le POC est une application web progressive,
installable et fonctionnelle hors ligne, distribuée par un simple lien — le but étant de le mettre
entre les mains de testeurs sans leur imposer d'installation. Décision et limites assumées :
[ADR-0011](docs/decisions/0011-pwa-poc-phase-1.md). L'application mobile native reste la cible des
phases 3+ ([ADR-0002](docs/decisions/0002-react-native-expo.md)).

> ⚠️ Le POC est une **version d'évaluation** : les clés n'y sont pas protégées par du matériel.
> **N'y déposez pas de vrais documents.**

État détaillé : [`docs/progress.md`](docs/progress.md).

---

## Par où commencer (toute nouvelle session de travail)

1. [`AGENTS.md`](AGENTS.md) — **règles permanentes, à lire en premier**
2. [`docs/progress.md`](docs/progress.md) — où en est le projet
3. Ce README
4. `git status` / `git log --oneline -20`
5. Les [ADR](docs/decisions/) pertinents
6. La documentation d'architecture du domaine concerné

Le chat n'est jamais la source de vérité : **Git, le code, les tests, la documentation et les ADR le sont.**

---

## Documentation

### Produit
| Document | Contenu |
|----------|---------|
| [Hypothèses et questions critiques](docs/product/01-hypotheses-et-questions.md) | Ce sur quoi repose l'architecture, et ce qu'il faut trancher |
| [Contraintes juridiques](docs/product/02-contraintes-juridiques.md) | Testament, rôles, fraude, RGPD, AI Act — ⚖️ à valider |
| [Roadmap](docs/product/03-roadmap.md) | Phases 0 à 6 : objectifs, livrables, critères, risques, ce qu'il ne faut PAS faire |
| [Décisions à prendre](docs/product/04-decisions-a-prendre.md) | D1 à D25, avec recommandations |

### Architecture
| Document | Contenu |
|----------|---------|
| [Monorepo et arborescence](docs/architecture/01-github-monorepo.md) | Comparaison, décision, structure exacte, règles GitHub |
| [POC PWA](docs/architecture/02-poc-pwa.md) | Phase 1 : couches, stack web, parcours, sécurité, principes UX |
| [Architecture cible](docs/architecture/03-architecture-cible.md) | Production : composants, responsabilités, environnements |
| [Cartographie des données](docs/architecture/04-data-flow-map.md) | Data flow, classification, trust boundaries, dépendances, infrastructure |
| [IA locale](docs/architecture/05-ia-locale.md) | `AIProvider`, RAG local, OCR, sécurité IA |
| [Observabilité](docs/architecture/06-observabilite.md) | Logs sans PII, audit, métriques, alertes |
| [DevSecOps](docs/architecture/07-devsecops.md) | CI/CD, outils, scans, secrets, environnements |
| [Stack technique](docs/architecture/08-stack-technique.md) | Décision → Pourquoi → Alternative → Risque |
| [Stratégie de tests](docs/architecture/09-strategie-tests.md) | Niveaux et matrice fonctionnalité × type de test |

### Sécurité et vie privée
| Document | Contenu |
|----------|---------|
| [Threat model](docs/security/01-threat-model.md) | Actifs, acteurs, risques R1–R28, risques résiduels |
| [Trust boundaries](docs/security/02-trust-boundaries.md) | Contrôles à chaque frontière |
| [Classification des données](docs/privacy/01-classification-donnees.md) | Inventaire, chiffrement, rétention |
| [Export et portabilité](docs/privacy/02-export-portabilite-suppression.md) | Format ouvert VEA, import, suppression |

### Décisions d'architecture (ADR)
[ADR-0001](docs/decisions/0001-monorepo-unique.md) monorepo ·
[0002](docs/decisions/0002-react-native-expo.md) React Native/Expo (phases 3+) ·
[0003](docs/decisions/0003-local-first-chiffrement.md) local-first et chiffrement ·
[0004](docs/decisions/0004-ai-provider-abstraction.md) abstraction IA ·
[0005](docs/decisions/0005-contact-de-confiance.md) contact de confiance ·
[0006](docs/decisions/0006-format-export-vea.md) format d'export VEA ·
[0007](docs/decisions/0007-pas-de-backend-phase-1.md) pas de backend en Phase 1 ·
[0008](docs/decisions/0008-perimetre-juridique.md) périmètre juridique ·
[0009](docs/decisions/0009-observabilite-sans-pii.md) observabilité sans PII ·
[0010](docs/decisions/0010-hebergement-ue-e2ee.md) hébergement UE et zero-knowledge ·
**[0011](docs/decisions/0011-pwa-poc-phase-1.md) PWA pour le POC de Phase 1**

---

## Principes non négociables

1. **Local-first** — l'appareil est la source de vérité.
2. **Aucune donnée ne quitte l'appareil sans consentement explicite.**
3. **Moindre privilège** — le contact de confiance n'a aucun accès avant activation validée.
4. **Portabilité** — export complet, formats ouverts, aucun verrouillage.
5. **Le stockage local n'est pas sûr par nature** — chiffrement au repos dès le POC.
6. **Jamais de PII dans les logs. Jamais de secret dans Git.**
7. **Honnêteté sur les limites juridiques** — Veille ne remplace pas un professionnel du droit.
