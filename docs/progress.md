# Current Progress

> Mis à jour à chaque tâche significative. **Aucune donnée personnelle, aucun secret ici.**
> Dernière mise à jour : 2026-10-06 — session *Web/UX* (Session A, `feature/poc-shell`).

## Completed

- **Phase 0 — Cadrage architectural** (branche `claude/practical-hypatia-se6kbi`)
  - `AGENTS.md` : règles permanentes (invariants, sécurité, privacy, IA, Git, tests, interdictions, DoD).
  - `docs/product/` : hypothèses et questions critiques, contraintes juridiques, roadmap 6 phases,
    liste des décisions à prendre.
  - `docs/architecture/` : monorepo et arborescence, architecture mobile POC, architecture cible,
    data flow / classification / trust boundaries / dépendances / infrastructure, IA locale,
    observabilité, DevSecOps, stack technique, stratégie de tests.
  - `docs/security/` : threat model initial, contrôles par frontière de confiance.
  - `docs/privacy/` : classification des données, export / portabilité / suppression (format VEA).
  - `docs/decisions/` : ADR-0001 à ADR-0010 + template.

- **Socle qualité — partie agnostique du choix de stack** (session *QA*)
  - `.github/pull_request_template.md` : checklist DoD (AGENTS.md §11) + points bloquants
    (`docs/architecture/07-devsecops.md` §9.4).
  - `.github/workflows/security-secrets.yml` : Gitleaks épinglé par version et vérifié par SHA-256,
    historique complet, sorties masquées (`--redact`).
  - `.github/workflows/docs.yml` + `tools/check-doc-links.py` : vérification des liens relatifs de la
    documentation (48 liens, 0 cassé à ce commit).
  - `.github/dependabot.yml` (GitHub Actions uniquement — aucun manifeste de paquet à ce stade),
    `.gitignore`, `.editorconfig`.
  - **Non fait, à faire côté GitHub par le porteur** : protection de `main` (PR obligatoire, 1 revue,
    CI verte, pas de force-push), secret scanning + push protection, CODEOWNERS (nécessite les
    identifiants GitHub réels).

- **Virage plateforme : le POC de Phase 1 est une PWA** (session *QA*, sur arbitrage du porteur)
  - [ADR-0011](decisions/0011-pwa-poc-phase-1.md) créé ; ADR-0002 ramené aux phases 3+ ;
    ADR-0003 doté d'une variante navigateur (KEK dérivée par Argon2id, jamais persistée).
  - Threat model : frontière **TB-0 — Navigateur et origine web** et risques **R25 à R28** ;
    R1, R3, R4, R5 distinguent désormais Phase 1 et Phase 3.
  - Stack, stratégie de tests, DevSecOps, arborescence, classification des données et roadmap
    répercutés. `02-mobile-poc.md` renommé `02-poc-pwa.md`.

