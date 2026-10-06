# ADR-0001 — Monorepo unique pour l'ensemble du projet Veille

- **Statut** : Accepté
- **Date** : 2026-09-14
- **Phase concernée** : toutes
- **Décideurs** : session Architecture (à confirmer par le porteur du projet)

## Context

Veille comprendra à terme : une application mobile, un backend, un service d'activation
successorale, un back-office, des services IA, de l'infrastructure as code, de la documentation et
des scripts de sécurité. L'équipe est réduite (1 à 5 personnes) et le développement s'appuie sur
plusieurs sessions d'agents de code travaillant en parallèle, pour lesquelles **la continuité passe
exclusivement par le repository** (cf. `AGENTS.md` §12).

## Decision

**Un monorepo unique `veille`**, organisé en `apps/`, `packages/`, `infra/`, `docs/`, `tools/`,
avec pnpm workspaces + Turborepo, CODEOWNERS par domaine et workflows CI filtrés par chemin.

Deux exceptions envisagées **ultérieurement**, et seulement si le besoin est démontré :
- un dépôt **privé séparé** pour les runbooks et secrets d'exploitation sensibles (`veille-ops`) ;
- un dépôt **public séparé** pour publier la spécification du format d'export VEA
  (ne jamais mélanger public et privé dans un même dépôt).

## Alternatives

1. **Multirepo dès le départ** (mobile / api / infra / docs séparés).
2. **Hybride** : monorepo applicatif + repo infra séparé immédiatement.
3. **Monorepo avec outillage lourd (Nx, Bazel)**.

## Why

- **Continuité multi-sessions** : `AGENTS.md`, les ADR, `progress.md`, le code et les tests forment
  une seule source de vérité. Avec N repos, une session ne voit qu'une fraction du projet — c'est
  rédhibitoire pour le mode de travail retenu.
- **Équipe réduite** : le coût fixe par repo (CI, dépendances, règles de sécurité, revues) se
  multiplie par N, sans bénéfice à cette échelle.
- **Sécurité** : une seule configuration à durcir et à vérifier ; l'expérience montre que les failles
  viennent plus souvent d'une configuration oubliée dans l'un des N repos que de l'absence de
  cloisonnement.
- **Refactors transverses** : changer un contrat partagé (format d'export, schéma de permissions) se
  fait en un commit atomique, testé d'un bloc.
- **Réversibilité** : extraire un package vers un repo dédié est simple (`git subtree split`) ;
  fusionner des repos l'est beaucoup moins. Le monorepo garde les deux options ouvertes.

## Trade-offs

- L'accès au repo donne accès à **tout** (y compris l'IaC) → compensé par CODEOWNERS, environnements
  GitHub protégés, et extraction ultérieure des éléments les plus sensibles.
- CI potentiellement lente → compensée par `paths-filter` et le cache Turborepo ; à surveiller.
- Versionnage indépendant moins naturel → tags préfixés (`mobile-v1.2.0`).
- Historique Git plus volumineux et plus bruyant.

## Consequences

- Créer `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json` à la racine.
- Workflows CI séparés par domaine, avec filtres de chemins et permissions minimales.
- `CODEOWNERS` obligatoire dès le premier commit de code, avec revue sécurité sur
  `packages/core/src/crypto/`, `packages/core/src/trusted-contact/`, `infra/`, `.github/workflows/`.
- Règle de lint interdisant les imports inter-couches non autorisés (remplace la frontière physique
  qu'aurait donnée le multirepo).

## Revisit when

- L'équipe dépasse ~10 personnes ou des prestataires externes doivent accéder à une partie seulement.
- La CI dépasse durablement 15 minutes malgré le filtrage.
- Un composant doit être ouvert (open source) ou vendu séparément.
- Une exigence de certification impose un cloisonnement physique des dépôts.
