# Current Progress

> Mis à jour à chaque tâche significative. **Aucune donnée personnelle, aucun secret ici.**
> Dernière mise à jour : 2026-09-14 — session *Architecture*.

## Completed

- **Phase 0 — Cadrage architectural** (branche `claude/practical-hypatia-se6kbi`)
  - `AGENTS.md` : règles permanentes (invariants, sécurité, privacy, IA, Git, tests, interdictions, DoD).
  - `docs/product/` : hypothèses et questions critiques, contraintes juridiques, roadmap 6 phases,
    liste des décisions à prendre.
  - `docs/architecture/` : monorepo et arborescence, architecture mobile POC, architecture cible,
    data flow / classification / trust boundaries / dépendances / infrastructure, IA locale,
    observabilité, DevSecOps, stack technique, stratégie de tests.
  - `docs/security/` : threat model initial, contrôles par frontière de confiance.
  - `docs/privacy/` : classification des données, export / portabilité / suppression (format VEA).
  - `docs/decisions/` : ADR-0001 à ADR-0010 + template.

## In Progress

- Rien. **Le projet attend la validation de l'architecture par le porteur** avant tout code.

## Blocked

- **Développement Phase 1 bloqué** tant que les décisions 🔴 de
  `docs/product/04-decisions-a-prendre.md` ne sont pas tranchées, en particulier :
  - D1 juridiction cible, D2 nature du document, D3 libellé du rôle de confiance
  - D8 zero-knowledge strict ou récupération assistée
  - D9 les données doivent-elles survivre à la perte de l'appareil
  - D16 React Native/Expo vs Flutter (confirmation)
  - D22 validation explicite de cette architecture
  - D25 constitution du panel de testeurs

## Decisions Pending

Voir `docs/product/04-decisions-a-prendre.md` (D1 à D25).
Points nécessitant une **validation juridique** (⚖️) : nature du document de legs, preuves de décès
acceptées, durées de conservation, nécessité HDS, base légale du traitement des données du contact de
confiance, qualification du responsable de traitement en Phase 1.

## Next Steps

1. **Le porteur du projet valide ou amende cette architecture** (ADR par ADR si nécessaire).
2. Trancher les décisions 🔴.
3. Session *Setup* : squelette du monorepo (pnpm + Turborepo + TypeScript), CI minimale
   (lint, typecheck, tests, gitleaks), branch protection, CODEOWNERS, PR template.
4. Session *UX/UI* : design system et maquettes des 8 parcours (`packages/ui`).
5. Session *Legs* : règles de complétude et cas bloquants dans `packages/core/src/will` + tests.
6. Session *Trusted Contact* : machine à états de l'activation dans `packages/core` + tests exhaustifs
   (y compris transitions illégales), en simulation.
7. Session *Mobile* : assemblage des parcours.
8. Session *QA* : mise en place de Maestro et de la matrice de tests.
9. En parallèle : prise de contact avec un juriste (points ⚖️) et recrutement des testeurs.

## Known Issues / Risques ouverts

- La perte du code de récupération entraîne une perte définitive des données (arbitrage D8 requis).
- Le mécanisme cryptographique de libération de la clé successorale n'est pas encore spécifié
  (ADR-0005, options A/B/C) — **revue par un cryptographe externe requise avant implémentation**.
- Les hypothèses juridiques (H1, H2) ne sont pas validées par un professionnel.
- Aucun test utilisateur n'a encore été mené : le produit reste une hypothèse.
