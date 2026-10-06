# 4. Architecture mobile — Phase 1 (POC UX/UI, 100 % local)

Objectif : **valider le produit et le design**, pas construire l'infrastructure.
Contrainte permanente : le POC doit être **jetable dans ses écrans** mais **durable dans son domaine**.

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
  ADAPTERS (Phase 1 : SQLite local + mock crypto/AI • Phase 3 : SQLCipher, Keystore, modèle on-device, sync)
```

**Règle de dépendance (vérifiée par ESLint) :** `ui → domain → ports`. Jamais l'inverse,
jamais `ui → adapters`.

C'est le seul « sur-investissement » consenti dans le POC, et il est justifié : il permet de
remplacer le mock de chiffrement par du vrai chiffrement, et le mock d'IA par un modèle on-device,
**sans toucher un seul écran**.

---

## 4.2 Stack Phase 1

| Élément | Choix | Justification courte (détail : `08-stack-technique.md`) |
|---------|-------|---------------------------------------------------------|
| Framework | **React Native + Expo (dev build)** | Vitesse d'itération UI, accès aux modules natifs nécessaires (keystore, sqlite, ML) ; équipe réduite. ADR-0002 |
| Langage | TypeScript strict | Sécurité de typage sur le domaine métier |
| Navigation | `expo-router` | Routage par fichiers, deep links natifs (utile plus tard pour l'activation) |
| État | Zustand (UI/session) + state machines XState *uniquement* pour le parcours d'activation | Simple, pas de boilerplate ; XState là où la rigueur d'état est critique |
| Formulaires | React Hook Form + Zod | Validation partagée avec `packages/core` |
| Stockage | `expo-sqlite` (métadonnées) + système de fichiers app (pièces) | Format ouvert, exportable, chemin direct vers SQLCipher en Phase 3 |
| Chiffrement | **Réel dès le POC, mais simple** : AES-256-GCM via `expo-crypto`/`react-native-quick-crypto`, clé maître dans `expo-secure-store` (Keychain/Keystore) | Invariant A7 : ne pas prendre l'habitude de stocker en clair. Voir §4.5 |
| IA | `MockAIProvider` (réponses scriptées + latence simulée) | Valider l'UX de l'assistant sans coût ni risque. ADR-0004 |
| Tests | Jest (domaine), React Native Testing Library (composants), Maestro (E2E) | Voir `09-strategie-tests.md` |
| i18n | `i18next` — FR d'abord, clés dès le début | Pas de chaîne en dur |

---

## 4.3 Parcours à démontrer (les 8 du cahier des charges)

| # | Parcours | Écrans clés | Ce que le POC doit prouver |
|---|----------|-------------|-----------------------------|
| 1 | Création du profil local | Accueil → Explication → Code/biométrie → Profil | Qu'on peut démarrer **sans compte, sans email, sans mot de passe compliqué** |
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
- Chiffrement des fichiers et de la base au repos (clé maître dans le keystore matériel).
- Verrouillage de l'app par code/biométrie, verrouillage automatique en arrière-plan.
- Masquage de l'aperçu applicatif dans le sélecteur de tâches.
- Aucun log de contenu, aucune télémétrie.
- Exclusion des sauvegardes OS pour le conteneur sensible.

**Reporté explicitement (Phase 2/3)** :
- Rotation de clés, dérivation par passphrase de récupération (Argon2id), attestation matérielle.
- Détection de root/jailbreak, anti-tampering, certificate pinning (pas de réseau en Phase 1).
- Authentification serveur, RBAC/ABAC, audit distant, HSM/KMS.
- Le schéma cryptographique **réel** de l'activation du contact de confiance (le POC le *simule*).

Cette séparation est volontaire et documentée : **le POC ne doit pas prétendre être sécurisé en
production**, et l'écran de démarrage le dira (« version d'évaluation — n'y mettez pas de vrais
documents »).

---

## 4.6 Principes UX (personnes non technophiles)

1. **Une décision par écran.** Jamais deux questions simultanées.
2. **Langage courant** : « mettre à l'abri » plutôt que « chiffrer AES-256 » (l'explication technique
   reste accessible en un tap, jamais imposée).
3. **Toujours réversible** : tout écran a une sortie, aucune action destructive sans double confirmation explicite.
4. **Progression visible** : barre d'étapes sur le parcours de legs, sauvegarde automatique du brouillon.
5. **Rassurance explicite** : indiquer à chaque étape sensible ce qui **ne** se passe **pas**
   (« ce document ne quitte pas votre téléphone »).
6. **Accessibilité** : taille de police dynamique, contraste AA minimum, cibles tactiles ≥ 48 dp,
   compatibilité VoiceOver/TalkBack — testé, pas supposé.
7. **Pas de jargon d'erreur** : « Nous n'avons pas pu ouvrir ce fichier » + action proposée.
