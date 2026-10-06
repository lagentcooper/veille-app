# ADR-0008 — Périmètre juridique : Veille ne produit pas un testament valide

- **Statut** : Accepté (⚖️ **validation par un juriste obligatoire avant la Phase 3**)
- **Date** : 2026-09-14
- **Phase concernée** : toutes

## Context

Le cahier des charges demande « un document permettant d'exprimer son legs, sans intervention
obligatoire d'un notaire », tout en précisant de ne pas présenter l'application comme remplaçant un
professionnel du droit. Or, en droit français (hypothèse H1), un testament olographe doit être
**écrit en entier à la main, daté et signé** par le testateur (art. 970 C. civ.). Un document saisi
sur un téléphone ne remplit pas cette condition.

Analyse d'architecte, **pas** d'avis juridique.

## Decision

1. Veille produit **trois objets distincts**, séparés dans le modèle et dans l'UI :
   - `WillDraft` — brouillon de testament **destiné à être recopié à la main**, accompagné du mode
     d'emploi (écriture manuscrite intégrale, date, signature, conservation, dépôt possible chez un notaire) ;
   - `WishesDocument` — volontés **non testamentaires** (funérailles, messages aux proches,
     localisation des papiers, inventaire), utiles indépendamment de toute validité testamentaire ;
   - `PhysicalWillRecord` — déclaration de **l'emplacement** du testament manuscrit existant.
2. L'application n'affiche **jamais** « votre testament est valide », mais « complet selon notre
   checklist », avec un avertissement permanent et non masquable.
3. Le moteur de validation **bloque** l'étape de validation et oriente vers un professionnel dans les
   cas listés en `docs/product/02-contraintes-juridiques.md` §2.2 (héritiers réservataires,
   immobilier, extranéité, majeur protégé, etc.).
4. Le parcours **se conclut** par une étape « faire valider / déposer chez un notaire », présentée
   comme la bonne pratique.
5. Le rôle applicatif est nommé **« contact de confiance »**, avec un avertissement le distinguant de
   la personne de confiance médicale (art. L1111-6 CSP) et de l'exécuteur testamentaire.

## Alternatives

1. **Prétendre produire un testament valide numériquement** — juridiquement faux en France, risque de
   réputation et de responsabilité majeur. Écarté.
2. **Ne proposer que des volontés non testamentaires** — plus sûr, mais rate une grande part de la
   valeur attendue par l'utilisateur.
3. **Signature électronique qualifiée** — ne rend pas un testament olographe valide (la forme
   manuscrite est exigée en soi) ; utile éventuellement pour d'autres documents. À réévaluer.
4. **Passer systématiquement par un notaire partenaire** — le plus sûr juridiquement, mais change le
   modèle économique et la promesse (« sans intervention obligatoire d'un notaire »).

## Why

- La contrainte est **légale, pas technique** : aucune architecture ne la contourne.
- Un produit honnête sur ses limites est plus crédible, et c'est cohérent avec une application qui
  vend de la confiance.
- L'utilité réelle reste très forte : guider, structurer, alerter sur les pièges, préparer un texte
  correct à recopier, conserver les pièces, et transmettre au bon moment.
- Le risque inverse (un utilisateur croit avoir un testament valide et sa famille découvre le
  contraire après son décès) serait **irréparable** — c'est le scénario à éviter absolument.

## Trade-offs

- Parcours moins « magique » : il faut demander à l'utilisateur un effort manuscrit.
- Discours commercial plus difficile à tenir face à des concurrents moins scrupuleux.
- Le moteur de règles de validité et les avertissements doivent être **maintenus** à mesure que le
  droit évolue.

## Consequences

- Le modèle de données distingue `WillDraft`, `WishesDocument` et `PhysicalWillRecord` **dès la Phase 1**.
- L'export produit un PDF « à recopier à la main » et un PDF de volontés, distincts.
- Les règles de blocage sont des règles de **domaine testées unitairement**, pas des textes d'interface.
- Un juriste doit valider : la formulation des avertissements, la liste des cas bloquants, les CGU,
  et la qualification exacte du service rendu.

## Revisit when

- Le droit évolue (testament électronique reconnu).
- Le périmètre géographique s'étend (autre juridiction = autre moteur de règles).
- Un partenariat notarial est conclu.
