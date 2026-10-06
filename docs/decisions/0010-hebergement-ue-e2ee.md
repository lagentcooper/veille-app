# ADR-0010 — Hébergement UE et chiffrement de bout en bout (serveur « zero-knowledge »)

- **Statut** : Accepté sur le principe ; **fournisseur à choisir en Phase 3**
- **Date** : 2026-09-14
- **Phase concernée** : 3 → 6 (aucun impact en Phase 1, qui n'a pas de serveur)

## Context

En Phase 3, un backend devient nécessaire pour trois raisons, et trois seulement :
sauvegarde/restauration, mécanisme d'activation successorale, et notifications. Les données
concernées sont extrêmement sensibles et peuvent relever de l'art. 9 RGPD (documents médicaux
importés par l'utilisateur, hypothèse H11).

## Decision

1. **Hébergement dans l'Union européenne**, avec préférence pour un fournisseur européen
   (ex. Scaleway, OVHcloud) ; à défaut, une région UE d'un hyperscaler, ce qui n'écarte pas
   totalement les questions d'accès extraterritorial. ⚖️
2. **Le serveur ne détient aucune clé de contenu** : il stocke des blobs **opaques**. Une
   compromission complète du serveur ne doit livrer aucun document lisible.
3. **Séparation stricte** des domaines de données (auth / métadonnées / blobs / audit / logs /
   secrets), chacun dans son stockage, avec un rôle d'accès distinct par service.
4. **Le service d'activation est isolé** (réseau, base, déploiement, journalisation) : c'est le
   composant le plus sensible.
5. **Aucun opérateur n'a accès au contenu** — garanti techniquement, pas seulement par une politique.
6. **Infrastructure as Code** portable (Terraform/OpenTofu), sans service propriétaire exotique, pour
   qu'un changement de fournisseur reste possible.

## Alternatives

1. **Chiffrement côté serveur avec clés gérées par le service (KMS)** — bien plus simple (recherche
   serveur, partage, récupération de compte facile), mais le service peut alors lire les données :
   contraire à la promesse produit et aggrave fortement l'impact d'une compromission.
2. **Hyperscaler US avec région UE** — services managés plus matures, coûts compétitifs, mais
   exposition possible à des demandes extraterritoriales. ⚖️ À arbitrer avec un juriste.
3. **Auto-hébergement** — contrôle maximal, mais charge d'exploitation et de sécurité hors de portée
   d'une équipe réduite (et probablement moins sûr en pratique).
4. **Pas de serveur du tout** — cohérent avec le local-first, mais alors les données ne survivent pas
   à la perte de l'appareil et la transmission successorale devient très fragile (décision D9).

## Why

- Le zero-knowledge **réduit structurellement l'impact** de tous les scénarios serveur du threat model
  (R13, R16, R17) : compromission, opérateur curieux, réquisition.
- L'hébergement UE simplifie la conformité (pas de transfert hors UE à justifier) et constitue un
  **argument produit fort** pour une application qui vend la confiance.
- L'IaC portable évite le verrouillage fournisseur, cohérent avec le principe d'anti-verrouillage
  appliqué aux données (ADR-0006).

## Trade-offs

- **Pas de recherche côté serveur** ni de traitement du contenu : toutes les fonctions intelligentes
  restent sur l'appareil (c'est voulu, mais cela limite certaines évolutions).
- **Récupération de compte difficile** : sans clé, le service ne peut pas aider un utilisateur qui a
  tout perdu (lien direct avec la décision D8).
- Services managés parfois moins riches chez les fournisseurs européens ; effort d'exploitation supérieur.
- La transmission successorale devient un problème cryptographique délicat (ADR-0005, option B).

## Consequences

- L'API ne reçoit **jamais** de contenu en clair ; le chiffrement a lieu sur l'appareil avant émission.
- Les métadonnées côté serveur sont **minimisées** (pas de titre, pas de nom de fichier, pas de catégorie).
- Un test d'architecture vérifie qu'aucun point d'API n'accepte de contenu non chiffré.
- Une démonstration de compromission (« on vole toute la base : que voit-on ? ») fait partie des
  critères d'acceptation de la Phase 3.
- Les sauvegardes serveur sont chiffrées, en région distincte, avec **restauration testée mensuellement**.

## Revisit when

- Le juriste impose une certification particulière (HDS) qui restreint le choix d'hébergeur.
- Le produit a besoin d'un traitement serveur du contenu (⇒ ADR contradictoire à rédiger, avec
  analyse d'impact complète).
- Une évolution réglementaire modifie les conditions de transfert hors UE.
