# 3. Architecture GitHub — monorepo vs multirepo, et arborescence exacte

Décision détaillée : [ADR-0001](../decisions/0001-monorepo-unique.md).

---

## 3.1 Comparaison argumentée

| Critère | Monorepo (1 repo) | Multirepo (N repos) | Gagnant pour Veille |
|---------|-------------------|---------------------|---------------------|
| **Sécurité** | Une seule surface à protéger, un seul jeu de règles de branche, un seul secret scanning, un seul CODEOWNERS. Mais : toute personne ayant accès au repo voit *tout* (y compris l'IaC). | Cloisonnement fin possible (ex. repo infra réservé). Mais N fois plus de configurations à maintenir → **c'est l'oubli de configuration qui crée les failles**. | **Monorepo** — avec CODEOWNERS + environnements GitHub protégés pour compenser le cloisonnement. Extraction ultérieure de `infra/` si l'équipe grandit. |
| **Simplicité** | Un `git clone`, une CI, une convention. Idéal pour une équipe de 1–5. | Coût de coordination élevé, PR croisées, onboarding plus lourd. | **Monorepo** |
| **CI/CD** | Nécessite un filtrage par chemin (`paths:`) et un cache correct, sinon tout rebuild. Résolu par des workflows ciblés. | CI naturellement isolée par repo, mais pipelines dupliqués et dérivants. | **Monorepo** (avec `paths-filter`) |
| **Gestion des versions** | Tags préfixés (`mobile-v1.2.0`, `api-v0.3.0`) ou versionnage unifié. Refactor transverse en 1 commit. | Versionnage indépendant plus naturel, mais matrice de compatibilité à maintenir à la main. | **Monorepo**, tant qu'il n'y a pas de consommateur externe des paquets. |
| **Séparation des responsabilités** | Par dossier + CODEOWNERS + règles de lint d'import (une couche ne peut pas importer une autre couche interdite). | Séparation physique forte. | Égalité — la discipline compte plus que la frontière physique. |
| **Équipe réduite** | Avantage décisif : moins d'outillage, moins de synchronisation. | Coût fixe par repo (CI, dépendances, sécurité) multiplié. | **Monorepo** |
| **Évolution future** | Extraction d'un package vers un repo dédié = opération simple (`git subtree split`) et réversible. | Fusion de repos = opération douloureuse. | **Monorepo** (option ouverte dans les deux sens) |
| **Travail multi-chats (§31)** | Un seul point de vérité : AGENTS.md, ADR, progress.md, tests. **Décisif pour ce projet.** | Le contexte se fragmente entre les repos ; une session ne voit qu'une partie de la vérité. | **Monorepo** |

**Recommandation : monorepo unique `veille`.**

Une exception à envisager plus tard, **uniquement si** un besoin réel apparaît :
un repo **privé séparé pour les secrets d'infrastructure et les runbooks sensibles**
(`veille-ops`, accès restreint), et un repo public séparé si l'on publie une bibliothèque
(ex. la spec du format d'export) — car mélanger public et privé dans un monorepo est un risque de fuite.

---

## 3.2 Arborescence exacte (cible)

> ⚠️ En Phase 1, **seuls** `AGENTS.md`, `README.md`, `docs/`, `.github/`, `apps/web/` et
> `packages/{core,ui}` existent. Le reste est créé quand il devient nécessaire — ne pas créer de
> dossiers vides « pour plus tard ».
>
> Le livrable de Phase 1 est la **PWA** `apps/web` ([ADR-0011](../decisions/0011-pwa-poc-phase-1.md)).
> `apps/mobile` arrive en Phase 3 ([ADR-0002](../decisions/0002-react-native-expo.md)).

```
veille/
├── AGENTS.md                     # Règles permanentes (lues en premier par toute session)
├── README.md                     # Quoi, pourquoi, comment démarrer
├── CONTRIBUTING.md               # Workflow Git, conventions de commit, DoD
├── SECURITY.md                   # Politique de divulgation responsable
├── LICENSE
├── CODEOWNERS                    # Revue obligatoire par domaine
├── package.json                  # Workspaces pnpm
├── pnpm-workspace.yaml
├── turbo.json                    # Orchestration/cache des tâches (build, test, lint)
├── tsconfig.base.json
├── .gitignore / .gitattributes
├── .editorconfig
├── .nvmrc
├── .env.example                  # JAMAIS de .env rempli
│
├── .github/
│   ├── CODEOWNERS
│   ├── pull_request_template.md  # Checklist DoD + impact sécurité/privacy
│   ├── ISSUE_TEMPLATE/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci-web.yml            # lint + typecheck + tests + build (paths: apps/web, packages/**)
│       ├── ci-packages.yml
│       ├── docs.yml              # liens relatifs de la documentation
│       ├── security-sast.yml     # CodeQL + Semgrep
│       ├── security-secrets.yml  # Gitleaks (push protection GitHub en complément)
│       ├── security-deps.yml     # audit + SBOM (Syft) + Grype
│       ├── e2e-web.yml           # Playwright (nightly)
│       ├── ci-mobile.yml         # ⛔ Phase 3
│       └── release-mobile.yml    # ⛔ EAS build/submit (Phase 3+)
│
├── apps/
│   ├── web/                      # PWA React + Vite — SEUL livrable Phase 1
│   │   ├── public/
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── src/
│   │   │   ├── routes/           # react-router : routes = écrans
│   │   │   ├── features/         # Découpage par domaine métier
│   │   │   │   ├── onboarding/
│   │   │   │   ├── profile/
│   │   │   │   ├── will/         # Document de legs
│   │   │   │   ├── documents/    # Pièces justificatives
│   │   │   │   ├── assistant/    # IA locale
│   │   │   │   ├── trusted-contact/
│   │   │   │   └── data-control/ # Export / import / suppression
│   │   │   ├── infra/            # Adapters des ports (IndexedDB, OPFS, WebCrypto, mock AI)
│   │   │   ├── sw/               # Service worker — CODE SENSIBLE, revue obligatoire
│   │   │   ├── theme/
│   │   │   └── i18n/
│   │   ├── e2e/                  # Playwright
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   ├── mobile/                   # ⛔ Phase 3 — React Native / Expo (ADR-0002)
│   ├── api/                      # ⛔ Phase 3 — backend (Node/NestJS ou Go)
│   └── admin/                    # ⛔ Phase 4 — back-office de revue des activations
│
├── packages/
│   ├── core/                     # Domaine PUR (TypeScript, zéro dépendance framework)
│   │   ├── src/
│   │   │   ├── will/             # Règles de complétude, versions, checklist
│   │   │   ├── documents/        # Modèle, catégories, métadonnées
│   │   │   ├── trusted-contact/  # Modèle de permissions et machine à états d'activation
│   │   │   ├── export/           # Format d'archive VEA (spec + sérialisation)
│   │   │   ├── crypto/           # Interfaces + primitives de haut niveau (pas d'implémentation native)
│   │   │   └── ports/            # StorageProvider, CryptoProvider, AIProvider, SyncProvider, Clock, Logger
│   │   └── tests/
│   ├── ui/                       # Design system (composants, tokens, accessibilité)
│   ├── ai/                       # Abstraction AIProvider + implémentations (mock, local, cloud opt-in)
│   ├── config/                   # Configs partagées eslint/prettier/tsconfig/jest
│   └── contracts/                # ⛔ Phase 3 — schémas d'API partagés (OpenAPI/zod) + JSON Schemas VEA
│
├── infra/                        # ⛔ Phase 3 — Terraform, environnements, réseau, secrets (références)
│   ├── modules/
│   └── envs/{dev,staging,prod}/
│
├── docs/
│   ├── progress.md               # État du projet pour la session suivante
│   ├── architecture/
│   ├── security/
│   ├── privacy/
│   ├── product/
│   └── decisions/                # ADR
│
├── tools/                        # Scripts de développement (seed de données fictives, lint de docs)
└── tests/                        # Tests transverses (migration, export/import bout-en-bout)
```

### Pourquoi ce découpage

- `packages/core` **sans dépendance framework** : la logique de validité du legs et le modèle de
  permissions doivent être testables en millisecondes et réutilisables par un futur backend ou
  back-office. C'est la pièce la plus durable du projet.
- `packages/ai` isolé : changer de modèle IA ne doit toucher aucun écran (ADR-0004).
- `apps/web/src/infra` : tous les adapters concrets au même endroit → l'audit sécurité sait
  exactement où regarder (clés, fichiers, base, réseau). Même règle pour `apps/mobile` en Phase 3.
- `apps/web/src/sw` isolé : le service worker est du code privilégié (il intercepte toutes les
  requêtes de l'origine). Le sortir du reste rend sa revue obligatoire et évidente.
- `.github/workflows` séparés par domaine avec filtres de chemins : une PR de documentation ne
  déclenche pas un build mobile de 20 minutes.

---

## 3.3 Règles GitHub à appliquer dès le premier jour

| Règle | Détail |
|-------|--------|
| Branche `main` protégée | PR obligatoire, 1 revue minimum, CI verte, pas de force-push, pas de suppression, historique linéaire |
| Secret scanning + **push protection** | Activé au niveau du repo (bloque le push d'un secret détecté) |
| Dependabot | Alertes + PR de mise à jour hebdomadaires groupées |
| CODEOWNERS | `packages/core/src/crypto/`, `packages/core/src/trusted-contact/`, `apps/web/src/sw/`, `apps/web/src/infra/`, `infra/`, `.github/workflows/` → revue sécurité obligatoire |
| Environnements GitHub | `staging` et `production` avec *required reviewers* et secrets scopés (Phase 3) |
| Actions | Épinglées par SHA, `permissions:` minimales par workflow, pas de `pull_request_target` |
| Tags signés | Releases signées, SBOM attachée à chaque release |
