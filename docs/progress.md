# Current Progress

> Mis à jour à chaque tâche significative. **Aucune donnée personnelle, aucun secret ici.**
> Dernière mise à jour : 2026-10-06 — sessions *Web* (C), *QA* et *UX/UI*, intégrées ensemble.

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

- **Session B — domaine legs** (`feature/will-domain`, mergée dans `pre`) : `packages/core/src/will/**`,
  trois objets distincts, versions chaînées par hash, moteur de complétude à trois niveaux, neuf cas
  bloquants, validation d'entrée stricte, sérialisation VEA du legs. 97 tests.

- **Session C — parcours Legs** (branche `feature/will-poc`, PR vers `pre`)
  - **Completed** : assistant pas-à-pas **une question par écran** (brouillon : 13 à 20 écrans selon les
    réponses ; volontés ; emplacement du testament manuscrit), sauvegarde automatique à chaque saisie,
    reprise là où l'on s'était arrêté, écran « Faire le point » (✅ / ⚠️ / 🛑, orientation vers le notaire
    présentée comme la dernière étape), export de **deux PDF distincts** (jamais fusionnés), historique
    des versions consultable, avertissement permanent et non masquable sur tous les écrans `/legs`.
  - **Chiffrement réel** : AES-256-GCM, une DEK par objet, DEK enveloppée par la KEK (Argon2id, jamais
    persistée), sujet authentifié (AAD) : un enregistrement déplacé est refusé ; l'historique est
    revérifié (chaîne de hash) à chaque lecture ; un enregistrement illisible n'est jamais écrasé.
  - **Current State** : tout est local ; aucune requête réseau pendant le parcours (test E2E).
  - **Files Changed** : `apps/web/src/features/will/**` (domain, data, ui), `apps/web/src/i18n/will-fr.ts`,
    `apps/web/src/adapters/sha256-hasher.ts`, `apps/web/e2e/will*.ts`, `packages/ui` (ChoiceGroup,
    TextArea, Checkbox, Progress, style des liens-boutons), alias `@veille/core/will`, petites retouches
    à `App.tsx`, `main.tsx`, `HomeScreen.tsx`, `profile-service.ts` (export de `KEK_ALIAS`).
    Docs : threat model (R31), classification (PDF exportés), matrice de tests.
  - **Decisions** : (1) PDF sans dépendance, écrit à la main (texte, polices Courier intégrées au
    format PDF) — une dépendance de moins à auditer ; (2) le texte à recopier n'est **pas** proposé tant
    qu'un cas 🛑 ou une information manquante subsiste ; (3) une version est enregistrée quand on termine
    une partie et à chaque export, pas à chaque frappe ; (4) le contenu d'un PDF téléchargé sort du
    périmètre chiffré : avertissement affiché (R31).
  - **Tests** : 130 tests unitaires/composants `@veille/web` + 8 `@veille/ui` ; E2E Playwright (voir PR) ;
    mutation vérifiée : remplacer le chiffrement par du clair fait échouer le test de stockage.
  - **Known Issues** : voir « Known Issues » ci-dessous (domaine legs, CI, juridique).
  - **Next Action** : tests utilisateurs du parcours (≥ 5 personnes dont ≥ 2 de plus de 65 ans) ; faire
    relire par un juriste les textes marqués ⚖️ (`apps/web/src/i18n/will-fr.ts`).

