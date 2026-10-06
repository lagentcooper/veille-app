# 18. Briefs de sessions — Phase 1, parcours Legs (PWA)

But de ce document : permettre de lancer une session de développement **sans réexpliquer le projet**.
Chaque brief est autonome et peut être collé tel quel comme message d'ouverture d'une nouvelle session.

> **Pré-requis** : la PR « Phase 1 en PWA (ADR-0011) + socle qualité » doit être **mergée dans `pre`**
> avant de lancer la moindre session ci-dessous. Elle apporte `.gitignore`, la CI, le PR template et
> le pivot PWA. Démarrer avant, c'est garantir des conflits.
>
> Les documents `docs/decisions/0011-pwa-poc-phase-1.md` et `docs/architecture/02-poc-pwa.md`
> (ex-`02-mobile-poc.md`) arrivent avec cette PR — ils sont cités sans lien tant qu'elle n'est pas mergée.

---

## Vue d'ensemble

| Session | Branche (depuis `pre`) | Peut démarrer | Livre |
|---------|------------------------|---------------|-------|
| **A — POC Shell & Design System** | `feature/poc-shell` | Dès PR #1 mergée | La coquille PWA et les composants, sans aucune fonctionnalité legs |
| **B — Domaine Legs** | `feature/will-domain` | Dès PR #1 mergée, **en parallèle de A** | Les règles métier du legs en TypeScript pur, testées, sans UI |
| **C — Parcours Legs** | `feature/will-poc` | Après A **et** B mergées dans `pre` | L'assemblage : les écrans du parcours de legs |

A et B ne partagent **aucun fichier** : elles peuvent tourner simultanément sans se gêner (AGENTS.md §8).

---

## Règles communes à toutes les sessions

À rappeler dans chaque session, elles ne sont pas négociables :

1. **Lire `AGENTS.md` en premier**, puis `docs/progress.md`, puis la documentation du domaine concerné.
2. Partir de `pre` à jour : `git fetch origin && git checkout -b <branche> origin/pre`.
3. Ouvrir la PR **vers `pre`**, jamais vers `main`.
4. Ne modifier **que** les fichiers listés dans le périmètre du brief. Besoin d'en toucher un autre ⇒
   l'expliquer dans la PR, ne pas le faire en silence.
5. Respecter la Definition of Done (`AGENTS.md` §11) — tests exécutés, résultat reproductible collé
   dans la PR, `progress.md` mis à jour, `git diff` relu intégralement.
