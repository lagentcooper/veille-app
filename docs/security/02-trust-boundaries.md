# 13. Trust boundaries — contrôles par frontière

Complète la carte de `docs/architecture/04-data-flow-map.md` §6.4.
Principe : **à chaque franchissement de frontière, on ne fait jamais confiance à ce qui arrive.**

---

## TB-A — Entre l'utilisateur et l'application (verrouillage)

| Contrôle | Phase | Détail |
|----------|-------|--------|
| Code applicatif distinct du code de l'appareil | 1 | 6 chiffres minimum, limitation des tentatives, temporisation croissante |
| Biométrie | 1 | Confort, jamais seul moyen : repli par code toujours possible |
| Verrouillage automatique | 1 | Au passage en arrière-plan + inactivité (délai réglable, défaut court) |
| Masquage de l'aperçu | 1 | Écran masqué dans le sélecteur de tâches |
| Anti-capture d'écran | 2 | Écrans sensibles uniquement (utilisabilité vs sécurité) |
| Effacement après N échecs | 3 | Optionnel, explicitement choisi par l'utilisateur |

---

## TB-B — Entre l'appareil et le stockage local (chiffrement au repos)

| Contrôle | Phase | Détail |
|----------|-------|--------|
| Base chiffrée | 1 (simple) → 3 (SQLCipher) | Toutes les métadonnées, y compris titres et catégories |
| Fichiers chiffrés (AES-256-GCM, DEK par fichier) | 1 | Nom de fichier = identifiant opaque (aucune information dans le nom) |
| Clé maître dans le secure element | 1 | Non exportable ; refus de la fonction si le matériel ne le permet pas |
| Exclusion des sauvegardes OS | 1 | Conteneur sensible marqué non sauvegardable |
| Dérivés (OCR, embeddings, vignettes) chiffrés et supprimés avec la source | 2 | Souvent oublié ⇒ test obligatoire |
| Rotation de clé | 3 | Sur changement de code, sur suspicion, sur migration |

---

## TB-C — Entre l'appareil et le réseau

| Contrôle | Phase | Détail |
|----------|-------|--------|
| **Aucun trafic** | 1 | Test automatisé : toute requête sortante fait échouer la CI |
| TLS 1.3 + certificate pinning | 3 | Pinning avec procédure de rotation documentée (sinon panne totale) |
| Chiffrement applicatif **avant** émission | 3 | Le réseau ne transporte que des blobs déjà chiffrés |
| Validation stricte des réponses | 3 | Schéma (Zod), taille maximale, timeouts |
| Deep links | 2 | Validés, signés, à usage unique pour l'activation (vecteur d'attaque classique) |

---

## TB-D — Entrée de l'API (côté service)

| Contrôle | Détail |
|----------|--------|
| Authentification | OIDC + liaison d'appareil ; jetons courts + rotation de refresh |
| Autorisation | Vérifiée **par ressource**, jamais déduite du client ; par défaut : refus |
| Validation d'entrée | Schéma strict, rejet de tout champ inconnu, limites de taille |
| Rate limiting | Par identité, par IP, par opération ; renforcé sur l'activation |
| Journalisation | Métadonnées uniquement ; **jamais le corps** |
| WAF / anti-automatisation | Sur les points d'entrée publics |

---

## TB-E — Entre services (interne)

| Contrôle | Détail |
|----------|--------|
| mTLS + identité de service | Pas de confiance réseau implicite (Zero Trust) |
| Un service = un rôle DB = un schéma | Aucun accès croisé aux bases |
| Secrets par service, rotation automatique | Aucun secret partagé entre services |
| Service Activation isolé | Réseau, base, déploiement et journalisation séparés |

---

## TB-F — Opérateurs humains

| Contrôle | Détail |
|----------|--------|
| MFA matérielle obligatoire | Sans exception |
| Accès just-in-time, limité dans le temps, motivé | Pas d'accès permanent en production |
| **Double validation (4 yeux)** pour valider une activation successorale | Contrôle anti-collusion principal |
| Aucun accès au contenu | Garanti techniquement (E2EE), pas seulement par politique |
| Traçabilité intégrale | Audit inaltérable, revue périodique des accès |

---

## TB-G — Le contact de confiance

Machine à états et contrôles détaillés : [ADR-0005](../decisions/0005-contact-de-confiance.md).

| Phase | Ce que le contact peut faire | Ce qu'il ne peut pas |
|-------|------------------------------|----------------------|
| Désigné (non enrôlé) | Rien | Tout |
| Enrôlé | Savoir qu'il est désigné, connaître son rôle | Voir un document, un titre, une liste, une existence de document |
| Demande déposée | Fournir des preuves, suivre l'état de sa demande | Accéder à quoi que ce soit |
| Délai de carence | Attendre | Accéder |
| Validée | Accéder **au seul paquet successoral prévu**, en lecture, pour une durée limitée, chaque accès étant tracé | Accéder au reste, modifier, prolonger, redéléguer |
| Expirée / révoquée | Rien | Tout |

---

## Synthèse des contrôles par défaut

1. **Refus par défaut** à chaque frontière.
2. **Chiffrer avant de franchir** une frontière moins fiable.
3. **Valider après** avoir franchi une frontière moins fiable.
4. **Tracer** tout franchissement sensible, sans contenu.
5. **Ne jamais faire confiance à un client**, y compris notre propre application.
