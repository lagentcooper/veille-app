# 11. Stratégie de tests

Règle AGENTS.md §9 : « Ça a l'air de marcher » n'est jamais une preuve.

---

## 11.1 Niveaux

Outillage de Phase 1 (PWA, [ADR-0011](../decisions/0011-pwa-poc-phase-1.md)) : **Vitest**, **Testing
Library (DOM)**, **Playwright**. En Phase 3, l'application native reprendra Jest + RNTL + Maestro ;
les tests de `packages/core`, eux, ne changent pas — ils ne dépendent d'aucune plateforme.

| Niveau | Périmètre | Outil (Phase 1) | Quand |
|--------|-----------|-----------------|-------|
| **Unit** | `packages/core` (règles legs, permissions, machine d'activation, sérialisation d'export) | Vitest | À chaque PR, < 10 s |
| **Integration** | Adapters réels : stockage chiffré (IndexedDB + OPFS), migrations, provider IA | Vitest en environnement navigateur (Playwright runner) | À chaque PR |
| **Composant/UI** | Écrans, accessibilité, états d'erreur | Testing Library (DOM) + `axe` | À chaque PR |
| **E2E** | 8 parcours du POC dans un vrai navigateur | Playwright (Chromium + WebKit) | Nightly + avant release |
| **Sécurité** | Crypto, permissions, absence de fuite, injection, **CSP et service worker** | Vitest + Playwright + règles Semgrep | À chaque PR sur chemins sensibles |
| **Privacy** | Absence de PII dans les logs/exports non chiffrés, consentements | Vitest + scanner de motifs | À chaque PR |
| **Migration** | Schéma N→N+1, format d'export v1→v2 | Vitest avec jeux de données figés | À chaque PR touchant un schéma |
| **Hors ligne** | L'application démarre et fonctionne réseau coupé | Playwright, contexte `offline` | À chaque PR |
| **Performance** | Import de 100 documents, recherche | Playwright + mesures | Avant release |

---

## 11.2 Matrice fonctionnalité × type de test

| Fonctionnalité | Unit | Integration | E2E | Security | Privacy |
|----------------|------|-------------|-----|----------|---------|
| Profil local / verrouillage | ✅ règles de session | ✅ dérivation et détention de la KEK | ✅ création + verrouillage | ✅ verrouillage à la perte de visibilité, échecs de code, **KEK jamais persistée** | ✅ aucune donnée hors appareil |
| Document de legs — rédaction | ✅ complétude, cohérence, enchaînement des écrans — *en place, `@veille/core`* | ✅ persistance chiffrée (AES-256-GCM, DEK par document, sujet authentifié) | ✅ parcours complet | ✅ **aucun texte en clair** dans IndexedDB/OPFS/Web Storage/cache, **KEK introuvable** dans le stockage (E2E) | ✅ pas de log de contenu |
| Document de legs — validation | ✅ **règles de blocage (notaire requis)** — *en place, 20 cas* | ✅ | ✅ écran de contrôle, PDF refusé si 🛑 | ⚪ | ✅ avertissement sur les PDF en clair (R31) |
| Historique des versions | ✅ immuabilité, hash — *en place* | ✅ | ✅ consultation | ✅ non-altérabilité | ⚪ |
| Import de document | ✅ validation de type/taille | ✅ chiffrement effectif | ✅ photo + fichier | ✅ **fichier malveillant, chemin, taille** | ✅ pas de nom de fichier logué |
| Consultation / recherche | ✅ filtres | ✅ index | ✅ trouver en < 15 s | ✅ pas d'accès hors périmètre | ⚪ |
| Suppression | ✅ cascade (dérivés, index, OCR) | ✅ **contenu illisible après suppression** | ✅ | ✅ suppression cryptographique | ✅ pas de résidu |
| Assistant IA | ✅ construction du contexte | ✅ provider mock/local | ✅ question → réponse citée | ✅ **prompt injection, zéro réseau, isolation inter-documents** | ✅ pas de log de prompt |
| Contact de confiance — désignation | ✅ modèle de droits | ✅ | ✅ | ✅ **aucun accès avant activation** | ✅ information du tiers |
| Contact de confiance — activation | ✅ **machine à états complète** | ✅ délais, quorum | ✅ simulation | ✅ **anti-fraude : rejet, contre-notification, révocation pendant le délai** | ✅ périmètre minimal du paquet |
| Export / portabilité | ✅ format VEA, JSON Schema | ✅ archive complète | ✅ export puis import | ✅ chiffrement de l'archive | ✅ contenu exact, rien de plus |
| Import / restauration | ✅ | ✅ **round-trip identique** | ✅ | ✅ archive falsifiée rejetée | ⚪ |
| Consentements | ✅ états | ✅ persistance | ✅ | ✅ révocation effective | ✅ granularité |
| Migrations | ✅ | ✅ N→N+1 sur données figées | ⚪ | ⚪ | ⚪ |