- **Contraste des boutons — correctif** (session *UX/UI*, branche `fix/disabled-contrast`)
  - **Cause réelle de la CI rouge** (`will.spec.ts:353`, ligne 377, écran « ajouter un message ») : la
    transition `background-color 0,15 s` des boutons. React réutilise le même `<button>` d'un écran à
    l'autre en changeant sa variante (primaire → secondaire) ; l'audit axe, lancé pendant ces 150 ms,
    mesure un fond à moitié fondu : **2,76:1** (`#1f4e8c` sur `#7b97bc`) dans le log de CI. Reproduit en
    allongeant la transition à 8 s (1,04:1 sur ce même écran). Transition supprimée.
  - `opacity: 0.6` des boutons désactivés remplacé par des jetons explicites : blanc sur `#646b78`
    (5,36:1) pour le primaire ; `#5d6475` sur blanc (5,92:1) et sur surface (5,39:1) pour le secondaire.
    `aria-disabled` conservé, survol neutralisé. Champ désactivé aligné.
  - Gardes : `packages/ui/tests/tokens.test.ts` (ratios ≥ 4,5:1, aucune `opacity`, aucune `transition`)
    et un E2E sur la durée de transition des boutons.

- **Câblage de `packages/core` et hygiène** (session *QA*, branche `fix/core-workspace-wiring`)
  - **Les 97 cas du domaine legs n'étaient exécutés par rien.** `packages/core` n'avait pas de
    `package.json`, donc n'était pas un paquet du workspace, donc n'avait pas de script `test` ;
    la CI listait `@veille/ui` et `@veille/web` à la main. Les 20 cas bloquants juridiques
    (réservataires, immobilier, extranéité, régime matrimonial, majeur protégé, personne morale,
    famille recomposée, clause conditionnelle) n'étaient assertés par aucun test exécuté.
  - `packages/core` devient `@veille/core`, avec une carte `exports` sur la source — pas d'étape de
    build : Vite et `tsc` lisent le `.ts` directement, comme `@veille/ui` le fait déjà.
  - `apps/web` déclare `@veille/core` en `workspace:*` et **l'alias disparaît des quatre endroits**
    qui le portaient (`tsconfig.base.json`, `apps/web/tsconfig.json`, `vite.config.ts`,
    `vitest.config.ts`). Un seul mécanisme. La session C peut importer `@veille/core/will` sans
    toucher à une configuration.
  - La CI exécute `pnpm test` (Turborepo) au lieu d'une liste de filtres : un nouveau paquet est
    couvert le jour où il est créé.
  - Typecheck **étendu, pas dupliqué** : `tsconfig.core.json` garde la source sous `types: []`,
    `tsconfig.core-tests.json` l'étend pour couvrir les tests avec `@types/node`. Aucun fichier
    couvert deux fois ; `packages/core` n'a toujours pas de `tsconfig` propre.
  - `packages/core` passe sous Prettier (la note `//format` du `package.json` racine est levée).
    Au passage : le test de pureté du domaine ne reconnaissait que les quotes simples — le
    reformatage l'aurait rendu **vacu** (assertions sur zéro import, toujours vertes). Rendu
    insensible aux quotes, avec une assertion qui garde le garde-fou.
  - **52 artefacts Playwright (1,3 Mo) retirés du suivi Git** : traces, enregistrements réseau,
    capture vidéo, instantanés DOM des pages testées. `test-results/`, `playwright-report/` et
    `.playwright-artifacts-*/` ajoutés à `.gitignore`. Données fictives ici, mais c'est l'habitude
    qu'interdit AGENTS.md §10.

