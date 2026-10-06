# 4. Architecture du POC — Phase 1 (PWA, 100 % local)

Décision de plateforme : [ADR-0011](../decisions/0011-pwa-poc-phase-1.md).

Objectif : **valider le produit et le design**, pas construire l'infrastructure.
Contrainte permanente : le POC doit être **jetable dans ses écrans** mais **durable dans son domaine**.

Le POC est une **application web progressive** : installable, fonctionnelle hors ligne, distribuée
par un lien. C'est un choix de Phase 1 uniquement — l'application native reste la cible des
phases 3+ ([ADR-0002](../decisions/0002-react-native-expo.md)).

---

## 4.1 Principe directeur

```
  UI (jetable, itérée avec les utilisateurs)
        │  ne connaît que des interfaces
        ▼
  DOMAIN (durable : règles, validation, permissions, machine à états)
        │  ne connaît que des ports
        ▼
  PORTS (StorageProvider, CryptoProvider, AIProvider, FileProvider, Clock, Logger)
        │
        ▼
  ADAPTERS (Phase 1 : IndexedDB + OPFS + WebCrypto + MockAI • Phase 3 : SQLCipher, Keystore, modèle on-device, sync)
```

**Règle de dépendance (vérifiée par ESLint) :** `ui → domain → ports`. Jamais l'inverse,
jamais `ui → adapters`.

C'est le seul « sur-investissement » consenti dans le POC, et il est justifié : il permet de
remplacer les adapters web par les adapters natifs de la Phase 3, et le mock d'IA par un modèle
on-device, **sans toucher un seul écran ni une seule règle métier**.

C'est aussi ce qui rend le virage PWA peu coûteux : `packages/core` ne connaît ni React, ni le DOM,
ni WebCrypto. La règle de dépendance est **vérifiée par ESLint**, y compris l'interdiction faite au
domaine d'importer une API navigateur (`window`, `document`, `indexedDB`, `crypto` global).

---

## 4.2 Stack Phase 1

| Élément | Choix | Justification courte (détail : `08-stack-technique.md`) |
|---------|-------|---------------------------------------------------------|
| Plateforme | **PWA** (installable, hors ligne) | Distribution par lien : un testeur n'installe rien. ADR-0011 |
| Framework | **React + Vite** | Écosystème TS partagé avec `packages/core` et un futur backend ; itération d'écran quasi instantanée |
| Langage | TypeScript strict | Sécurité de typage sur le domaine métier |
| Navigation | `react-router` | Routage par fichiers/objets, typé ; pas de deep link natif requis en Phase 1 |
| Hors ligne | **Service worker** (Workbox), manifeste d'application | Invariant A1 : l'application doit fonctionner sans réseau |
| État | Zustand (UI/session) + state machines XState *uniquement* pour le parcours d'activation | Simple, pas de boilerplate ; XState là où la rigueur d'état est critique |
| Formulaires | React Hook Form + Zod | Validation partagée avec `packages/core` |
| Stockage | **IndexedDB** (métadonnées, DEK encapsulées) + **OPFS** (pièces chiffrées) | Disponibles partout, quota confortable, exportables. Chemin vers SQLite/SQLCipher en Phase 3 |
| Chiffrement | **Réel dès le POC** : AES-256-GCM via **WebCrypto**, DEK par document, KEK dérivée du code par **Argon2id** (WASM) et jamais persistée | Invariant A7. Promesse réduite et assumée : voir §4.5 et ADR-0003 §Variante Phase 1 |
| IA | `MockAIProvider` (réponses scriptées + latence simulée) | Valider l'UX de l'assistant sans coût ni risque. ADR-0004 |
| Tests | Vitest (domaine + composants), Testing Library (DOM), Playwright (E2E) | Voir `09-strategie-tests.md` |
| i18n | `i18next` — FR d'abord, clés dès le début | Pas de chaîne en dur |

