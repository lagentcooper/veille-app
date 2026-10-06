# 13. Trust boundaries — contrôles par frontière

Complète la carte de `docs/architecture/04-data-flow-map.md` §6.4.
Principe : **à chaque franchissement de frontière, on ne fait jamais confiance à ce qui arrive.**

En Phase 1 le POC est une PWA ([ADR-0011](../decisions/0011-pwa-poc-phase-1.md)) : la frontière
**TB-0 — Navigateur et origine web** s'ajoute (ci-dessous), et certains contrôles marqués « Phase 1 »
dans les tableaux suivants n'ont pas d'équivalent web. Ils sont signalés comme tels, jamais retirés
en silence.

---

## TB-0 — Navigateur et origine web (Phase 1 uniquement)

Risques associés : R25 à R28 du threat model.

| Contrôle | Phase | Détail |
|----------|-------|--------|
| CSP stricte | 1 | Ni `unsafe-inline`, ni `unsafe-eval`, ni `*` sur `script-src` ; servie en en-tête HTTP, pas en `<meta>` ; vérifiée par test |
| Aucune origine tierce | 1 | Tout est bundlé et servi par l'origine. Aucun CDN, aucune police distante, aucune analytique. Vérifié par assertion sur toutes les requêtes d'un parcours complet |
| Service worker traité comme du code sensible | 1 | Dossier isolé (`apps/web/src/sw/`), CODEOWNERS sécurité, revue obligatoire, pas de `skipWaiting` silencieux, aucune réponse contenant du contenu utilisateur mise en cache |
| Persistance du stockage | 1 | `navigator.storage.persist()` demandé, état **affiché** à l'utilisateur, export encouragé |
| Isolation d'origine | 1 | `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `X-Frame-Options`/`frame-ancestors` : l'application n'est jamais encadrable |
| Déploiement depuis la CI uniquement | 1 | Aucun dépôt manuel de fichiers sur l'hébergement ; accès restreint et MFA |
| Extensions de navigateur | 1 | **Non mitigeable** — documenté comme risque résiduel (R27) |

---

## TB-A — Entre l'utilisateur et l'application (verrouillage)

| Contrôle | Phase | Détail |
|----------|-------|--------|
| Code applicatif distinct du code de l'appareil | 1 | 6 chiffres minimum, limitation des tentatives, temporisation croissante |
| Biométrie | **3** | Confort, jamais seul moyen : repli par code toujours possible. Pas d'équivalent simple en Phase 1 ; WebAuthn évalué en Phase 2 |
| Verrouillage automatique | 1 | Sur inactivité (délai réglable, défaut court) et, en Phase 1, à la **perte de visibilité de l'onglet** |
| Masquage de l'aperçu | **3** | Écran masqué dans le sélecteur de tâches. Sans équivalent web |
| Anti-capture d'écran | 2 | Écrans sensibles uniquement (utilisabilité vs sécurité) |
| Effacement après N échecs | 3 | Optionnel, explicitement choisi par l'utilisateur |

---

## TB-B — Entre l'appareil et le stockage local (chiffrement au repos)

| Contrôle | Phase | Détail |
|----------|-------|--------|
| Base chiffrée | 1 (IndexedDB) → 3 (SQLCipher) | Toutes les métadonnées, y compris titres et catégories |
| Fichiers chiffrés (AES-256-GCM, DEK par fichier) | 1 | Nom de fichier = identifiant opaque (aucune information dans le nom). Phase 1 : dans OPFS |
| Clé maître dans le secure element | **3** | Non exportable ; refus de la fonction si le matériel ne le permet pas |
| **Phase 1 — KEK jamais persistée** | 1 | Dérivée du code par Argon2id, `CryptoKey` non extractible, en mémoire seulement ; c'est la contrepartie web de la ligne précédente (ADR-0003 §Variante Phase 1) |
| Exclusion des sauvegardes OS | **3** | Conteneur sensible marqué non sauvegardable. Sans équivalent web ; en Phase 1 la protection vient de ce que la KEK n'est jamais écrite |
| Dérivés (OCR, embeddings, vignettes) chiffrés et supprimés avec la source | 2 | Souvent oublié ⇒ test obligatoire |
| Rotation de clé | 3 | Sur changement de code, sur suspicion, sur migration |

---

## TB-C — Entre l'appareil et le réseau

| Contrôle | Phase | Détail |
|----------|-------|--------|
| **Aucun trafic** | 1 | Test automatisé : toute requête sortante fait échouer la CI. L'application web étant servie par HTTP, l'assertion porte sur l'absence de requête **après le chargement initial**, hors assets de même origine |
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