- **Session A — coquille PWA et design system** (branche `feature/poc-shell`, PR vers `pre`)
  - Monorepo pnpm + Turborepo, TypeScript `strict`, ESLint/Prettier partagés ; règle bloquante
    d'isolation de `packages/core` (aucun React, aucune API navigateur), prouvée par un test qui
    échoue sur `window`, `document`, `indexedDB`, `crypto`, `globalThis.window` et `react`.
  - `packages/core/src/ports` : `StorageProvider`, `CryptoProvider`, `AIProvider`, `SecureKeyStore`,
    `Clock`, `Logger` (interfaces uniquement ; `Logger` n'accepte que des nombres/booléens en champs).
  - `packages/ui` : tokens, bouton, champ, carte, étape, alerte, modale de confirmation.
  - `apps/web` : accueil, création du profil (prénom → code à 6 chiffres → confirmation), verrouillage
    (5 essais puis attente croissante, verrouillage auto à 5 min et à la perte de visibilité),
    bandeau « version d'évaluation » permanent, écran « Où sont mes données ? » (état de
    `navigator.storage.persist()`, suppression totale avec confirmation).
  - Adapters web : IndexedDB, WebCrypto (AES-256-GCM, chiffrement enveloppe) avec Argon2id (`hash-wasm`,
    mono-thread), clés en mémoire seulement.
  - Service worker écrit à la main (précache seul), CSP en `<meta>`, `404.html`, `robots.txt` + `noindex`,
    base `/veille-app/` ([ADR-0012](decisions/0012-github-pages-poc.md)).
  - Workflows : `ci.yml` (lint, types, unitaires, build, E2E) et `deploy-pages.yml` (déploiement sur
    `main` puis E2E rejoués **contre l'URL Pages**).

## In Progress

- **Phase 1 — POC UX/UI en PWA.** Phase ouverte : l'architecture est validée (D22) et la plateforme
  tranchée (D16).
- **Périmètre restreint par le porteur : le POC porte UNIQUEMENT sur le document de legs.**
  Documents justificatifs, contact de confiance, assistant IA et export VEA complet sont **hors
  périmètre** jusqu'à ce que le parcours de legs ait été testé auprès d'utilisateurs réels.
  Briefs des sessions : [`docs/product/05-briefs-sessions.md`](product/05-briefs-sessions.md).
- **Distribution du POC : GitHub Pages** ([ADR-0012](decisions/0012-github-pages-poc.md)), déployé
  depuis `main` par GitHub Actions. Dépôt **public**, URL `https://lagentcooper.github.io/veille-app/`.
  Contraintes qui en découlent et qui ne doivent pas être oubliées : CSP en `<meta>` seulement,
  pas de `COOP`/`COEP` donc Argon2id mono-thread, sous-chemin `/veille-app/`, `404.html` de repli,
  `noindex`. Nouveaux risques **R29** (URL publique) et **R30** (absence d'en-têtes).

## Blocked

- Rien ne bloque le démarrage du squelette applicatif.
- **Décisions 🔴 restantes**, qui conditionnent le **contenu** des parcours et non le squelette :
  - D1 juridiction cible, D2 nature du document, D3 libellé du rôle de confiance
  - D8 zero-knowledge strict ou récupération assistée
  - D9 les données doivent-elles survivre à la perte de l'appareil
  - D25 constitution du panel de testeurs
- **Tranchées** : D16 (PWA pour le POC), D22 (architecture validée).

## Decisions Pending

Voir `docs/product/04-decisions-a-prendre.md` (D1 à D25).
Points nécessitant une **validation juridique** (⚖️) : nature du document de legs, preuves de décès
acceptées, durées de conservation, nécessité HDS, base légale du traitement des données du contact de
confiance, qualification du responsable de traitement en Phase 1.

## Next Steps

Les trois sessions ci-dessous sont décrites intégralement — périmètre de fichiers, interdits,
critères de fin — dans [`docs/product/05-briefs-sessions.md`](product/05-briefs-sessions.md).

1. **Session A — `feature/poc-shell`** (livrée en PR ; critères sur l'URL Pages à confirmer après promotion vers `main` et activation de Pages) : squelette du monorepo (pnpm + Turborepo + TypeScript strict),
   `apps/web` (React + Vite + service worker + CSP stricte), design system `packages/ui`, coquille
   (accueil, verrouillage par code, bandeau « version d'évaluation », écran « Où sont mes données ? »),
   ports dans `packages/core`, règle ESLint interdisant à `packages/core` d'importer React ou une API
   navigateur.
2. **Session B — `feature/will-domain`**, en parallèle de A (aucun fichier partagé) : règles métier du
   legs en TypeScript pur — `WillDraft` / `WishesDocument` / `PhysicalWillRecord`, versions immuables,
   moteur de complétude, cas bloquants « voir un notaire », sérialisation VEA.
3. **Session C — `feature/will-poc`**, après merge de A et B : assemblage des écrans du parcours de
   legs, chiffrement WebCrypto réel, deux PDF distincts, E2E Playwright.
4. **Tests utilisateurs du parcours de legs** (≥ 5 personnes dont ≥ 2 de plus de 65 ans) — c'est
   l'objet même de la Phase 1. **Ne pas ouvrir d'autre chantier avant.**
5. Trancher les décisions 🔴 restantes (D1, D2, D3, D8, D9, D25). **D2 tranchée** : option (c), trois
   objets distincts (brouillon de testament à recopier, document de volontés, emplacement déclaré).

*La session Trusted Contact, précédemment annoncée comme démarrable en parallèle, est reportée :
le porteur a restreint le POC au seul document de legs.*
7. En parallèle : prise de contact avec un juriste (points ⚖️) et recrutement des testeurs.
8. **Réglages GitHub restant à la charge du porteur** (aucun n'est faisable depuis une session d'agent) :
   - **activer GitHub Pages** : *Settings → Pages → Build and deployment → Source : GitHub Actions* —
     **bloquant pour la session A** ;
   - **protection de `main` et `pre`** : PR obligatoire, CI verte, pas de force-push. Tant qu'elle
     manque, `main` est déployé publiquement sans garde-fou (risque R28 rehaussé) ;
   - secret scanning + push protection ; CODEOWNERS (identifiants réels requis).

## Known Issues / Risques ouverts

- La perte du code de récupération entraîne une perte définitive des données (arbitrage D8 requis).
- Le mécanisme cryptographique de libération de la clé successorale n'est pas encore spécifié
  (ADR-0005, options A/B/C) — **revue par un cryptographe externe requise avant implémentation**.
- Les hypothèses juridiques (H1, H2) ne sont pas validées par un professionnel.
- Aucun test utilisateur n'a encore été mené : le produit reste une hypothèse.
- **Phase 1 (web) — risques propres au navigateur, assumés pour la durée du POC** :
  un XSS ou une extension donne l'usage de la KEK (R25, R27) et le navigateur peut évincer le
  stockage (R26). Ces risques ne sont pas techniquement réductibles au niveau d'une application
  native : ils sont bornés par le périmètre d'usage — version d'évaluation, données fictives,
  interdiction affichée d'y déposer de vrais documents ([ADR-0011](decisions/0011-pwa-poc-phase-1.md)).
  **Si cette règle d'usage n'est pas tenue, la décision PWA doit être rouverte.**
- Les deux conflits signalés précédemment par la session QA (incohérence de phase dans `AGENTS.md` §2,
  et piste PWA contredisant ADR-0002) sont **résolus** : le porteur a tranché, la documentation est
  alignée et ADR-0011 porte la décision.
