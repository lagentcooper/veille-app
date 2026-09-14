# ADR-0006 — Format d'export ouvert VEA (Veille Export Archive)

- **Statut** : Accepté (structure v1 à figer en Phase 2)
- **Date** : 2026-09-14
- **Phase concernée** : 1 → 6

## Context

L'utilisateur doit rester propriétaire de ses données : export complet, documents dans leur format
d'origine, métadonnées, réimport, migration vers un autre service, aucun verrouillage propriétaire.
C'est une exigence produit centrale **et** un droit (portabilité, art. 20 RGPD).

## Decision

Un format **VEA** : archive **ZIP** contenant `manifest.json`, les **JSON Schema** des données, les
données en **JSON/JSONL**, les **fichiers originaux inchangés**, et des rendus **PDF** lisibles sans
outil. Structure détaillée : `docs/privacy/02-export-portabilite-suppression.md`.

Deux modes : **chiffré par mot de passe (par défaut)** ou en clair (avec avertissement explicite).
Le format est **versionné** (`formatVersion`) et sa spécification sera **publiée**.

## Alternatives

1. **Format propriétaire binaire** — compact et facile à valider, mais contraire au principe
   d'anti-verrouillage et illisible sans l'application.
2. **Copie de la base SQLite** — simple, mais expose des détails d'implémentation, rend la migration
   dépendante du schéma interne, et n'est pas lisible par un humain.
3. **PDF unique** — lisible, mais non réimportable et perd les fichiers originaux.
4. **Standard existant** (ex. formats d'archivage documentaire) — trop lourds et inadaptés au modèle
   de données du produit ; à réévaluer si un standard pertinent émerge.

## Why

- ZIP + JSON + JSON Schema : universels, durables, lisibles dans dix ans sans Veille.
- Les **fichiers originaux préservés** répondent littéralement à l'exigence du cahier des charges.
- Les **schémas embarqués** rendent l'archive auto-portante : un tiers peut écrire un importeur sans
  documentation externe.
- Les **hash dans le manifeste** permettent de détecter une altération et de refuser un import corrompu.
- Les **rendus PDF** répondent au cas d'usage réel : remettre un document à un notaire ou à un proche.

## Trade-offs

- Archive plus volumineuse qu'un format binaire (négligeable au vu des volumes).
- Maintenir le format en plus du schéma interne : deux représentations à faire évoluer ensemble
  (mitigé par des tests de round-trip et de migration).
- Un export en clair peut être déposé n'importe où par l'utilisateur → chiffrement par défaut et
  avertissement explicite.

## Consequences

- `packages/core/src/export` implémente la sérialisation et la désérialisation, testées en round-trip.
- Test automatisé : l'inventaire du stockage et l'inventaire de l'archive doivent **coïncider
  exactement** (aucune donnée oubliée, aucune donnée en trop).
- Toute nouvelle entité de données impose une mise à jour du schéma VEA **et** un test de migration.
- La rétrocompatibilité en lecture est obligatoire : VEA v2 doit pouvoir importer du v1.

## Revisit when

- Un standard de portabilité sectoriel s'impose.
- Le volume de données rend le ZIP inadapté (export incrémental à prévoir).
- Un partenariat impose un format d'échange spécifique (notaires, assureurs).