✅ = obligatoire · ⚪ = non pertinent à ce niveau

La matrice décrit la **cible**. Le POC de Phase 1 étant restreint au seul document de legs, les
lignes *Import de document*, *Consultation / recherche*, *Assistant IA*, *Contact de confiance* et
*Consentements* sont hors périmètre immédiat : elles ne sont pas « en retard », elles ne sont pas
encore ouvertes. Ce qui est réellement exécuté aujourd'hui est ci-dessous.

---

## 11.2 bis État réel de l'exécution

> Mis à jour par la session *QA* le 2026-10-06. **Cette section énonce des faits vérifiables, pas
> des intentions** : toute ligne doit être reproductible par la commande indiquée.

Porte d'entrée unique : **`pnpm test` à la racine** (Turborepo), qui exécute chaque paquet du
workspace déclarant un script `test`. La CI appelle cette commande et non une liste de filtres
tenue à la main, afin qu'un nouveau paquet soit couvert dès sa création.

| Paquet | Commande | Cas | Couvre |
|--------|----------|-----|--------|
| `@veille/core` | `vitest run` | **97** | Domaine legs : complétude, cas bloquants, versions immuables, canonicalisation, parse, VEA, purité du domaine |
| `@veille/web` | `vitest run` | 57 | Politiques de session, adapters (IndexedDB, WebCrypto), service d'enregistrement du profil, coquille et verrouillage |
| `@veille/ui` | `vitest run` | 5 | Composants du design system + `axe` |
| `@veille/config` | `node --test` | 6 | Règle ESLint d'isolation de `packages/core` (échoue sur `window`, `document`, `indexedDB`, `crypto`, `react`) |
| `@veille/web` (E2E) | `playwright test` | **20** | Parcours de la coquille, clavier seul, cibles ≥ 48 px, manifeste et portée du service worker, **hors ligne après premier chargement**, **aucune requête sortante après chargement**, **toutes les requêtes du premier chargement sur l'origine**, CSP sans `unsafe-inline`/`unsafe-eval`, aucun script ou feuille tiers, état réel de la persistance, suppression effective |

