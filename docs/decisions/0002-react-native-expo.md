# ADR-0002 — React Native + Expo (dev build) et TypeScript strict

- **Statut** : Accepté pour les phases 3 à 6 — **amendé pour la Phase 1 par
  [ADR-0011](0011-pwa-poc-phase-1.md)** (le POC est une PWA)
- **Date** : 2026-09-14 · amendé le 2026-09-14
- **Phase concernée** : 3 à 6

> **Amendement (ADR-0011).** Le POC de Phase 1 est une PWA, pas une application React Native.
> L'analyse ci-dessous reste valable **pour le produit en production** : les limites du web qu'elle
> identifie (pas de secure element, pas d'IA on-device sérieuse, pas de garanties de stockage) sont
> réelles, et c'est pourquoi le web n'est retenu que pour le POC, avec une promesse de sécurité
> explicitement réduite. La partie durable — `packages/core` en TypeScript pur — est commune aux deux
> et ne change pas. Le choix pour la Phase 3 sera reconfirmé à la fin de la Phase 1.

## Context

L'application de production doit être mobile (iOS + Android), très soignée sur l'UX, et capable
d'accéder à des fonctions natives sensibles : Keychain/Keystore matériel, base chiffrée (SQLCipher),
OCR de l'OS, exécution d'un LLM on-device. L'équipe est réduite et le budget contraint.

## Decision

**React Native avec Expo en « dev build »** (et non Expo Go), en **TypeScript strict**,
avec `expo-router`. La logique métier vit dans `packages/core`, en TypeScript pur, sans dépendance
au framework.

## Alternatives

1. **Flutter** — rendu cohérent et performant, un seul langage (Dart), bon outillage.
2. **Natif Swift + Kotlin** — accès optimal aux API de sécurité et d'IA, meilleure intégration OS.
3. **Expo Go / React Native sans modules natifs** — le plus simple, mais incompatible avec les
   exigences cryptographiques et d'IA.
4. **Solution web/PWA** — écartée **pour la production** : pas de secure element, pas d'IA on-device
   sérieuse, pas de garanties de stockage. Retenue en revanche **pour le seul POC de Phase 1**
   ([ADR-0011](0011-pwa-poc-phase-1.md)), où aucune de ces trois exigences ne s'applique : les
   testeurs n'y déposent pas de vrais documents, l'IA est un mock, et la perte de données d'un POC
   n'a pas de conséquence.

## Why

- **Vitesse d'itération UI** : React Native permet de refaire un parcours en quelques heures.
  ⚠️ Cet argument portait à l'origine sur la Phase 1 ; il ne la concerne plus (ADR-0011), la
  validation du design se faisant sur la PWA. Il reste valable pour l'itération continue du produit
  natif à partir de la Phase 3.
- **Compétences disponibles** : l'écosystème TypeScript est le plus répandu, et il est partagé avec
  le futur backend (schémas Zod, types, règles métier réutilisables).
- **Dev build** : contrairement à Expo Go, il autorise les modules natifs nécessaires
  (`expo-secure-store`, SQLCipher, OCR, `llama.rn`) tout en conservant l'outillage Expo (EAS Build,
  gestion de la signature, mises à jour).
- **Domaine isolé** : `packages/core` étant pur TypeScript, un changement de framework mobile
  ultérieur ne détruirait pas la valeur accumulée (règles de legs, permissions, format d'export).

## Trade-offs

- Performance inférieure au natif sur les listes très longues et le traitement d'images — acceptable
  au vu des volumes attendus (H7 : < 500 documents).
- Les bindings d'IA on-device sont **plus matures en natif** ; il faudra peut-être écrire un module
  natif spécifique pour l'inférence (coût à anticiper en Phase 3).
- Dépendance à l'écosystème Expo (politique de versions, coût EAS).
- Le poids de l'application augmente (runtime JS + éventuel modèle IA).

## Consequences

- Configurer un **dev build** dès le départ (ne jamais concevoir en supposant Expo Go).
- Une règle ESLint interdit à `packages/core` d'importer quoi que ce soit de React ou React Native.
- Les modules natifs sensibles (crypto, keystore) sont encapsulés derrière des ports
  (`CryptoProvider`, `SecureKeyStore`) pour rester remplaçables et testables.
- Prévoir en Phase 3 une évaluation de performance de l'IA on-device sur un appareil d'entrée de gamme.

## Revisit when

- **Fin de la Phase 1** : le présent ADR redevient applicable. Le reconfirmer ou le remplacer à la
  lumière des tests utilisateurs et de l'expérience acquise sur la PWA (ADR-0011 §Revisit when).
- L'équipe recrutée est majoritairement Flutter/Dart ou natif.
- L'inférence on-device se révèle impossible à intégrer proprement en React Native.
- Une exigence de sécurité (attestation matérielle avancée, anti-tampering fort) impose du natif.
