# ADR-0009 — Observabilité sans PII, télémétrie opt-in, audit séparé

- **Statut** : Accepté
- **Date** : 2026-09-14
- **Phase concernée** : 1 → 6

## Context

Exploiter un service exige des logs, des métriques et des traces. Mais les données manipulées sont
parmi les plus sensibles possibles, et l'expérience montre que **les fuites viennent très souvent des
logs** (messages d'erreur contenant un objet complet, trace applicative avec un nom de fichier,
outil tiers d'analytics collectant tout par défaut).

## Decision

1. **Trois journaux séparés**, avec des finalités, des stockages et des rétentions distincts :
   logs techniques (30 j), audit trail (longue durée, WORM, chaîné par hash), télémétrie produit
   (opt-in, 13 mois max).
2. **Aucune PII ni contenu documentaire dans les logs**, y compris en développement.
3. Le logger n'accepte qu'un **type d'événement déclaré** (union TypeScript), jamais une chaîne
   libre ; `console.log` est interdit par ESLint.
4. **Liste d'autorisation** de champs : tout champ non déclaré est supprimé avant écriture.
5. **Test automatisé en CI** : détection de motifs (email, IBAN, téléphone, NIR) dans les sorties de
   log → échec du build.
6. **Aucune télémétrie, aucun crash reporting distant en Phase 1.** Ensuite : opt-in explicite,
   identifiant d'installation rotatif et réinitialisable, hébergement UE.
7. **Aucun SDK d'analytics tiers** dans l'application (Firebase Analytics, Google Analytics, etc.).
8. L'utilisateur peut **consulter et exporter son propre journal d'audit**.

## Alternatives

1. **Logs classiques avec nettoyage a posteriori** — inefficace : on découvre la fuite après coup, et
   les données sont déjà répliquées dans les sauvegardes.
2. **Analytics SaaS grand public** — rapide et riche, mais transferts hors UE, profilage, et
   contradiction frontale avec la promesse produit.
3. **Aucune observabilité** — intenable en production : on ne peut pas exploiter ce qu'on ne mesure pas.

## Why

- Un logger **typé avec liste d'autorisation** rend la fuite structurellement difficile, là où une
  règle écrite (« ne loguez pas de PII ») est systématiquement violée un jour ou l'autre.
- Séparer audit et logs techniques évite deux erreurs classiques : purger un audit qui avait valeur
  de preuve, ou conserver dix ans des logs de debug contenant des données personnelles.
- L'audit **chaîné par hash** rend une altération détectable — essentiel pour un produit dont le
  risque principal est la fraude à l'activation.
- Donner à l'utilisateur l'accès à son propre audit est un puissant mécanisme de détection d'abus,
  et un argument de confiance.

## Trade-offs

- Diagnostic plus difficile : sans identifiant utilisateur ni contenu, certains bugs sont plus longs à
  reproduire. Atténuation : identifiants de corrélation opaques, codes d'erreur riches, journal
  technique local consultable par l'utilisateur et **transmis uniquement s'il le décide**.
- Moins de données produit pour piloter les décisions → compensé par des tests utilisateurs qualitatifs.
- Coût d'exploitation d'une stack d'observabilité auto-hébergée en UE.

## Consequences

- Port `Logger` typé dans `packages/core/src/ports`, avec redaction par défaut.
- Règle ESLint `no-console` + règle Semgrep interdisant de loguer des objets de domaine.
- Test privacy obligatoire dans la matrice de tests.
- L'audit trail est implémenté **dès la Phase 1**, en local, exportable dans l'archive VEA.

## Revisit when

- Une exigence réglementaire impose de conserver davantage (ou moins) d'informations.
- Un incident montre que le diagnostic est impossible avec le niveau de détail actuel.
