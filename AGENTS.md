# AGENTS.md — Règles permanentes du projet Veille

> Ce fichier est la **loi du repository**. Toute session d'agent (ou tout développeur)
> doit le lire **avant** toute modification. Il prime sur l'historique de n'importe quel chat.
> Si une règle permanente évolue : **mettre à jour ce fichier dans le même commit**.

---

## 0. Ordre de priorité en cas de contradiction

1. Code réellement présent
2. Tests
3. ADR (`docs/decisions/`)
4. Documentation d'architecture (`docs/architecture/`)
5. AGENTS.md
6. `docs/progress.md`
7. Historique de chat (**source la moins fiable — jamais suffisante**)

En cas de contradiction importante : **ne pas deviner**. Signaler le conflit, proposer une résolution,
et documenter la résolution retenue (ADR si structurante).

---

## 1. Produit en une phrase

Veille est une application mobile qui permet à une personne **sans compétence informatique** de
rédiger un **document de volontés** (legs), d'y associer des **documents justificatifs chiffrés**,
d'**interroger une IA locale** sur ses propres documents, et de désigner une **personne de confiance**
qui n'obtient **aucun accès** tant que des conditions d'activation strictes ne sont pas remplies.

**Veille ne remplace pas un notaire ni un avocat.** Toute formulation produite par l'application ou
par un agent doit respecter cette limite (voir `docs/product/02-contraintes-juridiques.md`).

---

## 2. État du projet

**Phase 0 — structure du projet : terminée.** Règles permanentes, architecture, threat model,
classification des données, ADR-0001 à ADR-0011. Aucun code applicatif.

**Phase 1 — POC UX/UI en PWA : c'est la phase en cours.** Application web progressive, installable,
fonctionnelle hors ligne. Pas de backend, pas de compte distant, données locales ou fictives.
Décision : [ADR-0011](docs/decisions/0011-pwa-poc-phase-1.md).

Le POC est une **version d'évaluation** : il annonce à chaque démarrage qu'il ne faut pas y déposer
de vrais documents. Cette mention est une condition de l'ADR-0011, pas une précaution de style.

Ce qui ne doit **pas** encore être développé est listé par phase dans `docs/product/03-roadmap.md`.

---

## 3. Architecture — invariants non négociables

| # | Invariant | Conséquence pratique |
|---|-----------|----------------------|
| A1 | **Local-first** : l'appareil est la source de vérité des documents | Aucune fonctionnalité ne doit exiger le réseau pour lire/écrire ses propres documents |
| A2 | **Aucune donnée personnelle ne quitte l'appareil sans consentement explicite, spécifique et révocable** | Toute sortie réseau de contenu utilisateur passe par un point de passage unique, tracé, et affiché à l'utilisateur |
| A3 | **Moindre privilège par défaut** | La personne de confiance a `zéro` accès avant activation validée |
| A4 | **Couplage faible par ports/adapters** | `StorageProvider`, `CryptoProvider`, `AIProvider`, `SyncProvider` sont des interfaces ; l'UI n'appelle jamais une implémentation concrète |
| A5 | **Portabilité des données** | Tout ce qui est stocké doit être exportable dans un format ouvert documenté (`docs/privacy/02-export-portabilite-suppression.md`) |
| A6 | **Pas de verrouillage propriétaire** | Formats ouverts (SQLite, JSON, PDF/A, JSON Schema), pas de format binaire non documenté |
| A7 | **Le stockage local n'est pas « sûr » par nature** | Chiffrement au repos même en local ; hypothèse : appareil perdu, volé, rooté ou sauvegardé dans le cloud OS |

Toute dérogation à A1–A7 exige un ADR.

---

## 4. Conventions de code

- **Langage** : TypeScript `strict` (pas de `any` implicite, pas de `@ts-ignore` sans commentaire justifiant).
- **Application (Phase 1)** : PWA — React + Vite, installable, hors ligne par service worker.
  Voir [ADR-0011](docs/decisions/0011-pwa-poc-phase-1.md). L'application native React Native + Expo
  reste la cible des phases 3+ ([ADR-0002](docs/decisions/0002-react-native-expo.md)).
- **`packages/core` n'importe aucune API navigateur** (`window`, `document`, `indexedDB`, `crypto`
  global) ni React : il doit rester exécutable par un futur backend et par l'application native.
  Règle vérifiée par ESLint, pas par la discipline.
