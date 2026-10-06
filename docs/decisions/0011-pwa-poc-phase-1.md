# ADR-0011 — PWA pour le POC de Phase 1

- **Statut** : Accepté
- **Date** : 2026-09-14
- **Phase concernée** : 1 (POC). Les phases 3+ restent régies par [ADR-0002](0002-react-native-expo.md).
- **Amende** : [ADR-0002](0002-react-native-expo.md) (portée réduite aux phases 3+),
  [ADR-0003](0003-local-first-chiffrement.md) (variante navigateur en Phase 1)

## Context

La Phase 0 a produit la structure du projet : règles permanentes, architecture, threat model,
classification des données, ADR-0001 à ADR-0010. Elle n'a produit aucun code.

ADR-0002 a retenu React Native + Expo et a explicitement écarté le web :

> **Solution web/PWA** — écartée : pas de secure element, pas d'IA on-device sérieuse, pas de
> garanties de stockage.

Ce raisonnement reste **exact pour le produit en production**. Il répond cependant à une question qui
n'est pas celle de la Phase 1. La Phase 1 ne construit pas le produit : elle cherche à savoir si des
personnes non technophiles comprennent le document de volontés, le rôle du contact de confiance et la
promesse de confidentialité (`docs/product/03-roadmap.md`, Phase 1). Ses livrables sensibles —
règles de complétude du legs, modèle de permissions, machine à états d'activation, format d'export —
vivent dans `packages/core`, en TypeScript pur, sans dépendance au framework.

Or le POC a une contrainte propre : **être mis entre les mains de testeurs**, dont des personnes de
plus de 65 ans. Un build de développement React Native impose à chaque testeur une installation
TestFlight ou un APK à autoriser hors store. Une URL ne demande rien.

## Decision

**Le POC de Phase 1 est une PWA** (application web progressive), en TypeScript strict, installable et
fonctionnelle hors ligne.

1. `apps/web` remplace `apps/mobile` comme seul livrable applicatif de la Phase 1.
2. `packages/core` reste **identique et inchangé** : TypeScript pur, aucune dépendance au framework,
   aucune API navigateur. C'est la partie du POC qui n'est pas jetable.
3. Les ports (`StorageProvider`, `CryptoProvider`, `AIProvider`, `SecureKeyStore`) sont **inchangés
   dans leurs contrats** ; seuls leurs adapters sont web (voir ADR-0003, variante Phase 1).
4. Le chiffrement au repos est **réel dès la Phase 1** (WebCrypto, AES-256-GCM), avec une promesse de
   sécurité explicitement réduite et affichée (voir Trade-offs).
5. ADR-0002 n'est pas annulé : il redevient applicable en Phase 3, quand le produit manipulera de
   vraies données et aura besoin du secure element et de l'IA on-device.

## Alternatives

1. **Maintenir React Native + Expo en Phase 1** — cohérent avec ADR-0002 et sans rupture, mais
   impose une installation à chaque testeur et un cycle de build à chaque itération d'écran, sur la
   phase du projet où le nombre d'itérations d'UI est le plus élevé.