Typecheck : `pnpm typecheck`. Celui de `packages/core` appartient à `@veille/config`, qui exécute
`tsconfig.core.json` (source, sous `types: []` — un global navigateur n'y typecheck même pas) puis
`tsconfig.core-tests.json` (tests, avec `@types/node`). `packages/core` n'a pas de `tsconfig` propre :
un seul propriétaire par ensemble de fichiers.

**Trous connus, à combler par les sessions concernées** (énoncés ici pour qu'ils ne soient pas
découverts plus tard) :

- Les tests **Integration** de la matrice (chiffrement effectif sur IndexedDB/OPFS, contenu illisible
  après suppression) sont couverts côté adapters mais pas encore comme assertions d'octets sur le
  stockage réel.
- **Privacy — aucun test.** Le critère de Phase 1 « aucune PII dans les logs » n'est asserté par
  rien : `apps/web/src/adapters/console-logger.ts` n'est couvert par aucun test, et il n'existe
  aucun scanner de motifs (email, IBAN, téléphone, NIR). C'est un critère d'acceptation de la
  phase (roadmap) et la règle AGENTS.md §6.3 : **à produire avant les tests utilisateurs.**
- Playwright ne tourne que sur **Chromium** ; la matrice vise Chromium + WebKit.
- Le critère « aucune requête sortante » **est** couvert (E2E, trois tests), contrairement à ce que
  laissait craindre l'absence de la ligne correspondante dans la matrice : la lacune était dans la
  documentation, pas dans les tests.

---

## 11.3 Tests de sécurité et privacy — contenu minimal

**Chiffrement**
- Le fichier stocké ne contient jamais le texte en clair (recherche de motif dans les octets).
  En Phase 1, « stocké » signifie **IndexedDB et OPFS**, inspectés par le test.
- Deux chiffrements du même contenu produisent des sorties différentes (IV aléatoire).
- Une altération d'un octet du chiffré fait échouer le déchiffrement (GCM).
- La clé n'apparaît jamais en base ni dans les préférences.
- **Phase 1, spécifique** : après déverrouillage, la KEK n'est présente **dans aucun** de
  IndexedDB, OPFS, `localStorage`, `sessionStorage` — vérifié par énumération complète du stockage
  de l'origine, pas par échantillonnage.
- **Phase 1, spécifique** : après verrouillage ou rechargement, aucun contenu n'est déchiffrable
  sans ressaisie du code.

**Web (Phase 1 uniquement)**
- La CSP servie est stricte : ni `unsafe-inline`, ni `unsafe-eval`, ni `*` sur `script-src`.
- Aucune ressource n'est chargée depuis une origine tierce (assertion sur toutes les requêtes
  observées pendant un parcours complet).
- L'application démarre et reste utilisable **réseau coupé**, après une première visite.
- Le service worker ne met en cache **aucune** réponse contenant du contenu utilisateur.
- La demande de persistance du stockage est effectuée, et son refus est **affiché** à l'utilisateur.

**Permissions**
- Un contact « désigné » n'accède à rien : chaque méthode d'accès testée renvoie un refus.
- Chaque état de la machine d'activation est testé, y compris les transitions illégales.
- Révocation pendant le délai de carence ⇒ accès définitivement refusé.

**Prompt injection** (corpus versionné dans `packages/ai/tests/injection-corpus/`)
- Documents contenant : « ignore les instructions précédentes », instructions en base64, texte blanc
  sur fond blanc dans un PDF, instructions dans les métadonnées EXIF, contenu multilingue.
- Assertion : la réponse ne suit jamais l'instruction injectée, le `warning` est levé, aucune sortie réseau.

**Fuite de données**
- Une session complète (import, question, export) ne produit **aucune** requête sortante en Phase 1.
  L'application étant servie par HTTP, l'assertion porte sur l'absence de toute requête **après le
  chargement initial**, hors assets de même origine : interception de `fetch`, `XMLHttpRequest`,
  `WebSocket`, `EventSource` et `navigator.sendBeacon`, le test échoue si une requête est émise.
- Scan des logs : aucun motif email/IBAN/téléphone/NIR.
- L'export non chiffré ne contient que ce que l'utilisateur a demandé.

**Restauration**
- Export → réinstallation propre → import → l'état est identique (comparaison structurelle).
- Test mensuel en Phase 3+ sur les sauvegardes serveur.

---

## 11.4 Critères de qualité

- Couverture **du domaine** (`packages/core`) : ≥ 90 % de lignes, 100 % des règles de validité et de
  permission. La couverture UI n'est pas un objectif chiffré.
- Aucun test désactivé sans ticket lié et commentaire.
- Chaque bug corrigé ⇒ test de non-régression dans le même commit.
- Les tests ne doivent contenir **aucune donnée réelle** : jeux générés par `tools/seed`.
