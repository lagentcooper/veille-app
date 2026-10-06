# 10. Stack technique — décisions, justifications, alternatives, risques

Format imposé : **Décision → Pourquoi → Alternative → Risque/Trade-off.**

---

## 10.1 Application

**Phase 1 — PWA** ([ADR-0011](../decisions/0011-pwa-poc-phase-1.md))

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S1 | **PWA React + Vite**, TypeScript strict | Un testeur ouvre un lien, n'installe rien : c'est la variable qui décide du nombre de tests utilisateurs réellement menés ; itération d'écran quasi instantanée ; DOM = meilleure accessibilité pour le public visé ; écosystème TS partagé avec `packages/core` | **React Native + Expo** (cible des phases 3+, S1bis) ; **Flutter Web** ; maquettes Figma | Pas de secure element, stockage évictable, XSS = compromission totale. Assumé **pour un POC seulement** : voir ADR-0011 §Trade-offs |
| S2 | **react-router** | Routage typé, pas de deep link natif requis en Phase 1 | TanStack Router | Couche d'abstraction supplémentaire |
| S2bis | **Service worker (Workbox)** + manifeste | Invariant A1 : l'application doit fonctionner hors ligne ; condition de l'installabilité | Service worker écrit à la main | Code sensible : un SW mal cadré sert du contenu périmé ou élargit la surface d'attaque ⇒ revu comme de la crypto |
| S3 | **Zustand** (+ XState pour l'activation) | Minimal, pas de boilerplate ; XState là où un état illégal serait dangereux | Redux Toolkit, Jotai | Deux outils d'état à connaître — assumé, les périmètres sont disjoints |
| S4 | **Zod** partagé UI ↔ domaine | Une seule définition de validation, réutilisable côté API plus tard | Yup, io-ts | Coût runtime négligeable |
| S5 | **IndexedDB** (métadonnées, DEK encapsulées) **→ SQLite/SQLCipher en Phase 3** | Disponible partout, transactionnel, quota confortable ; le modèle est porté par `packages/core`, donc la migration ne touche pas le domaine | `sql.js`/`wa-sqlite` en WASM sur OPFS (plus proche de la cible, plus lourd) | Migration IndexedDB → SQLCipher à tester sérieusement (test de migration obligatoire) |
| S6 | **OPFS** pour les pièces chiffrées + métadonnées en base | Sépare le contenu volumineux des métadonnées interrogeables ; écriture par flux, pas de base64 en mémoire | Tout en IndexedDB (BLOB) | Deux mécanismes de cohérence à maintenir ; OPFS moins outillé pour le débogage |
| S6bis | **Persistance demandée** (`navigator.storage.persist()`) et état **affiché** | Sans elle, le navigateur peut vider le stockage : perte de données (R26) | Ne rien demander | La demande peut être refusée : l'application doit le dire, pas le masquer |

**Phases 3+ — application native**

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S1bis | **React Native + Expo (dev build)**, TypeScript strict | Une base de code pour iOS+Android ; accès aux modules natifs requis (keystore, SQLCipher, ML) via dev build ; équipe réduite ; écosystème TS partagé avec le POC et un futur backend | **Flutter** (perf UI et cohérence supérieures, un seul langage) ; **natif Swift/Kotlin** (sécurité et IA on-device optimales) ; **PWA durcie** si WebAuthn PRF mûrit | Perf moindre sur listes très longues ; dépendance à l'écosystème Expo ; bindings d'IA on-device plus matures en natif. **À reconfirmer à la fin de la Phase 1** (ADR-0002 §Revisit when) |

---

## 10.2 Cryptographie et clés

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S7 | **Chiffrement enveloppe** : DEK aléatoire par document (AES-256-GCM), chiffrée par une KEK | Permet la rotation, la suppression cryptographique, et le partage sélectif (paquet successoral) sans tout re-chiffrer | Clé unique globale | Complexité de gestion des DEK — justifiée par le partage sélectif |
| S8 | **KEK dans le secure element** (Secure Enclave / StrongBox) via Keychain/Keystore, non exportable, déverrouillage biométrie/code — **à partir de la Phase 3** | La clé ne quitte jamais le matériel ; résiste au vol d'appareil | Clé dérivée d'un mot de passe seul | Appareils anciens sans secure element : refuser la fonction plutôt que dégrader silencieusement |
| S8bis | **Phase 1 (PWA)** : KEK dérivée du code applicatif par **Argon2id** (WASM), `CryptoKey` non extractible, **jamais persistée**, re-dérivée à chaque déverrouillage | Aucune API navigateur ne donne accès au secure element. Ne rien persister est la seule garantie réellement tenable sur le web | `CryptoKey` non extractible stockée en IndexedDB (survit au rechargement, mais utilisable par un XSS **sans déverrouillage**) | Robustesse = celle du code applicatif + coût Argon2id. **Promesse de sécurité réduite, affichée à l'utilisateur** (ADR-0003 §Variante Phase 1) |
| S8ter | **Phase 2** : évaluer **WebAuthn PRF** pour dériver la KEK d'un authentificateur matériel | Ferait tomber l'objection principale d'ADR-0002 contre le web | Rester sur Argon2id | Disponibilité navigateur encore inégale — à vérifier, pas à supposer |
| S9 | **Clé de récupération** : phrase/code généré, dérivation **Argon2id**, affiché une fois, jamais stocké | Sans elle, perte d'appareil = perte totale (zero-knowledge) | Récupération par email (renonce au zero-knowledge) | **Risque produit majeur** : les utilisateurs perdent leur code. À arbitrer (voir question critique n°7) |
| S10 | Bibliothèques éprouvées uniquement : **WebCrypto** en Phase 1 (primitive du navigateur, rien à embarquer sauf Argon2id en WASM), libsodium / primitives OS en Phase 3 | Pas de crypto maison | — | En Phase 1, la seule dépendance crypto embarquée est l'implémentation Argon2id : version épinglée, hash vérifié, jamais servie par un CDN |
| S11 | **Suppression cryptographique** : détruire la DEK = rendre le contenu illisible, en plus de l'effacement réel | Garantit l'effacement même sur mémoire flash à copie sur écriture | Effacement simple | Doit être **prouvé par test**, pas affirmé |

---

## 10.3 IA

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S12 | **Abstraction `AIProvider`**, `MockAIProvider` en Phase 1 | Découple le produit du modèle ; permet de valider l'UX sans coût | Intégrer directement un SDK | Indirection supplémentaire — largement rentable |
| S13 | **OCR par les API de l'OS** (Vision / ML Kit) — Phase 3 | Gratuit, hors ligne, bon en français, maintenu par l'OS | Tesseract | Comportements divergents iOS/Android à normaliser. **Sans équivalent web** : pas d'OCR en Phase 1 |
| S14 | **`sqlite-vec` dans la base chiffrée** pour l'index vectoriel — Phase 3 | Un seul stockage, donc un seul périmètre de chiffrement et de suppression | Index séparé en mémoire/fichier | Maturité de l'extension ; repli BM25 prévu |
| S15 | **LLM quantifié on-device (llama.rn)**, activé selon les capacités de l'appareil — Phase 3 | Confidentialité par conception | MediaPipe (Android), modèles fournis par l'OS, cloud opt-in | RAM/batterie/chauffe ; qualité inférieure au cloud ; poids de l'app |
| S15bis | **Phase 1 : aucun modèle réel.** `MockAIProvider` seul | ADR-0004 le prévoyait déjà : la Phase 1 valide l'UX de l'assistant, pas la qualité d'un modèle. L'absence d'IA on-device sérieuse dans un navigateur ne coûte donc rien à cette phase | WebLLM / WASM (WebGPU) | Aucun — c'est précisément pourquoi le POC peut être web sans perte |

---

## 10.4 Backend (Phase 3) — à ne pas construire avant

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S16 | **Modulith** (un service déployable, modules internes stricts) en Node/TypeScript (NestJS) | Équipe réduite ; partage des schémas Zod/types avec le mobile ; découpage possible plus tard | Microservices d'emblée ; Go (meilleure perf/empreinte) | Risque de couplage interne si la discipline modulaire se relâche → tests d'architecture (dépendances interdites) |
| S17 | **Sauf** le service **Activation/Legacy**, déployé séparément | Composant le plus sensible : isolation réseau, déploiement, et journalisation propres | Tout dans le modulith | Un service de plus à exploiter — justifié par le risque |
| S18 | **PostgreSQL managé**, instances séparées auth / métadonnées | Standard, mature, chiffrement et PITR fournis | MySQL, SQLite serveur | Coût de deux instances |
| S19 | **Object storage compatible S3** pour les blobs opaques | Standard, portable, versionnage et verrou d'objet | Stockage en base | Configuration d'accès à verrouiller (pas de bucket public — testé automatiquement) |
| S20 | **OIDC / OAuth2 avec un fournisseur managé ou Keycloak** | Ne pas réimplémenter l'authentification | Auth maison | Verrouillage ou coût d'exploitation de Keycloak |
| S21 | **Hébergement UE** (Scaleway/OVH, ou AWS/GCP région UE) | Exigence de confiance et de conformité ; souveraineté = argument produit fort | Cloud US avec région UE | ⚖️ Question HDS si documents de santé ; maturité managée moindre chez les acteurs souverains |

---

## 10.5 Outillage

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S22 | **pnpm workspaces + Turborepo** | Monorepo rapide, cache de tâches, installation efficace | npm/yarn workspaces, Nx | Nx est plus puissant mais plus lourd pour 1–5 personnes |
| S23 | **Phase 1 : Vitest + Testing Library (DOM) + Playwright** | Couverture des trois niveaux ; Vitest partage la configuration de Vite ; Playwright pilote un vrai navigateur, donc teste aussi le service worker, le stockage et l'absence de requête sortante | Jest + RNTL + Maestro (redeviennent pertinents en Phase 3, sur l'application native) | Deux outillages E2E à connaître sur la durée du projet — assumé, ils ne coexistent pas |
| S24 | **Conventional Commits + ADR** | Historique lisible et continuité multi-chats (§31) | Format libre | Discipline à tenir |
| S25 | **Terraform/OpenTofu** (Phase 3) | Infra reproductible, revue en PR | Pulumi, console (à proscrire) | Courbe d'apprentissage |

---

## 10.6 Ce qu'on refuse explicitement (et pourquoi)

| Refusé | Raison |
|--------|--------|
| **PWA comme plateforme de production** | Pas de secure element, stockage évictable, XSS = compromission totale. Le web est retenu **pour le POC uniquement** (ADR-0011), avec une promesse de sécurité réduite et affichée |
| **Dépendance servie par un CDN tiers dans l'application web** | Un script tiers sur l'origine a l'usage des clés de l'utilisateur. Tout est bundlé et servi par l'origine |
| Microservices / Kubernetes en Phase 1–3 | Coût d'exploitation sans bénéfice à cette échelle |
| Backend en Phase 1 | Multiplie conformité, coût et délai avant validation produit |
| Chiffrement « maison » | Risque de sécurité inacceptable |
| Analytics tiers (Firebase/Google Analytics) dans l'app | Transferts hors UE, profilage, contraire à la promesse produit |
| Synchronisation automatique par défaut | Contraire à Privacy by Default |
| Blockchain / horodatage décentralisé pour la « preuve » | Ne résout pas le problème juridique réel, complexité forte |
| Reconnaissance faciale pour vérifier l'identité du contact | Donnée biométrique = art. 9 RGPD, disproportionné |