**Contraintes web non négociables** (AGENTS.md §5.5) : CSP stricte sans `unsafe-inline` ni `eval`,
**aucune dépendance servie par un CDN tiers** (tout est bundlé et servi par l'origine), service
worker revu comme du code sensible.

---

## 4.3 Parcours à démontrer (les 8 du cahier des charges)

| # | Parcours | Écrans clés | Ce que le POC doit prouver |
|---|----------|-------------|-----------------------------|
| 1 | Création du profil local | Accueil → Explication → Code applicatif → Profil | Qu'on peut démarrer **sans compte, sans email, sans mot de passe compliqué** |
| 2 | Création du document de legs | Assistant pas-à-pas (1 question par écran) | Que des personnes non technophiles vont au bout sans jargon |
| 3 | Validation du document | Écran de contrôle : ✅ complet / ⚠️ manquant / 🛑 voir un notaire | Que les limites juridiques sont comprises et acceptées |
| 4 | Ajout de documents | Import (photo/fichier) → catégorie → confirmation chiffrement | Que l'import est trivial et que le chiffrement est *visible* et rassurant |
| 5 | Consultation | Liste, recherche, filtres, aperçu | Que l'on retrouve un document en < 15 s |
| 6 | Assistant IA | Chat contextuel + sources citées + badge « traitement local » | Que l'utilisateur comprend **où** se passe le traitement |
| 7 | Contact de confiance | Désignation → choix des droits → simulation d'activation | Que le modèle « aucun accès avant activation » est **compris et rassurant** |
| 8 | Export / migration | Écran « Mes données » : exporter, importer, tout supprimer | Que l'utilisateur se sent propriétaire |

**Écran transverse obligatoire : « Où sont mes données ? »** — une page en langage simple qui
explique ce qui est sur l'appareil, ce qui ne part nulle part, et ce que l'application ne peut pas
faire. C'est un élément produit, pas une mention légale.

En Phase 1, cet écran porte deux informations propres au web : l'**état de la persistance du
stockage** (le navigateur peut-il effacer les données ?) et le rappel qu'il s'agit d'une version
d'évaluation. Un utilisateur ne doit pas découvrir après coup que son navigateur a fait le ménage.

---

## 4.4 Modèle de données du POC (conceptuel)

```
Profile           (1)  — prénom, préférences, réglages d'accessibilité, consentements
WillDocument      (1..n) — sections structurées, statut, versions
  └─ WillVersion  (n)  — snapshot immuable + horodatage + hash
WishesDocument    (0..n) — volontés non testamentaires
PersonalDocument  (n)  — titre, catégorie, date, fichier chiffré, métadonnées extraites
  └─ DocumentFile (1)  — pointeur vers le fichier chiffré + IV + tag + hash
TrustedContact    (0..n) — identité, canaux, jeu de droits, état (draft/invited/active/revoked)
ActivationRequest (0..n) — machine à états (voir ADR-0005), POC = simulation
ConsentRecord     (n)  — quoi, quand, portée, version du texte, révocation
AuditEvent        (n)  — événement technique SANS contenu (voir observabilité)
```

Règles importantes dès le POC :
- `WillVersion` est **immuable** (historique des versions exigé).
- Toute suppression est **réelle** (pas de corbeille cachée), sauf `AuditEvent` (conservé, sans PII).
- Chaque entité porte `schemaVersion` → migrations testables dès le début.

---

## 4.5 Position sur la sécurité en Phase 1 (ni naïf, ni sur-architecturé)

**Fait en Phase 1** (coût faible, valeur élevée, évite des habitudes irréversibles) :
- Chiffrement réel des fichiers et des métadonnées au repos : AES-256-GCM (WebCrypto), DEK par
  document, IV aléatoire.
- KEK dérivée du code applicatif par Argon2id, `CryptoKey` non extractible, **jamais persistée** :
  ni IndexedDB, ni OPFS, ni `localStorage`, ni `sessionStorage`.
- Verrouillage par code applicatif, verrouillage automatique après inactivité et à la perte de
  visibilité de l'onglet.
- CSP stricte, aucune dépendance CDN tierce, service worker audité.
- Persistance du stockage demandée (`navigator.storage.persist()`) et son état **affiché**.
- Aucun log de contenu, aucune télémétrie, aucune requête sortante après chargement.

**Reporté explicitement (Phase 2/3)** :
- Secure element, biométrie, attestation matérielle, exclusion des sauvegardes OS — **impossibles
  dans un navigateur** (ADR-0011 §Trade-offs), livrés par l'application native de la Phase 3.
- WebAuthn (déverrouillage, puis extension PRF pour dériver la KEK d'un authentificateur matériel).
- Rotation de clés, clé de récupération, détection d'environnement compromis.
- Authentification serveur, RBAC/ABAC, audit distant, HSM/KMS.
- Le schéma cryptographique **réel** de l'activation du contact de confiance (le POC le *simule*).

### Ce que le POC ne protège pas, et qu'il faut dire

Cette séparation est volontaire et documentée : **le POC ne doit pas prétendre être sécurisé en
production.** Trois limites doivent être connues de quiconque travaille dessus :

1. **Un XSS sur l'origine compromet tout.** La KEK est non extractible mais reste *utilisable* par
   du code s'exécutant dans la page (threat model R25). C'est la raison d'être de la CSP et de
   l'interdiction des CDN tiers.
2. **Le stockage est évictable.** Un navigateur peut vider IndexedDB et OPFS sous pression disque :
   perte de données (R26). D'où la demande de persistance, son affichage, et l'incitation à exporter.
3. **Aucune protection matérielle des clés.** Un accès au profil navigateur, hors ligne, ne donne pas
   le contenu (la KEK n'est pas stockée), mais la robustesse ne tient plus qu'au **code applicatif**
   et au coût Argon2id.

Conséquence, posée par ADR-0011 comme condition de la décision : **l'écran de démarrage annonce qu'il
s'agit d'une version d'évaluation et qu'il ne faut pas y déposer de vrais documents.** Les jeux de
test viennent de `tools/seed`, jamais de documents réels.

---

## 4.6 Principes UX (personnes non technophiles)

1. **Une décision par écran.** Jamais deux questions simultanées.
2. **Langage courant** : « mettre à l'abri » plutôt que « chiffrer AES-256 » (l'explication technique
   reste accessible en un tap, jamais imposée).
3. **Toujours réversible** : tout écran a une sortie, aucune action destructive sans double confirmation explicite.
4. **Progression visible** : barre d'étapes sur le parcours de legs, sauvegarde automatique du brouillon.
5. **Rassurance explicite** : indiquer à chaque étape sensible ce qui **ne** se passe **pas**
   (« ce document ne quitte pas votre appareil »).
6. **Accessibilité** : HTML sémantique, respect de la taille de police du navigateur (unités
   relatives, jamais de `px` figé sur le texte), contraste AA minimum, cibles tactiles ≥ 48 px,
   navigation clavier complète, compatibilité VoiceOver / NVDA / TalkBack — testé, pas supposé.
   C'est l'un des arguments du choix PWA : le DOM est le terrain le plus mûr pour l'accessibilité.
7. **Pas de jargon d'erreur** : « Nous n'avons pas pu ouvrir ce fichier » + action proposée.
