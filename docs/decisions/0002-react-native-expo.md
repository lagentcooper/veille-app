# ADR-0002 — React Native + Expo (dev build) et TypeScript strict

- **Statut** : Accepté (à confirmer selon les compétences réelles de l'équipe)
- **Date** : 2026-09-14
- **Phase concernée** : 1 à 6

## Context

L'application doit être mobile (iOS + Android), très soignée sur l'UX, itérée rapidement en Phase 1
avec de vrais utilisateurs, puis capable en Phase 3 d'accéder à des fonctions natives sensibles :
Keychain/Keystore matériel, base chiffrée (SQLCipher), OCR de l'OS, exécution d'un LLM on-device.
L'équipe est réduite et le budget contraint.

## Decision

**React Native avec Expo en « dev build »** (et non Expo Go), en **TypeScript strict**,
avec `expo-router`. La logique métier vit dans `packages/core`, en TypeScript pur, sans dépendance
au framework.

## Alternatives

1. **Flutter** — rendu cohérent et performant, un seul langage (Dart), bon outillage.
2. **Natif Swift + Kotlin** — accès optimal aux API de sécurité et d'IA, meilleure intégration OS.
3. **Expo Go / React Native sans modules natifs** — le plus simple, mais incompatible avec les
   exigences cryptographiques et d'IA.
4. **Solution web/PWA** — écartée : pas de secure element, pas d'IA on-device sérieuse, pas de
   garanties de stockage.

## Why

- **Vitesse d'itération UI** : la Phase 1 est une phase de design ; React Native permet de refaire un
  parcours en quelques heures.
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

- L'équipe recrutée est majoritairement Flutter/Dart ou natif.
- L'inférence on-device se révèle impossible à intégrer proprement en React Native.
- Une exigence de sécurité (attestation matérielle avancée, anti-tampering fort) impose du natif.