6. **Aucune requête réseau** après le chargement initial. **Aucune dépendance servie par un CDN tiers.**
7. **Aucune PII dans les logs.** **Aucun secret dans Git.**
8. Le POC est une **version d'évaluation** : il annonce à chaque démarrage qu'il ne faut pas y déposer
   de vrais documents (condition de l'ADR-0011).

---

## Session A — POC Shell & Design System

**Branche** : `feature/poc-shell` · **Mission** : la coquille de l'application et le vocabulaire visuel.

### Périmètre autorisé
```
package.json, pnpm-workspace.yaml, turbo.json, tsconfig.base.json, .eslintrc*, .prettierrc*
apps/web/**
packages/ui/**
packages/core/src/ports/**        (interfaces uniquement, aucune implémentation métier)
packages/config/**
```

### À livrer
1. **Monorepo** : pnpm workspaces + Turborepo, TypeScript `strict`, ESLint/Prettier partagés.
   Règle ESLint bloquante : `packages/core` ne peut importer **ni React, ni aucune API navigateur**
   (`window`, `document`, `indexedDB`, `crypto` global).
2. **PWA `apps/web`** : Vite + React + TS, manifest, service worker (hors ligne), **CSP stricte sans
   `unsafe-inline` ni `eval`**, tout bundlé depuis l'origine.
3. **Design system `packages/ui`** : tokens (couleurs, typographie, espacements), composants de base
   (bouton, champ, carte, étape, alerte, modale de confirmation). Contraste AA minimum, cibles
   tactiles ≥ 48 px, taille de police respectant les réglages système, navigation clavier complète.
4. **Écrans de coquille, sans contenu legs** :
   - accueil / première ouverture (explication en langage courant, pas de jargon) ;
   - création du profil local et **verrouillage par code** (6 chiffres, tentatives limitées) ;
   - **bandeau permanent « version d'évaluation »** ;
   - écran **« Où sont mes données ? »** en langage simple, affichant l'état de
     `navigator.storage.persist()` (risque R26 du threat model : éviction du stockage).
5. **Ports** dans `packages/core/src/ports` : `StorageProvider`, `CryptoProvider`, `AIProvider`,
   `SecureKeyStore`, `Clock`, `Logger` — interfaces seulement, contrats identiques Phase 1 / Phase 3.
6. Tests : composants (Testing Library DOM), accessibilité automatisée, un E2E Playwright
   « j'ouvre l'app, je crée un profil, je verrouille, je déverrouille ».

### Interdit
Toute fonctionnalité de legs · toute IA · tout appel réseau · toute dépendance CDN ·
toute implémentation de port dans `packages/core` (les adapters vivent dans `apps/web`).

### Critères de fin
- [ ] L'application s'installe comme PWA et fonctionne **hors ligne** après premier chargement.
- [ ] CSP stricte vérifiée : aucune violation en console, aucun `unsafe-inline`.
- [ ] Aucune requête réseau après chargement initial (test automatisé).
- [ ] Audit d'accessibilité automatisé sans violation bloquante + navigation clavier vérifiée à la main.
- [ ] La règle ESLint d'isolation de `packages/core` échoue bien si on tente d'importer `window`.
- [ ] CI verte, `progress.md` à jour.

---

## Session B — Domaine Legs

**Branche** : `feature/will-domain` · **Mission** : les règles métier du legs, en TypeScript pur.
C'est **la partie non jetable** du POC : elle survivra au passage en natif en Phase 3.

### Périmètre autorisé
```
packages/core/src/will/**
packages/core/tests/will/**
```
Rien d'autre. Aucune UI, aucun fichier d'`apps/web`.

### Lectures obligatoires avant d'écrire une ligne
- `docs/product/02-contraintes-juridiques.md` — **en entier**, c'est la spécification métier ;
- `docs/decisions/0008-perimetre-juridique.md` — les trois objets à modéliser ;
- `AGENTS.md` §14 — signalement juridique.

### À livrer
1. **Trois objets distincts** (décision D2, option (c) — validée) :
   - `WillDraft` — brouillon de testament **destiné à être recopié à la main**, avec le mode d'emploi ;
   - `WishesDocument` — volontés **non testamentaires** (funérailles, messages, localisation des papiers) ;
   - `PhysicalWillRecord` — déclaration de **l'emplacement** d'un testament manuscrit existant.
2. `WillVersion` **immuable** : snapshot + horodatage + hash, historique complet conservé.
3. **Moteur de complétude** : quelles informations manquent, quelles incohérences existent.
   Trois niveaux de retour : ✅ complet · ⚠️ information manquante · 🛑 **consulter un professionnel**.
4. **Cas bloquants** implémentés un par un, d'après `02-contraintes-juridiques.md` §2.2 : héritiers
   réservataires, biens immobiliers ou entreprise, élément d'extranéité, régime matrimonial / PACS /
   assurance-vie, legs à une personne morale, mineur ou majeur protégé, volontés relatives au corps,
   clause conditionnelle. Chacun **bloque l'étape de validation** et oriente vers un notaire.
5. `schemaVersion` sur chaque entité, et la sérialisation vers le format VEA
   (`docs/privacy/02-export-portabilite-suppression.md`).

### Règles de rédaction
- Le domaine ne produit **jamais** le mot « valide » : il produit « complet selon la checklist ».
- Les messages destinés à l'utilisateur sont des **clés i18n**, pas des chaînes en dur.
- Aucune règle juridique n'est inventée : si un cas n'est pas couvert par
  `02-contraintes-juridiques.md`, il est signalé ⚖️ dans la PR, pas deviné.

### Critères de fin
- [ ] 100 % des règles de complétude et des cas bloquants couverts par des tests unitaires.
- [ ] Un test par cas bloquant, nommé d'après la situation juridique qu'il représente.
- [ ] Aucun import de React ni d'API navigateur (vérifié par ESLint).
- [ ] Les tests tournent en moins de 10 secondes.
- [ ] CI verte, `progress.md` à jour.

---

## Session C — Parcours Legs

**Branche** : `feature/will-poc` · **Mission** : l'assemblage, c'est-à-dire ce qu'on va faire tester.
**Ne démarre qu'une fois A et B mergées dans `pre`.**

### Périmètre autorisé
```
apps/web/src/features/will/**
apps/web/src/infra/**              (adapters : stockage chiffré WebCrypto, mock)
apps/web/e2e/**
packages/ui/**                     (uniquement pour compléter un composant manquant)
```

### À livrer
1. **Assistant pas-à-pas** : **une question par écran**, sauvegarde automatique du brouillon,
   progression visible, sortie possible à tout moment.
2. **Écran de validation** : la synthèse ✅ / ⚠️ / 🛑 produite par le domaine, avec les cas bloquants
   expliqués en langage courant et l'orientation vers un notaire présentée comme la **bonne pratique**,
   pas comme une option marginale.
3. **Historique des versions** consultable.
4. **Export** : PDF « à recopier à la main » (avec les mentions et la marche à suivre) et PDF du
   document de volontés — deux documents **distincts**, jamais fusionnés.
5. **Chiffrement réel au repos** via les adapters WebCrypto (AES-256-GCM, DEK par document, KEK
   dérivée Argon2id **jamais persistée**) — variante Phase 1 de l'ADR-0003.
6. **Avertissement permanent et non masquable** sur l'écran du document de legs.
7. E2E Playwright du parcours complet + test « aucun texte en clair dans IndexedDB/OPFS ».

### Interdit
Documents justificatifs · IA · contact de confiance · export VEA complet — **hors périmètre**,
ce sont d'autres sessions. Le POC demandé porte **uniquement sur le legs**.

### Critères de fin
- [ ] Le parcours se termine de bout en bout sans aide, en moins de 15 minutes.
- [ ] Aucun texte en clair dans IndexedDB ni OPFS (test automatisé).
- [ ] La KEK n'est écrite nulle part (test d'inspection du stockage après déverrouillage).
- [ ] Les deux PDF sont produits et distincts.
- [ ] E2E vert, accessibilité vérifiée, CI verte, `progress.md` à jour.

### Handoff attendu en fin de session C
Format `AGENTS.md` §31.12 : Completed · Current State · Files Changed · Decisions · Known Issues ·
Tests · Risks · Next Action. Persisté dans `docs/progress.md`, pas seulement dans le chat.

---

## Ce qui vient après (hors périmètre actuel)

Dans l'ordre de valeur décroissante pour la validation du design :
tests utilisateurs du parcours legs (≥ 5 personnes dont ≥ 2 de plus de 65 ans) → documents
justificatifs → contact de confiance → assistant IA (mock) → export VEA complet.

**Ne pas ouvrir ces chantiers avant d'avoir fait tester le legs.** C'est tout l'objet de la Phase 1 :
apprendre avant de construire.
