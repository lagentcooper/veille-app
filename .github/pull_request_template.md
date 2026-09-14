<!--
Cette checklist est la Definition of Done d'AGENTS.md §11 et les points bloquants
de docs/architecture/07-devsecops.md §9.4. Elle n'est pas décorative : une case
non cochée doit être justifiée en clair, pas silencieusement ignorée.
-->

## Quoi et pourquoi

<!-- Le changement en quelques phrases, et le besoin auquel il répond. -->

## Session / domaine

<!-- Architecture · UX/UI · Mobile · Documents · Legs · Trusted Contact · Local AI · Security · QA
     (AGENTS.md §13). Préciser toute modification hors de ce périmètre et pourquoi. -->

## Preuve d'exécution

<!-- AGENTS.md §11 : « Ça a l'air de marcher » n'est jamais une preuve.
     Coller ici la commande ET sa sortie (tests, lint, typecheck). Un résultat
     doit être reproductible par un relecteur. -->

```
```

## Definition of Done (AGENTS.md §11)

- [ ] Code terminé
- [ ] Tests ajoutés / modifiés
- [ ] Tests exécutés, résultat reproductible collé ci-dessus
- [ ] Documentation mise à jour si nécessaire
- [ ] ADR créé / modifié si décision structurante
- [ ] Impact sécurité évalué (threat model mis à jour si le périmètre change)
- [ ] Impact privacy évalué (classification des données mise à jour si nouvelle donnée)
- [ ] `docs/progress.md` mis à jour
- [ ] `git diff` relu intégralement
- [ ] Aucun secret ajouté
- [ ] Aucune PII inutile dans les logs
- [ ] Commits atomiques et conformes (Conventional Commits)

## Impact sécurité / privacy

- [ ] Cette PR ne touche **ni** crypto, **ni** clés, **ni** permissions, **ni** contact de
      confiance, **ni** export/suppression.
- [ ] Sinon : revue sécurité demandée (AGENTS.md §5.8), et threat model / classification
      des données mis à jour si le périmètre change.

## Invariants (AGENTS.md §3)

Cocher uniquement si la PR peut les affecter, et expliquer :

- [ ] A1 local-first — aucune fonctionnalité n'exige le réseau pour lire/écrire ses documents
- [ ] A2 aucune sortie de donnée personnelle sans consentement explicite et révocable
- [ ] A3 moindre privilège — zéro accès du contact de confiance avant activation validée
- [ ] A4 ports/adapters — l'UI n'appelle aucune implémentation concrète
- [ ] A5/A6 portabilité et formats ouverts
- [ ] A7 chiffrement au repos

Toute dérogation à A1–A7 exige un ADR : lien ci-dessous.

## Dépendances ajoutées

<!-- AGENTS.md §4 : une dépendance = une ligne de justification + licence + maintenance active.
     Écrire « aucune » si c'est le cas. -->

## ⚖️ Points juridiques

<!-- Toute question de validité du document de legs, de preuve de décès ou d'incapacité, de
     conservation légale, ou de qualification RGPD/AI Act : la signaler ici, ne pas la trancher
     (AGENTS.md §14). Écrire « aucun » si c'est le cas. -->

## ADR liés

<!-- docs/decisions/… — et, si cette PR contredit un ADR existant, le lien vers l'ADR qui le
     remplace ou l'amende. Contredire un ADR sans le mettre à jour est interdit (AGENTS.md §10). -->