- **Refonte UI/UX** (session *UX/UI*, branche `feature/ui-refresh`)
  - Système visuel : palette « papier chaud + bleu pétrole » et **quatre teintes qui ont un sens** (sauge =
    complet, ambre = à compléter, terracotta = à voir avec un professionnel, ardoise = pas commencé),
    jamais décoratives ; l'état n'est jamais porté par la couleur seule (icône + mots). Icônes SVG
    dessinées dans `packages/ui` (rien n'est chargé à l'exécution, CSP inchangée). Cartes élevées,
    en-tête de marque, boutons et champs plus généreux, bandeau « version d'évaluation » conservé.
  - Nouveaux composants `packages/ui` : `Icon`, `Badge`, `Callout` (encart repliable natif), `Meter` ;
    `Alert` porte une icône, `Card` une teinte.
  - **Encart « Legs, testament : quelle différence ? »** sur l'écran du document de legs (ouvert à la
    première visite, replié ensuite). Le message de prévention permanent est inchangé.
    ⚖️ **VALIDATION JURIDIQUE REQUISE** : les définitions (testament, legs, volontés hors testament,
    « sans testament la loi prévoit qui hérite », « la loi réserve une part à certains proches ») sont
    en langage courant, écrites sans relecture d'un juriste (`will.explainer.*` dans `will-fr.ts`).
  - **« Faire le point » plus lisible** : récapitulatif des trois parties, légende des étiquettes, et, par
    partie, « 2 réponses sur 12 » puis trois groupes distincts — *À voir avec un professionnel*,
    *Réponses manquantes* (chaque manque est **nommé par sa question**, avec un lien « Répondre », les
    autres repliés au-delà de 5), *À vérifier*. Logique dans `domain/review-groups.ts`, testée sans rendu.
  - Tests : jetons de la palette (≥ 4,5:1 texte, ≥ 3:1 éléments porteurs de sens), regroupement des
    manques, encart et « Faire le point » en composants et en E2E.

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
3. ~~**Session C — `feature/will-poc`**~~ : livrée et fusionnée dans `pre`.
   Le câblage de `@veille/core` est en place (session *QA*) : `import { ... } from "@veille/core/will"`
   fonctionne sans configuration, et les tests du domaine s'exécutent en CI.
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
- **Trou de couverture confirmé**, détaillé dans
  [`09-strategie-tests.md`](architecture/09-strategie-tests.md) §11.2 bis : le critère de Phase 1
  « **aucune PII dans les logs** » (roadmap, AGENTS.md §6.3) n'est asserté par **aucun** test —
  `console-logger.ts` n'est couvert par rien et il n'existe pas de scanner de motifs. À produire
  avant les tests utilisateurs. Également ouverts : assertions d'octets sur le stockage chiffré,
  et Playwright sur Chromium seulement là où la matrice vise aussi WebKit.
- **Leçon de méthode** : un paquet livré sans `package.json` est invisible pour le workspace, donc
  ses tests ne s'exécutent pas, et une CI qui nomme ses paquets à la main ne le signale jamais.
  La CI appelle désormais `pnpm test`. Toute session qui crée un paquet doit vérifier qu'il
  apparaît dans la sortie de `pnpm test` — pas seulement que ses tests passent en local.
- **Parcours legs — points à traiter, non corrigés par la session C (hors de son périmètre)** :
    distingue pas « pas encore répondu » de « ne sait pas ». À arbitrer (produit + domaine).
  - Marié sans enfant : deux 🛑 pour la même personne (héritier réservataire *et* régime matrimonial).
  - L'avertissement « mot de passe » ne couvre ni l'intitulé des papiers ni la description des volontés.
  - ⚖️ Les textes en langage courant (cas bloquants, mode d'emploi manuscrit, formule d'ouverture du
    texte à recopier, avertissements) n'ont **pas** été relus par un juriste.
  - Le PDF est en Courier (police intégrée) : lisible, mais non « tagué » pour les lecteurs d'écran.
  - La mesure « moins de 15 minutes sans aide » ne peut être démontrée que par les tests utilisateurs ;
    l'E2E ne mesure que la longueur du parcours (nombre d'écrans).
- **Testament écrit à la main et notaire** (session Web, `feature/will-poc`) : l'application précise
  désormais qu'un testament olographe n'exige pas de notaire (le notaire reste conseillé : relecture,
  conservation, fichier central) et présente les trois formes (olographe, authentique, mystique) et leur
  valeur, en langage courant, dans l'encart du hub. Les textes des cas bloquants ne disent plus « un
  notaire doit… » mais « faites-vous accompagner par un notaire » : c'est une limite de Veille, pas une
  obligation légale. ⚖️ À faire relire par un juriste (`will.explainer.forms.*`).