2. **PWA comme cible définitive, ADR-0002 annulé** — écarté : les limites identifiées par ADR-0002
   (pas de secure element, pas d'IA on-device sérieuse, stockage évictable) sont réelles et
   rédhibitoires pour un produit qui conserve les documents les plus intimes d'une personne.
3. **Maquettes Figma cliquables au lieu d'une application** — moins cher, mais ne permet ni de tester
   l'import réel d'un document, ni la recherche, ni l'export, ni de faire tourner `packages/core` ;
   ne prouve pas que le domaine est correct.
4. **Flutter Web** — mutualiserait POC et cible mobile, mais ajoute un langage, et son rendu web reste
   moins bon en accessibilité que du DOM, critère majeur pour ce public.

## Why

- **Le coût de mise entre les mains d'un testeur tombe à un lien.** C'est la variable qui décide du
  nombre de tests utilisateurs réellement menés, donc de la valeur de la Phase 1.
- **Le cycle d'itération d'écran passe de quelques minutes à quelques secondes.** La Phase 1 est une
  phase de design : c'est exactement ce qu'il faut optimiser.
- **La valeur durable est préservée intégralement.** ADR-0002 §Why l'avait anticipé : « `packages/core`
  étant pur TypeScript, un changement de framework mobile ultérieur ne détruirait pas la valeur
  accumulée ». Le domaine, les tests du domaine et le format d'export sont réutilisés tels quels par
  l'application native de la Phase 3.
- **L'accessibilité est meilleure sur le DOM** : lecteurs d'écran matures, zoom navigateur, réglages
  système respectés — décisif pour le public visé.
- **Le web impose la sobriété du domaine** : aucune API native ne peut être appelée par commodité, ce
  qui protège mécaniquement la règle « aucune logique métier hors de `domain/` ».

## Trade-offs

Ils sont réels et ne doivent être ni minimisés ni découverts plus tard.

| Limite | Conséquence | Traitement en Phase 1 |
|--------|-------------|------------------------|
| **Pas de secure element** | La KEK ne peut pas être matériellement non exportable | KEK dérivée du code applicatif (Argon2id WASM), gardée en mémoire comme `CryptoKey` non extractible, **jamais persistée**. Voir ADR-0003 §Variante Phase 1 |
| **XSS = compromission totale** | Un script injecté agit avec toutes les permissions de l'origine, y compris l'usage d'une clé non extractible | CSP stricte sans `unsafe-inline` ni `eval`, aucune dépendance CDN, SRI, audit du service worker. Nouveaux risques R25–R28 du threat model |
| **Stockage évictable** | Le navigateur peut effacer IndexedDB/OPFS sous pression disque ⇒ **perte de données** | `navigator.storage.persist()` demandé, état affiché à l'utilisateur, incitation explicite à l'export. Risque R26 |
| **Pas d'IA on-device sérieuse** | Pas de LLM quantifié exploitable | Sans objet en Phase 1 : ADR-0004 prévoyait déjà `MockAIProvider`, aucun modèle réel |
| **Pas d'exclusion des sauvegardes OS** | Le profil navigateur peut être synchronisé | Documenté, et couvert par le fait que la KEK n'est jamais persistée |
| **Pas de biométrie système simple** | Le déverrouillage se fait par code applicatif | WebAuthn étudié en Phase 2 (voir *Revisit when*) |

**Conséquence produit, non négociable** : le POC affiche à chaque démarrage qu'il s'agit d'une
**version d'évaluation dans laquelle il ne faut pas déposer de vrais documents**. Cette mention
existait déjà (`docs/architecture/02-poc-pwa.md` §4.5) ; elle devient une condition de la présente
décision, pas une précaution de style.

## Consequences

- `apps/web` est le livrable de Phase 1 ; `apps/mobile` est déplacé en Phase 3 dans l'arborescence
  cible (`docs/architecture/01-github-monorepo.md` §3.2).
- Une règle ESLint interdit à `packages/core` d'importer React **et toute API navigateur**
  (`window`, `document`, `indexedDB`, `crypto` global) : le domaine doit rester exécutable par un
  futur backend ou par l'application native.
- Le threat model gagne une frontière **TB-0 — Navigateur et origine web** et les risques R25 à R28.
- La stratégie de tests remplace React Native Testing Library par Testing Library (DOM) et Maestro
  par Playwright (`docs/architecture/09-strategie-tests.md`).
- Le test « aucune requête réseau » est redéfini : l'application étant servie par HTTP, l'assertion
  porte sur **l'absence de toute requête après le chargement initial**, hors assets de même origine.
- Hébergement du POC : statique, dans l'UE, sans analytique, sans CDN tiers. Cela ne contredit pas
  [ADR-0007](0007-pas-de-backend-phase-1.md) : servir des fichiers n'est pas un backend, aucune donnée
  utilisateur ne transite.
- La décision D16 (`docs/product/04-decisions-a-prendre.md`) est tranchée pour la Phase 1 et rouverte
  pour la Phase 3.

## Revisit when

- **Fin de la Phase 1** : le passage en Phase 3 réactive ADR-0002. Décider alors entre React Native et
  une PWA durcie, avec les résultats des tests utilisateurs en main.
- L'extension **WebAuthn PRF** est disponible sur l'ensemble des navigateurs cibles : elle permettrait
  de dériver une clé depuis un authentificateur matériel et ferait tomber l'objection principale
  d'ADR-0002. À évaluer en Phase 2.
- Les tests utilisateurs montrent que l'installation d'une PWA est elle-même un obstacle pour le public
  visé (hypothèse à vérifier, pas à supposer).
- Une exigence de sécurité apparaît en Phase 1 qui rend le navigateur intenable ⇒ retour à ADR-0002
  sans attendre la Phase 3.