- **Nommage** : code, identifiants, commentaires, commits, ADR **en anglais** ; textes UI et documentation produit **en français** (l'i18n passe par des clés, jamais de chaîne en dur dans un composant).
- **Structure par feature**, pas par type technique :
  `features/<domain>/{ui,domain,data}` — `domain/` ne dépend d'aucun framework.
- **Aucune logique métier dans un composant React.** Les règles (validité d'un document de legs, droits d'accès) vivent dans `domain/` et sont testables sans rendu.
- **Pas de dépendance ajoutée sans justification** : une dépendance = une ligne dans la PR expliquant pourquoi, et vérification licence + maintenance active.
- **Formatage/lint** : Prettier + ESLint (config partagée). Le CI refuse un code non formaté.

---

## 5. Règles de sécurité (obligatoires)

1. **Jamais de secret dans Git.** Ni clé, ni token, ni `.env` rempli. Seulement `.env.example` avec des valeurs vides.
2. **Jamais de clé de chiffrement en clair, nulle part.** En Phase 1 (PWA) : la KEK est dérivée du
   code applicatif par Argon2id, tenue en mémoire comme `CryptoKey` non extractible, et **jamais
   écrite** dans IndexedDB, OPFS, `localStorage` ou `sessionStorage`. À partir de la Phase 3 : dans
   le Keychain/Keystore matériel. Voir [ADR-0003](docs/decisions/0003-local-first-chiffrement.md).
3. **Chiffrement au repos** : documents et base métier chiffrés (chiffrement enveloppe, AES-256-GCM, DEK par document).
4. **Protection du matériel de clé contre les sauvegardes** : en Phase 1, la garantie vient de ce que
   la KEK n'est jamais persistée ; à partir de la Phase 3, exclusion des sauvegardes OS
   (`NSFileProtectionComplete` / `allowBackup=false` sur les conteneurs sensibles).
5. **Phase 1, spécifique au web** : CSP stricte (ni `unsafe-inline`, ni `eval`), **aucune dépendance
   servie par un CDN tiers**, SRI sur tout asset externe, service worker revu comme du code sensible.
   Un XSS sur l'origine donne l'usage de la clé (voir `docs/security/01-threat-model.md`, R25).
6. **Validation d'entrée systématique** aux frontières : fichier importé, contenu OCR, réponse réseau, deep link.
7. **Prompt injection** : tout contenu de document passé à un modèle IA est traité comme **donnée non fiable**, jamais comme instruction (voir `docs/architecture/05-ia-locale.md` §Sécurité IA).
8. **Aucune fonctionnalité de sécurité « maison »** : pas de crypto artisanale, pas de protocole d'authentification inventé. Primitives standard et bibliothèques auditées uniquement.
9. **Toute PR touchant crypto, clés, permissions, personne de confiance ou export = revue sécurité obligatoire** et mise à jour du threat model si le périmètre change.

---

## 6. Règles privacy

1. **Data minimization** : ne jamais stocker une donnée personnelle sans justification écrite (champ = usage identifié).
2. **Privacy by Default** : toute option qui augmente l'exposition (télémétrie, sauvegarde cloud, IA distante) est **désactivée par défaut** et exige un consentement explicite, granulaire, révocable, et journalisé.
3. **Jamais de PII ni de contenu documentaire dans les logs**, y compris en développement. Pas de nom, adresse, IBAN, numéro de sécurité sociale, montant, extrait OCR, prompt utilisateur, réponse IA.
4. **Pas de PII dans les messages de commit, les ADR, `progress.md`, les tickets, les captures d'écran commitées.**
5. Toute nouvelle catégorie de donnée doit être ajoutée à `docs/privacy/01-classification-donnees.md` **dans le même commit**.
6. Un utilisateur doit toujours pouvoir : **exporter tout**, **supprimer tout**, **comprendre où sont ses données**.

---

## 7. Règles IA

1. **Traitement local par défaut.** Le POC utilise `MockAIProvider`. Aucun appel réseau IA en Phase 1.
2. **Aucun provider cloud activé sans consentement explicite par usage**, avec indication visible à l'écran que la donnée quitte l'appareil.
3. **Isolation du contexte** : une requête IA ne voit que les documents que l'utilisateur a explicitement mis dans le périmètre de la question.
4. **Séparation instruction / contenu** : le contenu documentaire est encadré et étiqueté comme non fiable dans le prompt ; les instructions système ne sont jamais reconstruites à partir du contenu.
5. **Traçabilité des réponses** : toute réponse IA cite les documents/passages sources.
6. **Pas d'affirmation juridique** : l'IA ne produit pas de conseil juridique ; elle explique et résume, avec avertissement.
7. Tout changement de provider ou de modèle = ADR + tests de prompt injection rejoués.

---

## 8. Workflow Git

- Branche par unité de travail : `feature/<domaine>-<sujet>`, `security/<sujet>`, `docs/<sujet>`, `fix/<sujet>`.
- **Un chat = une mission = une branche.** Deux sessions ne modifient pas les mêmes fichiers en parallèle : séquencer ou coordonner explicitement.
- `main` protégée : PR obligatoire, CI verte, au moins une revue, pas de force-push.
- Commits **atomiques et explicites** (Conventional Commits : `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `security:`).
- Avant toute tâche importante : `git status` + `git diff`. Après : tests, `git diff`, commit.
- **Ne jamais écraser le travail d'une autre branche/session.**

---

## 9. Règles de tests

- **Toute fonctionnalité critique a des tests.** Critique = legs, permissions, personne de confiance, chiffrement, export, suppression, IA.
- Le `domain/` est testé **unitairement, sans mock de framework**.
- Un bug corrigé = un test de non-régression.
- « Ça a l'air de marcher » n'est **jamais** une preuve. Un résultat doit être reproductible.
- Matrice de couverture obligatoire tenue à jour : `docs/architecture/09-strategie-tests.md`.

---

## 10. Interdictions

| ❌ Interdit | Pourquoi |
|------------|----------|
| Committer un secret, une clé, un token, un vrai document utilisateur | Fuite irréversible |
| Logger une PII ou un extrait de document | Violation privacy / RGPD |
| Envoyer un document vers un service tiers sans consentement explicite | Invariant A2 |
| Donner à la personne de confiance un accès avant activation validée | Invariant A3 |
| Écrire « conforme RGPD » / « conforme AI Act » sans analyse juridique humaine | Affirmation non vérifiable et risquée |
| Présenter Veille comme remplaçant un notaire/avocat | Risque juridique majeur |
| Implémenter de la cryptographie maison | Risque de sécurité |
| Sur-architecturer la Phase 1 (backend, microservices, K8s) | Gaspillage, dette inutile |
| Contredire un ADR sans le mettre à jour | Perte de continuité multi-chats |
| Ajouter une dépendance non justifiée ou non maintenue | Risque supply-chain |
| Désactiver/supprimer un test pour faire passer le CI | Masquage de régression |

---

## 11. Definition of Done (multi-chat)

Une tâche est terminée **uniquement** lorsque :

- [ ] Code terminé
- [ ] Tests ajoutés/modifiés
- [ ] Tests exécutés (résultat reproductible collé dans la PR)
- [ ] Documentation mise à jour si nécessaire
- [ ] ADR créé/modifié si décision structurante
- [ ] Impact sécurité évalué (et threat model mis à jour si le périmètre change)
- [ ] Impact privacy évalué (classification des données mise à jour si nouvelle donnée)
- [ ] `docs/progress.md` mis à jour
- [ ] `git diff` relu intégralement
- [ ] Aucun secret ajouté
- [ ] Aucune PII inutile dans les logs
- [ ] Commit cohérent créé

---

## 12. Procédure de reprise pour une nouvelle session

1. Lire `AGENTS.md` (ce fichier)
2. Lire `docs/progress.md`
3. Lire `README.md`
4. `git status` / `git log --oneline -20` / identifier la branche
5. Lire les ADR pertinents (`docs/decisions/`)
6. Lire la doc d'architecture concernée
7. Inspecter le code existant et les tests existants
8. Formuler un plan **avant** de modifier
9. Modifier, tester, documenter, commiter

**Ne jamais supposer que le contexte d'un chat précédent est disponible.**

---

## 13. Périmètres des sessions (qui touche quoi)

| Session | Domaine principal | Ne doit pas |
|---------|-------------------|-------------|
| Architecture | ADR, data flow, trust boundaries, choix techniques, dette | Développer des fonctionnalités utilisateur |
| UX/UI | Design system, écrans, parcours | Modifier le `domain/` ou la crypto |
| Web (Phase 1) | PWA `apps/web` : application, navigation, état, service worker | Changer les contrats de ports sans ADR |
| Mobile (Phase 3+) | Application native, navigation, état | Changer les contrats de ports sans ADR |
| Documents | Import, stockage, chiffrement des pièces | Toucher au moteur de legs |
| Legs | Rédaction guidée, validation, versions | Toucher à l'IA |
| Trusted Person | Désignation, droits, activation | Toucher au stockage documentaire |
| Local AI | Providers, RAG, OCR, prompts | Modifier le modèle de permissions |
| Security | Audit, threat model, recommandations `docs/security/` | Modifier silencieusement le code d'un autre domaine |
| QA | Build, lint, tests, régressions | Changer l'architecture |

Modification transverse nécessaire ? → l'identifier, expliquer pourquoi, vérifier les dépendances,
modifier **le strict nécessaire**, documenter si structurant.

---

## 14. Signalement juridique

Toute décision qui touche à la **validité d'un document de legs**, à la **preuve du décès ou de
l'incapacité**, à la **conservation légale**, ou à la **qualification RGPD/AI Act** doit être marquée
dans la doc par :

> ⚖️ **VALIDATION JURIDIQUE REQUISE** — ne pas considérer comme acquis.

Un agent ne tranche jamais une question juridique. Il l'explicite et la remonte.
