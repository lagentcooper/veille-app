# ADR-0007 — Aucun backend en Phase 1

- **Statut** : Accepté
- **Date** : 2026-09-14
- **Phase concernée** : 1

## Context

La Phase 1 vise à valider le produit et le design auprès d'utilisateurs réels. Construire un backend
implique : authentification, hébergement, conformité RGPD, sécurité serveur, exploitation,
sauvegardes, coûts récurrents — soit plusieurs mois de travail **avant** de savoir si le produit
convainc.

## Decision

**Aucun serveur, aucun compte distant, aucun appel réseau en Phase 1.** Les données sont locales et
fictives ou saisies par les testeurs sur leur propre appareil. Un test automatisé **fait échouer la
CI** si une requête sortante est émise pendant les tests.

Corollaire : l'application affiche un bandeau « version d'évaluation — n'y placez pas de documents
réels sensibles » tant que la Phase 3 n'est pas atteinte.

## Alternatives

1. **Backend minimal dès le départ** (« on en aura besoin de toute façon ») — coûte des mois et
   fige des choix (modèle de compte, schéma) avant d'avoir les retours utilisateurs.
2. **Backend-as-a-Service** (Firebase, Supabase) — rapide, mais oriente vers une architecture où le
   fournisseur peut lire les données, et transfère des données hors UE dans certains cas.
   Contraire aux invariants A2/A3.
3. **Synchronisation pair-à-pair** — complexité élevée, bénéfice nul en Phase 1.

## Why

- Le POC répond à une question **produit** (« les gens comprennent-ils et adoptent-ils ? »), pas à
  une question technique.
- Sans réseau, le risque de fuite pendant les tests utilisateurs est **structurellement nul**.
- L'absence de backend supprime toute la charge de conformité pendant la phase d'exploration.
- Le local-first n'est pas une étape provisoire : il reste l'architecture cible (ADR-0003). Le
  backend n'est qu'un **complément** (sauvegarde, activation), jamais le centre du système.

## Trade-offs

- Les données des testeurs ne survivent pas à une désinstallation → prévenir, et fournir l'export VEA.
- Les parcours nécessitant un serveur (activation réelle, notifications) ne peuvent être que
  **simulés** → risque de valider une UX qui ne correspondra pas exactement à la réalité (atténué en
  simulant fidèlement les délais et les messages).
- La migration Phase 1 → Phase 3 des données de test devra être traitée sérieusement.

## Consequences

- Le port `SyncProvider` existe dès la Phase 1 mais n'a qu'une implémentation `NullSyncProvider`.
- Aucune dépendance réseau (analytics, crash reporting) n'est ajoutée à l'application.
- Le parcours d'activation est implémenté comme une **simulation pilotée par la machine à états
  réelle** : la logique est donc déjà testée quand le backend arrivera.
- Le budget conformité et sécurité serveur est reporté à la Phase 2/3.

## Revisit when

- La Phase 1 est validée et la décision D9 (survivance des données à la perte de l'appareil) est
  tranchée.
- Un test utilisateur démontre qu'un parcours ne peut pas être évalué sans serveur réel.
