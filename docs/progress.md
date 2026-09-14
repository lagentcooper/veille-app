# Current Progress

> Mis à jour à chaque tâche significative. **Aucune donnée personnelle, aucun secret ici.**
> Dernière mise à jour : 2026-09-14 — session *QA*.

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

## In Progress

- **Phase 1 — POC UX/UI en PWA.** Phase ouverte : l'architecture est validée (D22) et la plateforme
  tranchée (D16). Prochaine étape : session *Setup* (squelette `apps/web` + CI toolchain).

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

1. Session *Setup* : squelette du monorepo (pnpm + Turborepo + TypeScript strict), `apps/web`
   (React + Vite + service worker), CI toolchain (lint, typecheck, tests), règle ESLint interdisant
   à `packages/core` d'importer React ou une API navigateur.
2. Sessions *Legs* et *Trusted Contact* — **démarrables en parallèle dès maintenant** : elles ne
   touchent que `packages/core`, en TypeScript pur, indépendant de la plateforme. Règles de
   complétude et cas bloquants d'une part ; machine à états de l'activation et tests exhaustifs
   (transitions illégales comprises) d'autre part.
3. Session *UX/UI* : design system et maquettes des 8 parcours (`packages/ui`), accessibilité DOM.
4. Session *Web* : assemblage des parcours dans `apps/web`.
5. Session *QA* : Playwright, test hors ligne, assertion « aucune requête sortante », vérification CSP,
   et tenue de la matrice de tests.
6. Trancher les décisions 🔴 restantes (D1, D2, D3, D8, D9, D25).
7. En parallèle : prise de contact avec un juriste (points ⚖️) et recrutement des testeurs.
8. **Réglages GitHub restant à la charge du porteur** : protection de `main` et `pre`, secret
   scanning + push protection, CODEOWNERS (identifiants réels requis).

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
