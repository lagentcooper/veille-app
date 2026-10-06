# 10. Stack technique — décisions, justifications, alternatives, risques

Format imposé : **Décision → Pourquoi → Alternative → Risque/Trade-off.**

---

## 10.1 Application mobile

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S1 | **React Native + Expo (dev build)**, TypeScript strict | Une base de code pour iOS+Android ; itération UI très rapide (essentiel pour un POC UX) ; accès aux modules natifs requis (keystore, SQLCipher, ML) via dev build ; équipe réduite ; écosystème TS partagé avec un futur backend | **Flutter** (perf UI et cohérence supérieures, un seul langage) ; **natif Swift/Kotlin** (sécurité et IA on-device optimales) | Perf moindre sur listes très longues ; dépendance à l'écosystème Expo ; les bindings d'IA on-device sont plus matures en natif. **Flutter serait le meilleur second choix** si l'équipe a des compétences Dart. |
| S2 | **expo-router** | Routage par fichiers, deep links natifs (nécessaires pour l'activation), typé | React Navigation nu | Couche d'abstraction supplémentaire |
| S3 | **Zustand** (+ XState pour l'activation) | Minimal, pas de boilerplate ; XState là où un état illégal serait dangereux | Redux Toolkit, Jotai | Deux outils d'état à connaître — assumé, les périmètres sont disjoints |
| S4 | **Zod** partagé UI ↔ domaine | Une seule définition de validation, réutilisable côté API plus tard | Yup, io-ts | Coût runtime négligeable |
| S5 | **SQLite (expo-sqlite) → SQLCipher en Phase 3** | Format ouvert, portable, exportable, sans verrouillage ; chemin de migration clair | Realm/MongoDB Device, WatermelonDB | Migration SQLite→SQLCipher à tester sérieusement (test de migration obligatoire) |
| S6 | Fichiers chiffrés dans le sandbox app + métadonnées en base | Sépare le contenu volumineux des métadonnées interrogeables | Tout en base (BLOB) | Deux mécanismes de cohérence à maintenir (transaction + fichier) |

---

## 10.2 Cryptographie et clés

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S7 | **Chiffrement enveloppe** : DEK aléatoire par document (AES-256-GCM), chiffrée par une KEK | Permet la rotation, la suppression cryptographique, et le partage sélectif (paquet successoral) sans tout re-chiffrer | Clé unique globale | Complexité de gestion des DEK — justifiée par le partage sélectif |
| S8 | **KEK dans le secure element** (Secure Enclave / StrongBox) via Keychain/Keystore, non exportable, déverrouillage biométrie/code | La clé ne quitte jamais le matériel ; résiste au vol d'appareil | Clé dérivée d'un mot de passe seul | Appareils anciens sans secure element : refuser la fonction plutôt que dégrader silencieusement |
| S9 | **Clé de récupération** : phrase/code généré, dérivation **Argon2id**, affiché une fois, jamais stocké | Sans elle, perte d'appareil = perte totale (zero-knowledge) | Récupération par email (renonce au zero-knowledge) | **Risque produit majeur** : les utilisateurs perdent leur code. À arbitrer (voir question critique n°7) |
| S10 | Bibliothèques éprouvées uniquement (libsodium/`react-native-quick-crypto`, primitives OS) | Pas de crypto maison | — | Dépendance native à maintenir |
| S11 | **Suppression cryptographique** : détruire la DEK = rendre le contenu illisible, en plus de l'effacement réel | Garantit l'effacement même sur mémoire flash à copie sur écriture | Effacement simple | Doit être **prouvé par test**, pas affirmé |

---

## 10.3 IA

| # | Décision | Pourquoi | Alternative | Risque / Trade-off |
|---|----------|----------|-------------|--------------------|
| S12 | **Abstraction `AIProvider`**, `MockAIProvider` en Phase 1 | Découple le produit du modèle ; permet de valider l'UX sans coût | Intégrer directement un SDK | Indirection supplémentaire — largement rentable |
| S13 | **OCR par les API de l'OS** (Vision / ML Kit) | Gratuit, hors ligne, bon en français, maintenu par l'OS | Tesseract | Comportements divergents iOS/Android à normaliser |
| S14 | **`sqlite-vec` dans la base chiffrée** pour l'index vectoriel | Un seul stockage, donc un seul périmètre de chiffrement et de suppression | Index séparé en mémoire/fichier | Maturité de l'extension ; repli BM25 prévu |
| S15 | **LLM quantifié on-device (llama.rn)**, activé selon les capacités de l'appareil | Confidentialité par conception | MediaPipe (Android), modèles fournis par l'OS, cloud opt-in | RAM/batterie/chauffe ; qualité inférieure au cloud ; poids de l'app |

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
| S23 | **Jest + RNTL + Maestro** | Couverture des trois niveaux avec un outillage simple | Vitest, Detox | Jest plus lent que Vitest sur gros volumes |
| S24 | **Conventional Commits + ADR** | Historique lisible et continuité multi-chats (§31) | Format libre | Discipline à tenir |
| S25 | **Terraform/OpenTofu** (Phase 3) | Infra reproductible, revue en PR | Pulumi, console (à proscrire) | Courbe d'apprentissage |

---

## 10.6 Ce qu'on refuse explicitement (et pourquoi)

| Refusé | Raison |
|--------|--------|
| Microservices / Kubernetes en Phase 1–3 | Coût d'exploitation sans bénéfice à cette échelle |
| Backend en Phase 1 | Multiplie conformité, coût et délai avant validation produit |
| Chiffrement « maison » | Risque de sécurité inacceptable |
| Analytics tiers (Firebase/Google Analytics) dans l'app | Transferts hors UE, profilage, contraire à la promesse produit |
| Synchronisation automatique par défaut | Contraire à Privacy by Default |
| Blockchain / horodatage décentralisé pour la « preuve » | Ne résout pas le problème juridique réel, complexité forte |
| Reconnaissance faciale pour vérifier l'identité du contact | Donnée biométrique = art. 9 RGPD, disproportionné |
